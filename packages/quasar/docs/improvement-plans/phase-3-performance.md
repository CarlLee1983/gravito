# Phase 3：效能與監控改進

> 狀態：📋 規劃中
> 優先級：中
> 預估工作量：中等
> 前置條件：Phase 1 完成

## 目標

優化 Quasar 的執行效能，減少資源消耗，並增強自我監控能力。

## 3.1 心跳機制優化

### 現況分析

目前心跳使用固定間隔：

```typescript
// QuasarAgent.ts
this.timer = setInterval(() => this.tick(), this.interval)
```

存在的問題：
- 固定間隔不夠靈活
- 無法根據系統負載調整
- 失敗後無重試機制

### 改進項目

- [ ] 實作自適應心跳間隔
- [ ] 新增心跳失敗重試機制
- [ ] 支援心跳抖動（jitter）避免同步
- [ ] 記錄心跳成功/失敗統計

```typescript
// heartbeat/AdaptiveHeartbeat.ts
export interface HeartbeatOptions {
  baseInterval: number     // 基礎間隔 (ms)
  minInterval: number      // 最小間隔
  maxInterval: number      // 最大間隔
  jitter: number           // 抖動百分比 (0-1)
  maxRetries: number       // 最大重試次數
  backoffMultiplier: number // 退避乘數
}

export class AdaptiveHeartbeat {
  private currentInterval: number
  private consecutiveFailures = 0

  constructor(
    private callback: () => Promise<void>,
    private options: HeartbeatOptions
  ) {
    this.currentInterval = options.baseInterval
  }

  private calculateNextInterval(): number {
    // 成功時逐漸恢復到基礎間隔
    // 失敗時使用指數退避
    if (this.consecutiveFailures > 0) {
      return Math.min(
        this.options.maxInterval,
        this.currentInterval * this.options.backoffMultiplier
      )
    }
    return this.options.baseInterval
  }

  private applyJitter(interval: number): number {
    const jitter = interval * this.options.jitter
    return interval + (Math.random() * 2 - 1) * jitter
  }
}
```

### 預期效益

- 減少不必要的網路請求
- 提升系統負載下的穩定性
- 避免多個 Agent 同時發送心跳

---

## 3.2 記憶體使用優化

### 現況分析

目前 Bridge 的歷史記錄無上限控制（除了固定 100 條）：

```typescript
// BaseZenithBridge.ts
pipe.lpush(historyKey, JSON.stringify(fullPayload))
pipe.ltrim(historyKey, 0, 99)
```

### 改進項目

- [ ] 實作可配置的歷史記錄上限
- [ ] 新增記憶體內快取過期機制
- [ ] 優化大型 payload 的序列化
- [ ] 實作日誌抽樣機制（高流量時）

```typescript
// config/MemoryConfig.ts
export interface MemoryOptions {
  maxHistorySize: number     // 歷史記錄上限
  maxPayloadSize: number     // 單一 payload 大小上限 (bytes)
  samplingRate: number       // 抽樣率 (0-1)，1 = 全部記錄
  samplingThreshold: number  // 啟用抽樣的流量閾值 (events/sec)
}

// bridges/LogSampler.ts
export class LogSampler {
  private eventCount = 0
  private lastReset = Date.now()

  shouldLog(options: MemoryOptions): boolean {
    this.eventCount++

    const elapsed = Date.now() - this.lastReset
    if (elapsed >= 1000) {
      const rate = this.eventCount / (elapsed / 1000)
      this.eventCount = 0
      this.lastReset = Date.now()

      if (rate > options.samplingThreshold) {
        return Math.random() < options.samplingRate
      }
    }

    return true
  }
}
```

### 預期效益

- 控制記憶體使用量
- 避免高流量時的 OOM
- 保持關鍵日誌的可見性

---

## 3.3 CPU 指標收集優化

### 現況分析

目前 NodeProbe 每次都會計算 CPU 使用率：

```typescript
// probes/NodeProbe.ts
private getSystemCpuUsage() {
  const cpus = os.cpus()  // 每次呼叫都會遍歷所有 CPU
  // ...
}
```

### 改進項目

- [ ] 實作指標快取機制
- [ ] 減少不必要的系統呼叫
- [ ] 支援指標收集節流

```typescript
// probes/CachedNodeProbe.ts
export class CachedNodeProbe implements Probe {
  private cache?: { metrics: SystemMetrics; timestamp: number }
  private cacheTimeout: number

  constructor(options: { cacheTimeout?: number } = {}) {
    this.cacheTimeout = options.cacheTimeout ?? 1000 // 1秒快取
  }

  getMetrics(): SystemMetrics {
    const now = Date.now()

    if (this.cache && now - this.cache.timestamp < this.cacheTimeout) {
      return this.cache.metrics
    }

    const metrics = this.collectMetrics()
    this.cache = { metrics, timestamp: now }
    return metrics
  }

  private collectMetrics(): SystemMetrics {
    // 實際收集邏輯
  }
}
```

### 預期效益

- 減少 CPU 開銷
- 避免頻繁系統呼叫
- 提升高頻率查詢場景的效能

---

## 3.4 Redis 操作優化

### 現況分析

目前 Probe 收集與發送是同步進行：

