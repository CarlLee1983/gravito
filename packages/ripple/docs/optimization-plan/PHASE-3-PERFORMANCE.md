# 第 3 階段：效能優化

> 訊息序列化緩存、批量操作優化、記憶體使用監控

## 概覽

此階段專注於識別和解決 ripple 模組中的效能瓶頸，包括訊息序列化優化、批量操作改善和記憶體管理。

## 當前效能問題分析

### 1. 重複序列化（中優先度）

**位置**：`src/RippleServer.ts:379-385`

```typescript
private send(ws: RippleWebSocket, message: ServerMessage): void {
  try {
    ws.send(JSON.stringify(message))  // 每次發送都重新序列化
  } catch {
    // ...
  }
}

private broadcastToChannel(channel: string, event: string, data: unknown, excludeClientId?: string): void {
  const subscribers = this.channels.getSubscribers(channel)

  for (const ws of subscribers) {
    // 對每個訂閱者重複序列化相同訊息！
    this.send(ws, { type: 'event', channel, event, data })
  }
}
```

**問題**：
- 廣播到 1000 個客戶端 = 序列化 1000 次
- `JSON.stringify()` 是 CPU 密集型操作
- 相同訊息不應重複序列化

### 2. 逐個 Ping 發送（低優先度）

**位置**：`src/RippleServer.ts:408-413`

```typescript
if (this.config.pingInterval > 0) {
  this.pingInterval = setInterval(() => {
    for (const ws of this.channels.getAllClients()) {
      this.send(ws, { type: 'pong' })  // 每個客戶端單獨序列化
    }
  }, this.config.pingInterval)
}
```

**問題**：
- Ping 訊息固定，但每次都重新序列化
- 大量連接時增加不必要的 CPU 負載

### 3. Map/Set 記憶體碎片

**位置**：`src/channels/ChannelManager.ts`

```typescript
private clients = new Map<string, RippleWebSocket>()
private subscriptions = new Map<string, Set<string>>()
private presenceMembers = new Map<string, Map<string | number, PresenceUserInfo>>()
```

**潛在問題**：
- 頻繁添加/刪除可能導致記憶體碎片
- 大量短連接場景下效能下降

---

## 優化策略

### 1. 訊息序列化緩存

**設計原則**：
- 對於廣播訊息，只序列化一次
- 使用預序列化的固定訊息（如 pong）
- 實現簡單的 LRU 緩存

**實現**：
```typescript
// src/utils/MessageSerializer.ts

/**
 * 訊息序列化器 - 減少重複序列化
 */
export class MessageSerializer {
  /** 預序列化的固定訊息 */
  private static readonly PONG_MESSAGE = JSON.stringify({ type: 'pong' })

  /** 廣播訊息緩存（用於單次廣播內的重用） */
  private broadcastCache: string | null = null

  /**
   * 取得預序列化的 pong 訊息
   */
  getPongMessage(): string {
    return MessageSerializer.PONG_MESSAGE
  }

  /**
   * 序列化訊息（一般用途）
   */
  serialize(message: ServerMessage): string {
    return JSON.stringify(message)
  }

  /**
   * 序列化廣播訊息（緩存以便重用）
   */
  serializeForBroadcast(message: ServerMessage): string {
    if (!this.broadcastCache) {
      this.broadcastCache = JSON.stringify(message)
    }
    return this.broadcastCache
  }

  /**
   * 清除廣播緩存
   */
  clearBroadcastCache(): void {
    this.broadcastCache = null
  }
}
```

**整合至 RippleServer**：
```typescript
// 更新後的 broadcastToChannel
private broadcastToChannel(
  channel: string,
  event: string,
  data: unknown,
  excludeClientId?: string
): void {
  const subscribers = this.channels.getSubscribers(channel)
  if (subscribers.size === 0) return

  // 預先序列化訊息
  const message: ServerMessage = event === 'presence'
    ? {
        type: 'presence',
        channel,
        event: (data as { event: 'join' | 'leave' | 'members' }).event,
        data: (data as { data: unknown }).data,
      }
    : { type: 'event', channel, event, data }

  const serialized = this.serializer.serializeForBroadcast(message)

  // 使用預序列化的訊息廣播
  for (const ws of subscribers) {
    if (excludeClientId && ws.data.id === excludeClientId) {
      continue
    }
    this.sendRaw(ws, serialized)
  }

  // 清除緩存
  this.serializer.clearBroadcastCache()
}

private sendRaw(ws: RippleWebSocket, serialized: string): boolean {
  try {
    ws.send(serialized)
    return true
  } catch {
    this.logger.warn('Failed to send message', { clientId: ws.data.id })
    return false
  }
}
```

