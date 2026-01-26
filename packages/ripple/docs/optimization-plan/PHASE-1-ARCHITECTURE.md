# 第 1 階段：型別安全與架構改善

> 消除全域狀態、強化型別安全、改善驅動程式初始化流程

## 概覽

此階段專注於解決 ripple 模組中的核心架構問題，特別是 Broadcaster 的全域狀態模式和 RedisDriver 的型別安全問題。

## 當前架構問題

### 1. 全域狀態反模式（高優先度）

**位置**：`src/events/Broadcaster.ts:13-27`

```typescript
// 當前實現 - 使用全域變數
let globalRippleServer: RippleServer | null = null

export function setRippleServer(server: RippleServer): void {
  globalRippleServer = server
}

export function broadcast(event: BroadcastEvent): void {
  if (!globalRippleServer) {
    console.warn('[Ripple] No server configured. Event not broadcast.')
    return
  }
  // ...
}
```

**問題**：
- 難以測試（需要模擬全域狀態）
- 隱性依賴，程式碼可讀性差
- 無法支援多個 RippleServer 實例
- 無法在 IoC 容器中正確管理生命週期

### 2. RedisDriver 缺乏型別安全（中優先度）

**位置**：`src/drivers/RedisDriver.ts:32-33`

```typescript
// 當前實現 - 使用 any 型別
private redis: any
private subscriber: any

private async getRedisClient(): Promise<any> {
  const ioredis = await import('ioredis')
  return ioredis.default
}
```

**問題**：
- 失去 TypeScript 型別檢查保護
- IDE 無法提供自動完成
- 容易引入執行時期錯誤

### 3. 驅動程式初始化序列缺陷

**位置**：`src/RippleServer.ts`

```typescript
constructor(config: RippleConfig = {}) {
  // 選擇驅動程式，但尚未初始化
  this.driver = config.driver === 'redis'
    ? new RedisDriver(config.redis ?? {})
    : new LocalDriver()
}

async init(): Promise<void> {
  // 延遲初始化
  await this.driver.init?.()
}
```

**風險**：
- 在 `init()` 之前呼叫 `broadcast()` 會導致未定義行為
- 缺乏初始化狀態追蹤

---

## 目標架構

### 1. 移除全域狀態，改用 IoC 容器

**新檔案結構**：
```
src/
├── events/
│   ├── Broadcaster.ts        # 重構為類別，支援依賴注入
│   ├── BroadcastManager.ts   # 新增：管理廣播邏輯
│   └── BroadcastEvent.ts     # 保持不變
```

**新的 BroadcastManager 設計**：
```typescript
// src/events/BroadcastManager.ts

import type { RippleServer } from '../RippleServer'
import type { BroadcastEvent } from './BroadcastEvent'

/**
 * 廣播管理器 - 管理事件廣播邏輯
 *
 * 透過依賴注入取得 RippleServer 實例，避免全域狀態
 */
export class BroadcastManager {
  constructor(private readonly server: RippleServer) {}

  /**
   * 廣播事件至指定頻道
   */
  broadcast(event: BroadcastEvent): void {
    const channels = event.broadcastOn()
    const eventName = event.broadcastAs()
    const data = event.broadcastWith()

    const channelList = Array.isArray(channels) ? channels : [channels]

    for (const channel of channelList) {
      this.server.broadcast(channel.fullName, eventName, data)
    }
  }

  /**
   * 取得流式 Broadcaster API
   */
  to(channel: string): ChannelBroadcaster {
    return new ChannelBroadcaster(this.server, channel)
  }

  toPrivate(channel: string): ChannelBroadcaster {
    return new ChannelBroadcaster(this.server, `private-${channel}`)
  }

  toPresence(channel: string): ChannelBroadcaster {
    return new ChannelBroadcaster(this.server, `presence-${channel}`)
  }
}

/**
 * 頻道廣播器 - 流式 API
 */
export class ChannelBroadcaster {
  private _except: string[] = []

  constructor(
    private readonly server: RippleServer,
    private readonly channel: string
  ) {}

  except(socketIds: string | string[]): this {
    const ids = Array.isArray(socketIds) ? socketIds : [socketIds]
    this._except.push(...ids)
    return this
  }

  emit(event: string, data: unknown): void {
    this.server.broadcast(this.channel, event, data)
  }
}
```