```typescript
// QuasarAgent.ts - tick()
const queues = await Promise.all(this.queueProbes.map((p) => p.getSnapshot()))
await this.transportRedis.set(key, JSON.stringify(payload), 'EX', 30)
```

### 改進項目

- [ ] 使用 Pipeline 合併多個 Redis 操作
- [ ] 實作非阻塞的指標發送
- [ ] 支援連線複用與連線池
- [ ] 優化序列化格式（考慮 MessagePack）

```typescript
// utils/RedisBatcher.ts
export class RedisBatcher {
  private pending: Array<{
    operation: 'set' | 'publish' | 'lpush'
    args: any[]
  }> = []

  constructor(
    private redis: Redis,
    private options: { maxBatchSize: number; flushInterval: number }
  ) {}

  set(key: string, value: string, ...args: any[]): void {
    this.pending.push({ operation: 'set', args: [key, value, ...args] })
    this.maybeFlush()
  }

  private maybeFlush(): void {
    if (this.pending.length >= this.options.maxBatchSize) {
      this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.pending.length === 0) return

    const batch = this.pending.splice(0)
    const pipeline = this.redis.pipeline()

    for (const { operation, args } of batch) {
      (pipeline as any)[operation](...args)
    }

    await pipeline.exec()
  }
}
```

### 預期效益

- 減少 Redis 往返次數
- 提升高並發場景效能
- 降低網路延遲影響

---

## 3.5 內部監控指標

### 現況分析

目前 Quasar 缺乏自身運行狀態的監控。

### 改進項目

- [ ] 收集 Agent 內部指標
- [ ] 支援指標匯出（Prometheus 格式）
- [ ] 記錄關鍵操作耗時

```typescript
// metrics/InternalMetrics.ts
export interface InternalMetrics {
  heartbeats: {
    total: number
    successful: number
    failed: number
    avgDuration: number
  }
  probes: {
    total: number
    errors: number
    avgDuration: number
  }
  bridges: {
    eventsProcessed: number
    eventsDropped: number
    avgPublishDuration: number
  }
  redis: {
    commandsSent: number
    errors: number
    avgLatency: number
  }
}

export class MetricsCollector {
  private metrics: InternalMetrics = { ... }

  recordHeartbeat(success: boolean, duration: number): void {
    this.metrics.heartbeats.total++
    if (success) this.metrics.heartbeats.successful++
    else this.metrics.heartbeats.failed++
    // 更新平均值
  }

  // Prometheus 格式匯出
  toPrometheus(): string {
    return `
# HELP quasar_heartbeats_total Total number of heartbeats
# TYPE quasar_heartbeats_total counter
quasar_heartbeats_total{status="success"} ${this.metrics.heartbeats.successful}
quasar_heartbeats_total{status="failed"} ${this.metrics.heartbeats.failed}
...
    `.trim()
  }
}
```

### 預期效益

- 便於監控 Quasar 自身狀態
- 快速發現效能瓶頸
- 支援標準化監控整合

---

## 3.6 啟動時間優化

### 現況分析

目前 Agent 啟動會立即連線所有 Redis：

```typescript
// QuasarAgent.ts - start()
await this.transportRedis.connect()
await this.monitorRedis.connect()
```

### 改進項目

- [ ] 實作延遲連線（lazy connect）
- [ ] 支援平行初始化
- [ ] 優化模組載入順序

```typescript
// QuasarAgent.ts
async start(): Promise<void> {
  // 平行初始化
  await Promise.all([
    this.initTransport(),
    this.initMonitor(),
    this.initProbes(),
  ])

  console.log(`[Quasar] Agent started in ${Date.now() - startTime}ms`)
}

private async initTransport(): Promise<void> {
  // 僅在首次需要時連線
}
```

### 預期效益

- 縮短啟動時間
- 減少啟動時的資源佔用
- 改善容器化部署體驗

---

## 驗收標準

- [ ] 心跳機制支援自適應間隔
- [ ] 高流量場景下記憶體使用穩定
- [ ] Redis 操作批次化處理
- [ ] 內部監控指標可匯出
- [ ] 啟動時間減少 30% 以上
- [ ] 效能測試通過並記錄基準數據

## 相依性

- Phase 1 完成（日誌系統與錯誤處理）

## 風險評估

| 風險項目 | 等級 | 緩解措施 |
|---------|------|---------|
| 快取機制可能導致資料不一致 | 低 | 提供可配置的快取時間，預設保守值 |
| 批次操作可能延遲資料送達 | 低 | 提供即時模式選項 |
| 指標收集本身消耗資源 | 低 | 預設關閉，按需啟用 |

## 效能基準測試計劃

```typescript
// benchmarks/heartbeat.bench.ts
import { bench, describe } from 'vitest'

describe('Heartbeat Performance', () => {
  bench('current implementation', async () => {
    await agent.tick()
  })

  bench('optimized implementation', async () => {
    await optimizedAgent.tick()
  })
})
```

測試場景：
1. 單一佇列監控，1000 次心跳
2. 10 個佇列監控，1000 次心跳
3. 高併發 Bridge 事件（10000 events/sec）
4. 記憶體使用量長時間運行測試（1 小時）