### 2. 批量 Ping 優化

```typescript
// 更新後的 ping 邏輯
async init(): Promise<void> {
  await this.driver.init?.()

  if (this.config.pingInterval > 0) {
    const pongMessage = this.serializer.getPongMessage()

    this.pingInterval = setInterval(() => {
      for (const ws of this.channels.getAllClients()) {
        try {
          ws.send(pongMessage)  // 使用預序列化訊息
        } catch {
          // 連接可能已關閉
        }
      }
    }, this.config.pingInterval)
  }
}
```

### 3. 連接池優化（Redis 驅動）

```typescript
// src/drivers/RedisDriver.ts

export interface RedisDriverConfig {
  // ... 現有設定 ...

  /** 連接池大小（預設: 10） */
  poolSize?: number

  /** 連接超時（毫秒，預設: 5000） */
  connectTimeout?: number

  /** 命令超時（毫秒，預設: 3000） */
  commandTimeout?: number
}

// 更新 RedisDriver
async init(): Promise<void> {
  const Redis = await this.getRedisClient()

  const redisOptions: RedisOptions = {
    host: this.config.host ?? 'localhost',
    port: this.config.port ?? 6379,
    password: this.config.password,
    db: this.config.db ?? 0,
    // 效能優化設定
    connectTimeout: this.config.connectTimeout ?? 5000,
    commandTimeout: this.config.commandTimeout ?? 3000,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    // 連接池設定
    lazyConnect: true,
  }

  this.redis = new Redis(redisOptions)
  this.subscriber = new Redis(redisOptions)

  // 預先連接
  await Promise.all([
    this.redis.connect(),
    this.subscriber.connect(),
  ])

  // ... 事件處理 ...
}
```

### 4. 基準測試套件

```typescript
// benchmarks/broadcast.bench.ts

import { bench, describe } from 'vitest'
import { RippleServer } from '../src/RippleServer'
import { MessageSerializer } from '../src/utils/MessageSerializer'

describe('Broadcast Performance', () => {
  const server = new RippleServer()
  const serializer = new MessageSerializer()

  bench('serialize message', () => {
    JSON.stringify({ type: 'event', channel: 'test', event: 'test', data: { foo: 'bar' } })
  })

  bench('serialize with cache', () => {
    serializer.serializeForBroadcast({ type: 'event', channel: 'test', event: 'test', data: { foo: 'bar' } })
  })

  bench('serialize pong (cached)', () => {
    serializer.getPongMessage()
  })
})

describe('Channel Operations', () => {
  const manager = new ChannelManager()

  // 準備測試資料
  for (let i = 0; i < 1000; i++) {
    manager.subscribe(`client-${i}`, 'test-channel')
  }

  bench('get subscribers (1000 clients)', () => {
    manager.getSubscribers('test-channel')
  })

  bench('is subscribed check', () => {
    manager.isSubscribed('client-500', 'test-channel')
  })
})
```

---

## 實施任務

### 任務 3.1：建立 MessageSerializer

**檔案**：`src/utils/MessageSerializer.ts`

**驗收標準**：
- [ ] 預序列化固定訊息（pong）
- [ ] 廣播訊息緩存機制
- [ ] 單元測試驗證序列化減少

---

### 任務 3.2：優化 broadcastToChannel

**步驟**：
1. 整合 MessageSerializer
2. 預先序列化訊息
3. 使用 `sendRaw()` 發送
4. 清除緩存

**驗收標準**：
- [ ] 廣播到 N 個客戶端只序列化 1 次
- [ ] 基準測試顯示效能提升
- [ ] 不影響現有功能

---

### 任務 3.3：優化 Ping 機制

**步驟**：
1. 預先序列化 pong 訊息
2. 在 init() 中建立快取
3. 更新 ping 迴圈使用預序列化訊息

**驗收標準**：
- [ ] Ping 訊息零序列化開銷
- [ ] 現有測試通過

---