### 2. 強化 RedisDriver 型別安全

**改善後的實現**：
```typescript
// src/drivers/RedisDriver.ts

import type { Redis as RedisClient, RedisOptions } from 'ioredis'
import type { RippleDriver } from '../types'

export class RedisDriver implements RippleDriver {
  readonly name = 'redis'

  private redis?: RedisClient
  private subscriber?: RedisClient
  private channelPrefix: string
  private subscriptions = new Map<string, Set<(event: string, data: unknown) => void>>()
  private _initialized = false

  constructor(private config: RedisDriverConfig = {}) {
    this.channelPrefix = config.keyPrefix ?? 'ripple:'
  }

  /**
   * 檢查驅動程式是否已初始化
   */
  get isInitialized(): boolean {
    return this._initialized
  }

  async init(): Promise<void> {
    if (this._initialized) {
      return // 避免重複初始化
    }

    const Redis = await this.getRedisClient()

    const redisOptions: RedisOptions = {
      host: this.config.host ?? 'localhost',
      port: this.config.port ?? 6379,
      password: this.config.password,
      db: this.config.db ?? 0,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    }

    this.redis = new Redis(redisOptions)
    this.subscriber = new Redis(redisOptions)

    // 型別安全的事件處理
    this.subscriber.on('message', (channel: string, message: string) => {
      this.handleMessage(channel, message)
    })

    this.subscriber.on('error', (error: Error) => {
      this.handleError('subscriber', error)
    })

    this.redis.on('error', (error: Error) => {
      this.handleError('publisher', error)
    })

    this._initialized = true
  }

  /**
   * 型別安全的動態導入
   */
  private async getRedisClient(): Promise<typeof import('ioredis').default> {
    try {
      const ioredis = await import('ioredis')
      return ioredis.default
    } catch {
      throw new RippleDriverError(
        'REDIS_NOT_INSTALLED',
        'ioredis is required for RedisDriver. Install it with: bun add ioredis'
      )
    }
  }

  private handleError(source: 'publisher' | 'subscriber', error: Error): void {
    // 結構化錯誤處理（將在 Phase 2 完善）
    console.error(`[RedisDriver] ${source} error:`, error)
  }
}
```

### 3. 新增型別定義

**新增至 `src/types.ts`**：
```typescript
// ─────────────────────────────────────────────────────────────
// 錯誤型別
// ─────────────────────────────────────────────────────────────

/**
 * Ripple 錯誤代碼
 */
export type RippleErrorCode =
  | 'UNAUTHORIZED'
  | 'NOT_SUBSCRIBED'
  | 'INVALID_FORMAT'
  | 'DRIVER_NOT_INITIALIZED'
  | 'REDIS_NOT_INSTALLED'
  | 'REDIS_CONNECTION_FAILED'

/**
 * 結構化錯誤訊息
 */
export interface ErrorServerMessage {
  type: 'error'
  code: RippleErrorCode
  message: string
  channel?: string
}

/**
 * 驅動程式狀態
 */
export interface DriverStatus {
  name: string
  initialized: boolean
  connected: boolean
  lastError?: string
}

// ─────────────────────────────────────────────────────────────
// 訊息常數
// ─────────────────────────────────────────────────────────────

/**
 * 伺服器訊息類型常數
 */
export const SERVER_MESSAGE_TYPES = {
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
  ERROR: 'error',
  EVENT: 'event',
  PRESENCE: 'presence',
  PONG: 'pong',
  CONNECTED: 'connected',
} as const

/**
 * 客戶端訊息類型常數
 */
export const CLIENT_MESSAGE_TYPES = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  WHISPER: 'whisper',
  PING: 'ping',
} as const
```

---

## 實施任務

### 任務 1.1：建立 RippleDriverError 類別

**檔案**：`src/errors/RippleError.ts`

```typescript
export class RippleError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'RippleError'
  }
}

export class RippleDriverError extends RippleError {
  constructor(code: string, message: string) {
    super(code, message)
    this.name = 'RippleDriverError'
  }
}
```

**驗收標準**：
- [ ] 錯誤類別有明確的 code 和 message
- [ ] 正確繼承 Error 類別
- [ ] 有完整的 JSDoc 文件

---

### 任務 1.2：重構 Broadcaster 移除全域狀態

**步驟**：
1. 建立 `BroadcastManager` 類別
2. 修改 `Broadcaster` 為實例方法
3. 更新 `OrbitRipple` 以註冊 `BroadcastManager` 至容器
4. 保持向後相容的函式介面（標記為 deprecated）

**向後相容**：
```typescript
// 保留舊 API，但標記為 deprecated
/**
 * @deprecated 請改用 BroadcastManager.broadcast()
 */
export function broadcast(event: BroadcastEvent): void {
  const manager = globalRippleServer
    ? new BroadcastManager(globalRippleServer)
    : null

  if (!manager) {
    console.warn('[Ripple] No server configured. Use BroadcastManager instead.')
    return
  }

  manager.broadcast(event)
}
```

**驗收標準**：
- [ ] BroadcastManager 支援依賴注入
- [ ] 舊 API 標記為 deprecated 但仍可運作
- [ ] 單元測試可在無全域狀態下執行
- [ ] OrbitRipple 正確註冊 BroadcastManager

---

### 任務 1.3：強化 RedisDriver 型別

**步驟**：
1. 將 `any` 替換為正確的 ioredis 型別
2. 新增 `isInitialized` getter
3. 新增初始化狀態檢查
4. 改善錯誤訊息

**驗收標準**：
- [ ] 無 `any` 型別
- [ ] `isInitialized` 可正確反映狀態
- [ ] 未初始化時呼叫方法會拋出明確錯誤
- [ ] IDE 提供完整的型別提示

---

### 任務 1.4：新增驅動程式狀態追蹤

**步驟**：
1. 在 `RippleDriver` 介面新增 `status` 屬性
2. 實現 LocalDriver 和 RedisDriver 的狀態追蹤
3. 在 RippleServer 提供 `getDriverStatus()` 方法

**驗收標準**：
- [ ] 可查詢驅動程式初始化狀態
- [ ] 可查詢連接狀態
- [ ] 錯誤時記錄最後錯誤訊息

---

### 任務 1.5：更新型別定義

**步驟**：
1. 新增 `RippleErrorCode` 型別
2. 新增 `ErrorServerMessage` 介面
3. 新增 `DriverStatus` 介面
4. 新增訊息類型常數

**驗收標準**：
- [ ] 所有新型別有完整 JSDoc
- [ ] 型別可正確推導
- [ ] 常數可在整個模組使用

---

## 測試策略

### 單元測試

```typescript
// BroadcastManager.test.ts
describe('BroadcastManager', () => {
  it('should broadcast event to specified channels', async () => {
    const mockServer = createMockRippleServer()
    const manager = new BroadcastManager(mockServer)

    const event = new TestEvent()
    manager.broadcast(event)

    expect(mockServer.broadcast).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(Object)
    )
  })

  it('should support fluent API', () => {
    const mockServer = createMockRippleServer()
    const manager = new BroadcastManager(mockServer)

    manager.to('chat').emit('message', { text: 'hello' })

    expect(mockServer.broadcast).toHaveBeenCalledWith(
      'chat',
      'message',
      { text: 'hello' }
    )
  })
})

// RedisDriver.test.ts
describe('RedisDriver', () => {
  it('should throw when not initialized', async () => {
    const driver = new RedisDriver()

    await expect(driver.publish('channel', 'event', {}))
      .rejects.toThrow('RedisDriver not initialized')
  })

  it('should track initialization status', async () => {
    const driver = new RedisDriver()

    expect(driver.isInitialized).toBe(false)

    await driver.init()

    expect(driver.isInitialized).toBe(true)
  })
})
```

---

## 成功標準

- [ ] 所有 `any` 型別從 RedisDriver 移除
- [ ] BroadcastManager 可透過依賴注入使用
- [ ] 舊 Broadcaster API 標記為 deprecated
- [ ] 驅動程式狀態可追蹤
- [ ] 所有現有測試通過
- [ ] 新增測試覆蓋率達 95%+
- [ ] 無效能退化

---

## 風險緩解

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| 破壞現有 API | 高 | 保持向後相容，僅標記 deprecated |
| ioredis 型別不相容 | 中 | 使用 `import type` 確保編譯時檢查 |
| 測試覆蓋不足 | 中 | 先寫測試再重構（TDD） |

---

**下一階段**：[第 2 階段：錯誤處理與可觀測性](./PHASE-2-OBSERVABILITY.md)