### 任務 3.4：Redis 連接優化

**步驟**：
1. 新增連接池設定選項
2. 實現連接超時機制
3. 新增命令超時設定

**驗收標準**：
- [ ] 支援設定連接超時
- [ ] 支援設定命令超時
- [ ] 連接失敗有適當處理

---

### 任務 3.5：建立基準測試套件

**檔案**：`benchmarks/`

**包含測試**：
- 訊息序列化效能
- 廣播效能（不同客戶端數量）
- 頻道操作效能
- Redis pub/sub 效能

**驗收標準**：
- [ ] 基準測試可重現執行
- [ ] 產出效能報告
- [ ] 識別效能瓶頸

---

## 效能指標

### 目標改善

| 指標 | 當前估計 | 目標 |
|------|----------|------|
| 廣播序列化次數 | N（客戶端數） | 1 |
| Ping 序列化次數 | N | 0（預序列化） |
| 每秒訊息處理量 | 基線 | +20% |
| 記憶體使用 | 基線 | 不退化 |

### 基準測試範例輸出

```
┌─────────────────────────────────────────┬───────────┬─────────────┐
│ Benchmark                               │ ops/sec   │ margin      │
├─────────────────────────────────────────┼───────────┼─────────────┤
│ serialize message                       │ 1,234,567 │ ±1.23%      │
│ serialize with cache                    │ 9,999,999 │ ±0.50%      │
│ serialize pong (cached)                 │ 99,999,999│ ±0.10%      │
│ broadcast to 100 clients (before)       │ 12,345    │ ±2.00%      │
│ broadcast to 100 clients (after)        │ 98,765    │ ±1.50%      │
└─────────────────────────────────────────┴───────────┴─────────────┘
```

---

## 測試策略

### 效能測試

```typescript
// performance.test.ts
describe('Performance', () => {
  it('should serialize broadcast message only once', () => {
    const spy = vi.spyOn(JSON, 'stringify')
    const server = createTestServer()

    // 添加 100 個模擬客戶端
    for (let i = 0; i < 100; i++) {
      server.addMockClient(`client-${i}`, 'test-channel')
    }

    // 廣播
    server.broadcast('test-channel', 'test-event', { data: 'test' })

    // 應該只序列化一次
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('should use pre-serialized pong message', () => {
    const serializer = new MessageSerializer()
    const pong1 = serializer.getPongMessage()
    const pong2 = serializer.getPongMessage()

    // 應該返回相同的字串實例
    expect(pong1).toBe(pong2)
  })
})
```

### 壓力測試

```typescript
// stress.test.ts
describe('Stress Test', () => {
  it('should handle 10000 concurrent connections', async () => {
    const server = createTestServer()

    // 建立大量連接
    const connections = await Promise.all(
      Array.from({ length: 10000 }, () => createMockConnection(server))
    )

    // 廣播訊息
    const start = performance.now()
    server.broadcast('all', 'test', { data: 'stress test' })
    const duration = performance.now() - start

    // 應該在合理時間內完成
    expect(duration).toBeLessThan(100) // 100ms

    // 清理
    await Promise.all(connections.map(c => c.close()))
  })
})
```

---

## 記憶體優化建議

### WeakMap 用於客戶端資料

```typescript
// 考慮使用 WeakMap 來允許 GC 回收
// 但需評估是否適合當前使用場景
private clientMetadata = new WeakMap<RippleWebSocket, ClientMetadata>()
```

### 定期清理

```typescript
// 定期清理已關閉連接的殘留資料
private scheduleCleanup(): void {
  setInterval(() => {
    this.channels.cleanup()
  }, 60000) // 每分鐘
}
```

---

## 成功標準

- [ ] 廣播操作序列化次數從 N 減少到 1
- [ ] Ping 訊息使用預序列化版本
- [ ] 基準測試套件建立並可執行
- [ ] 效能提升 20%+（基於基準測試）
- [ ] 無記憶體洩漏
- [ ] 現有測試全部通過

---

## 風險緩解

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| 緩存一致性問題 | 中 | 每次廣播後清除緩存 |
| 記憶體增加 | 低 | 監控記憶體使用，必要時調整 |
| 效能退化 | 中 | 基準測試前後比對 |

---

**下一階段**：[第 4 階段：測試覆蓋](./PHASE-4-TESTING.md)
