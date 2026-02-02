# Gravito 框架改善優化建議

基於搶購系統完整開發過程，總結框架功能需要改善優化的事項。

---

## 🔴 優先級 1: 立即修復 (Critical)

### Issue 1.1: Event System - Core Async Dispatch

**發現時間**：Week 3-4  
**嚴重性**：⭐⭐⭐⭐⭐ Critical  
**影響度**：高併發訂單流程延遲  
**範圍**：核心異步派發 + 優先級隊列  

---

#### 問題描述

```typescript
// 當前問題：同步事件派發導致堆積延遲
await core.hooks.doAction('order:created', { orderId: '123' })
// 上述操作會同步執行所有監聽器，造成延遲累積
```

**現象**：
- 高頻事件派發時，P99 延遲 > 800ms
- 事件監聽器性能瓶頸累積
- 無優先級控制，重要事件被延遲
- 無可觀測性，無法診斷瓶頸來源

**根本原因**：
- Event System 採用同步派發
- 無隊列緩衝機制
- 缺少事件優先級
- 缺少性能監控指標

---

#### 應用影響

```
訂單建立流程：
1. order:created 事件
2. 觸發 inventory-lock 監聽 (200ms)
3. 觸發 payment 監聽 (300ms)
4. 觸發 analytics 監聽 (150ms)
   └─ 所有監聽器同步執行，總耗時 650ms+
   └─ 若任一監聽器慢，整個流程阻塞
   └─ 無法並行處理，浪費 CPU 資源
```

---

#### 臨時解決方案

```typescript
// 使用 @gravito/stream 隊列替代 Event System
const job = new OrderCreatedJob({ orderId })
await queueManager.push(job.onQueue('orders'))
// 優勢：異步、可重試、可監控
// 劣勢：需要手動創建 Job 類，開發體驗不佳
```

---

#### 改進建議

##### 1. 異步事件派發 API

```typescript
// 新增 doActionAsync 方法（保留向後兼容性）
interface EventOptions {
  async: boolean                       // 異步派發
  priority: 'high' | 'normal' | 'low'  // 事件優先級
  timeout: number                      // 執行超時（ms）
  ordering: 'strict' | 'partition' | 'none'  // 順序保證
  idempotencyKey?: string              // 冪等性鍵（去重）
}

// 使用方式 1: 明確異步
await core.hooks.doActionAsync('order:created', payload, {
  priority: 'high',
  timeout: 5000,
  ordering: 'partition',  // 按 orderId 分區保證順序
})

// 使用方式 2: 同步模式（向後兼容）
await core.hooks.doAction('order:created', payload)
// 內部自動檢測是否有異步監聽器，優先使用異步
```

##### 2. 事件優先級隊列

```typescript
// 內部實現：Priority Queue
class EventPriorityQueue {
  private highPriority: EventTask[] = []
  private normalPriority: EventTask[] = []
  private lowPriority: EventTask[] = []

  enqueue(task: EventTask, priority: Priority) {
    switch (priority) {
      case 'high':   this.highPriority.push(task); break
      case 'normal': this.normalPriority.push(task); break
      case 'low':    this.lowPriority.push(task); break
    }
    this.processNext()
  }

  private processNext() {
    const task = this.highPriority.shift()
      || this.normalPriority.shift()
      || this.lowPriority.shift()
    if (task) this.execute(task)
  }
}
```

##### 3. 可觀測性 (Observability)

```typescript
// OpenTelemetry 整合
import { trace, metrics } from '@opentelemetry/api'

interface EventMetrics {
  // 核心指標
  dispatchLatency: Histogram          // 事件派發延遲分佈
  listenerExecutionTime: Histogram    // 個別監聽器耗時
  queueDepth: Gauge                   // 隊列深度（按優先級）
  
  // 錯誤追蹤
  failureRate: Counter                // 失敗率
  timeoutCount: Counter               // 超時次數
  
  // 吞吐量
  throughput: Counter                 // 事件處理吞吐量
}

// 自動追蹤範例
async doActionAsync(name: string, payload: any, options: EventOptions) {
  const span = trace.getTracer('gravito').startSpan('event.dispatch', {
    attributes: {
      'event.name': name,
      'event.priority': options.priority,
      'event.listeners': this.getListeners(name).length,
    }
  })

  try {
    await this.dispatchAsync(name, payload, options)
    metrics.eventSuccess.add(1, { event: name })
  } catch (error) {
    metrics.eventFailure.add(1, { event: name, error: error.constructor.name })
    span.recordException(error)
    throw error
  } finally {
    span.end()
  }
}

// Prometheus 指標導出
// gravito_event_dispatch_duration_seconds{event="order:created", priority="high"}
// gravito_event_queue_depth{priority="high"}
// gravito_event_listener_duration_seconds{event="order:created", listener="inventory-lock"}
```

##### 4. 向後兼容性策略

```typescript
// Phase 1: 雙模式並存（Feature Flag 控制）
interface CoreConfig {
  events: {
    asyncByDefault: boolean  // 默認異步模式（Feature Flag）
    migrationMode: 'sync' | 'hybrid' | 'async'
  }
}

// Phase 2: 漸進式遷移
class HookManager {
  async doAction(name: string, payload: any, options?: EventOptions) {
    const config = this.getConfig()
    
    // 檢測是否有異步監聽器
    const hasAsyncListeners = this.getListeners(name).some(l => l.async)
    
    if (config.asyncByDefault || hasAsyncListeners || options?.async) {
      return this.doActionAsync(name, payload, options)
    } else {
      // 向後兼容：同步執行
      return this.doActionSync(name, payload)
    }
  }
}

// Phase 3: 棄用警告
if (config.migrationMode === 'hybrid' && !options?.async) {
  logger.warn(`Event "${name}" 使用同步模式，建議遷移至異步模式`)
  logger.warn('參考文檔：https://gravito.dev/docs/events/async-migration')
}

// Phase 4: 完全移除同步模式（2.0 版本）
```

---

#### 實施計畫

##### Phase 1: 核心異步派發（Week 1-2）

**任務清單**：
- [x] 1.1 在 `@gravito/core` 的 `HookManager` 中添加 `doActionAsync` 方法
- [x] 1.2 實現 `EventPriorityQueue` 類
- [x] 1.3 添加 `EventOptions` 接口定義
- [x] 1.4 實現 Feature Flag: `events.asyncByDefault`
- [x] 1.5 編寫單元測試（80%+ 覆蓋率）

**驗收標準**：
```bash
# 性能基準測試
npm run benchmark:event-system
# 預期：異步模式吞吐量 > 同步模式 3x

# 單元測試
npm run test:unit -- packages/core/src/HookManager.test.ts
# 預期：所有測試通過，覆蓋率 > 80%
```

---

##### Phase 2: 可觀測性整合（Week 3-4）

**任務清單**：
- [ ] 2.1 集成 OpenTelemetry SDK
- [ ] 2.2 實現事件追蹤（Tracing）
- [ ] 2.3 實現 Prometheus 指標導出
- [ ] 2.4 創建 Grafana 監控面板模板
- [ ] 2.5 添加性能告警規則

**監控指標**：
```yaml
# Prometheus 告警規則
groups:
  - name: gravito_events
    rules:
      - alert: HighEventDispatchLatency
        expr: histogram_quantile(0.99, gravito_event_dispatch_duration_seconds) > 0.8
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "事件派發 P99 延遲過高"

      - alert: EventQueueDepthHigh
        expr: gravito_event_queue_depth{priority="high"} > 1000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "高優先級事件隊列堆積"
```

**Grafana 面板**：
- Event Dispatch Latency (P50/P95/P99)
- Queue Depth by Priority
- Event Throughput
- Listener Execution Time (Top 10 Slowest)

---

##### Phase 3: 向後兼容性測試（Week 5-6）

**任務清單**：
- [ ] 3.1 編寫兼容性測試套件
- [ ] 3.2 實現自動檢測機制（sync vs async）
- [ ] 3.3 添加遷移警告日誌
- [ ] 3.4 編寫遷移指南文檔
- [ ] 3.5 在示例項目中驗證（flash-sale-fullstack）

**測試場景**：
```typescript
// 測試 1: 純同步監聽器（向後兼容）
core.hooks.addAction('test:event', () => { /* sync */ })
await core.hooks.doAction('test:event')  // 應該同步執行

// 測試 2: 混合監聽器（自動降級）
core.hooks.addAction('test:event', async () => { /* async */ })
await core.hooks.doAction('test:event')  // 應該異步執行

// 測試 3: 明確異步
await core.hooks.doActionAsync('test:event', {}, { async: true })

// 測試 4: 順序保證
const events = []
for (let i = 0; i < 100; i++) {
  await core.hooks.doActionAsync('order:created', { orderId: i }, {
    ordering: 'partition',
    partitionKey: i % 10,  // 10 個分區
  })
}
// 驗證：相同分區內的事件順序正確
```

---

#### 預期收益

**性能提升**：
- ✅ P99 延遲降低：800ms → 400ms（**降低 50%**）
- ✅ 事件派發吞吐：1000 events/s → 3000-5000 events/s（**提升 3-5x**）
- ✅ CPU 利用率：40% → 70%（並行處理）

**可觀測性**：
- ✅ 端到端追蹤：可視化完整調用鏈路
- ✅ 性能瓶頸識別：自動識別慢監聽器
- ✅ 實時告警：P99 延遲 > 800ms 自動通知

**開發體驗**：
- ✅ 向後兼容：現有代碼無需修改
- ✅ 漸進式遷移：Feature Flag 控制切換
- ✅ 完整文檔：遷移指南 + 最佳實踐

---

#### 風險與緩解

| 風險 | 嚴重性 | 緩解措施 |
|------|--------|----------|
| 破壞現有功能 | High | Feature Flag + 完整兼容性測試 |
| 性能回退 | Medium | Benchmark 基準測試 + A/B 測試 |
| 監控開銷 | Low | 採樣率控制（預設 10%）|
| 學習曲線 | Low | 詳細文檔 + 示例代碼 |

---

### Issue 1.2: Event System - Reliability & Scalability

**發現時間**：Week 4-5  
**嚴重性**：⭐⭐⭐⭐ High  
**影響度**：系統可靠性與容錯能力  
**範圍**：DLQ + Circuit Breaker + Backpressure  
**前置條件**：Issue 1.1 完成  

---

#### 問題描述

**當前缺失**：
- ❌ 無 Dead Letter Queue（重試失敗的事件無處理）
- ❌ 無 Circuit Breaker（監聽器失敗級聯影響）
- ❌ 無 Backpressure（高峰期隊列無限增長）
- ❌ 無資料一致性保證（事件順序混亂）
- ❌ 無冪等性支持（事件重複處理）

**關鍵場景**：
```
秒殺活動 10000 QPS：
1. order:created 事件生產速度 > 消費速度
2. 隊列深度無限增長 → 記憶體耗盡 → OOM
3. 某個監聽器（analytics）失敗 → 無重試 → 數據丟失
4. 支付服務 Circuit Open → 所有訂單失敗
```

---

#### 改進建議

##### 1. Dead Letter Queue (DLQ)

```typescript
// 重試策略
interface RetryPolicy {
  maxRetries: number                  // 最大重試次數
  backoff: 'exponential' | 'linear'   // 退避策略
  initialDelayMs: number              // 初始延遲
  maxDelayMs: number                  // 最大延遲
  dlqAfterMaxRetries: boolean         // 超過重試後送 DLQ
}

// 使用方式
await core.hooks.doActionAsync('order:created', payload, {
  retry: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    dlqAfterMaxRetries: true,
  }
})

// DLQ 管理
class DeadLetterQueueManager {
  // 查看 DLQ 事件
  async list(filter: { event?: string, from?: Date, to?: Date }) {
    return db.table('event_dlq')
      .where('event', filter.event)
      .whereBetween('failed_at', [filter.from, filter.to])
  }

  // 重新入隊
  async requeue(dlqId: string) {
    const event = await this.get(dlqId)
    await core.hooks.doActionAsync(event.name, event.payload, event.options)
    await this.delete(dlqId)
  }

  // 批量重試
  async requeueBatch(filter: { event: string }) {
    const events = await this.list(filter)
    for (const event of events) {
      await this.requeue(event.id)
    }
  }
}

// CLI 工具
$ gravito event:dlq:list --event=order:created
$ gravito event:dlq:requeue --id=abc123
$ gravito event:dlq:requeue --event=order:created --all
```

---

##### 2. Circuit Breaker

```typescript
// 集成 @gravito/stasis Circuit Breaker
import { CircuitBreakerStore } from '@gravito/stasis'

interface CircuitBreakerOptions {
  failureThreshold: number      // 失敗閾值（次數）
  resetTimeout: number          // 恢復超時（ms）
  halfOpenRequests: number      // 半開狀態測試請求數
  onOpen?: () => void           // Open 回調
  onHalfOpen?: () => void       // Half-Open 回調
  onClose?: () => void          // Close 回調
}

// 監聽器級別的 Circuit Breaker
class HookManager {
  addAction(
    name: string,
    listener: ListenerFunction,
    options?: {
      circuitBreaker?: CircuitBreakerOptions
    }
  ) {
    if (options?.circuitBreaker) {
      const breaker = new CircuitBreaker(
        listener,
        options.circuitBreaker
      )
      this.listeners.set(name, breaker.execute.bind(breaker))
    } else {
      this.listeners.set(name, listener)
    }
  }
}

// 使用方式
core.hooks.addAction(
  'order:created',
  async (payload) => {
    await analyticsService.track(payload)
  },
  {
    circuitBreaker: {
      failureThreshold: 5,        // 5 次失敗後熔斷
      resetTimeout: 30000,        // 30 秒後嘗試恢復
      halfOpenRequests: 3,        // 半開狀態測試 3 次
      onOpen: () => {
        logger.error('Analytics listener circuit breaker opened')
        metrics.circuitBreakerOpen.add(1, { listener: 'analytics' })
      }
    }
  }
)

// 全局 Circuit Breaker 狀態監控
$ gravito circuit:status
┌──────────────────┬─────────┬─────────┬────────────┐
│ Listener         │ State   │ Failures│ Next Reset │
├──────────────────┼─────────┼─────────┼────────────┤
│ analytics        │ OPEN    │ 5/5     │ 25s        │
│ inventory-lock   │ CLOSED  │ 0/5     │ -          │
│ payment          │ HALF_OPEN│ 1/3    │ -          │
└──────────────────┴─────────┴─────────┴────────────┘
```

---

##### 3. Backpressure 機制

```typescript
// 隊列配置
interface QueueConfig {
  maxDepth: number                     // 隊列深度上限
  memoryLimit: string                  // 記憶體限制 ('512MB')
  backpressureThreshold: number        // 背壓閾值 (0.8 = 80%)
  rejectionPolicy: 'drop-oldest' | 'drop-newest' | 'block' | 'reject'
  onBackpressure?: (depth: number) => void
}

// 使用方式
core.events.configure({
  queue: {
    maxDepth: 10000,
    memoryLimit: '512MB',
    backpressureThreshold: 0.8,        // 8000 events 觸發背壓
    rejectionPolicy: 'reject',         // 拒絕新事件
    onBackpressure: (depth) => {
      logger.warn(`Event queue backpressure triggered: ${depth} events`)
      // 觸發降級：暫停低優先級事件
      core.events.pausePriority('low')
    }
  }
})

// 背壓響應策略
class EventQueue {
  async enqueue(task: EventTask) {
    const depth = this.getDepth()
    const threshold = this.config.maxDepth * this.config.backpressureThreshold

    if (depth > threshold) {
      // 觸發背壓
      this.config.onBackpressure?.(depth)

      switch (this.config.rejectionPolicy) {
        case 'drop-oldest':
          this.queue.shift()  // 丟棄最舊的
          break
        case 'drop-newest':
          return              // 丟棄當前的
        case 'block':
          await this.waitUntilSpace()  // 阻塞等待
          break
        case 'reject':
          throw new BackpressureError('Event queue full')
      }
    }

    this.queue.push(task)
  }
}

// HTTP 層面的背壓響應
app.use((req, res, next) => {
  const queueDepth = core.events.getQueueDepth()
  const maxDepth = core.events.getMaxDepth()

  if (queueDepth / maxDepth > 0.9) {
    // 返回 429 Too Many Requests
    return res.status(429).json({
      error: 'System overloaded, please retry later',
      retryAfter: 5  // 5 秒後重試
    })
  }

  next()
})
```

---

##### 4. 資料一致性保證

```typescript
// 順序保證策略
type OrderingStrategy = 
  | 'strict'      // 全局嚴格順序（慢，適合關鍵流程）
  | 'partition'   // 分區順序（快，適合大多數場景）
  | 'none'        // 無順序保證（最快）

// Partition Ordering（推薦）
await core.hooks.doActionAsync('order:created', payload, {
  ordering: 'partition',
  partitionKey: payload.orderId,  // 相同 orderId 保證順序
})

// 內部實現：每個分區獨立隊列
class PartitionedEventQueue {
  private partitions = new Map<string, EventTask[]>()

  async enqueue(task: EventTask, partitionKey: string) {
    if (!this.partitions.has(partitionKey)) {
      this.partitions.set(partitionKey, [])
      this.processPartition(partitionKey)  // 啟動處理器
    }
    this.partitions.get(partitionKey).push(task)
  }

  private async processPartition(key: string) {
    const queue = this.partitions.get(key)
    while (queue.length > 0) {
      const task = queue.shift()
      await this.execute(task)
    }
    this.partitions.delete(key)
  }
}

// 冪等性支持
await core.hooks.doActionAsync('order:created', payload, {
  idempotencyKey: `order:${payload.orderId}:created`,
  ttl: 3600000,  // 1 小時內去重
})

// 內部實現：Redis 去重
class IdempotencyManager {
  async checkAndSet(key: string, ttl: number): Promise<boolean> {
    const result = await redis.set(
      `idempotency:${key}`,
      '1',
      'NX',
      'PX',
      ttl
    )
    return result === 'OK'
  }
}
```

---

##### 5. Bull Queue 後端整合

```typescript
// 使用 @gravito/stream 作為事件後端
import { OrbitStream } from '@gravito/stream'
import { SystemEventJob } from '@gravito/stream/jobs'

// 配置
core.events.configure({
  backend: 'stream',  // 使用 Bull Queue
  stream: {
    connection: {
      host: 'localhost',
      port: 6379,
    },
    defaultQueue: 'system-events',
    concurrency: {
      high: 10,
      normal: 5,
      low: 2,
    }
  }
})

// 自動轉換：Event → Job
class StreamEventBackend {
  async dispatchAsync(name: string, payload: any, options: EventOptions) {
    const job = new SystemEventJob({
      eventName: name,
      payload,
      listeners: this.getListeners(name),
    })

    await this.stream.dispatch(job, {
      priority: this.mapPriority(options.priority),
      attempts: options.retry?.maxRetries || 1,
      backoff: options.retry?.backoff || 'exponential',
    })
  }
}

// 優勢：
// ✅ 持久化（Redis）- 重啟不丟失
// ✅ 分佈式執行 - 多 Worker 並行
// ✅ UI 監控 - Bull Board
// ✅ 自動重試 - 內置機制
```

---

#### 實施計畫

##### Phase 1: DLQ + Retry（Week 1-2）

**任務清單**：
- [ ] 1.1 創建 `event_dlq` 資料表
- [x] 1.2 實現 `RetryPolicy` 邏輯
- [x] 1.3 實現 `DeadLetterQueueManager` (In-Memory)
- [ ] 1.4 添加 CLI 工具（list/requeue）
- [ ] 1.5 編寫整合測試

---

##### Phase 2: Circuit Breaker（Week 3-4）

**任務清單**：
- [x] 2.1 整合 `@gravito/stasis` Circuit Breaker (Implemented in Core)
- [x] 2.2 實現監聽器級別的 Circuit Breaker
- [ ] 2.3 添加狀態監控 CLI
- [x] 2.4 實現自動恢復邏輯
- [ ] 2.5 混沌測試（Chaos Engineering）

---

##### Phase 3: Backpressure（Week 5-6）

**任務清單**：
- [x] 3.1 實現 `QueueConfig` 與 `BackpressureManager` (Logic in Queue)
- [ ] 3.2 添加記憶體監控（`process.memoryUsage()`）
- [x] 3.3 實現拒絕策略（drop/block/reject）
- [ ] 3.4 HTTP 層面的 429 響應
- [ ] 3.5 負載測試（10000 events/s）

---

##### Phase 4: Bull Queue 整合（Week 7-8）

**任務清單**：
- [x] 4.1 創建 `SystemEventJob`
- [x] 4.2 實現 `StreamEventBackend`
- [ ] 4.3 支持多 Worker 部署
- [ ] 4.4 集成 Bull Board UI
- [ ] 4.5 遷移指南文檔

---

#### 測試策略

##### 單元測試

```typescript
// 測試 DLQ
describe('DeadLetterQueueManager', () => {
  it('should move event to DLQ after max retries', async () => {
    // ...
  })

  it('should requeue DLQ event successfully', async () => {
    // ...
  })
})

// 測試 Circuit Breaker
describe('CircuitBreaker', () => {
  it('should open after failure threshold', async () => {
    // 連續失敗 5 次 → 狀態應為 OPEN
  })

  it('should transition to half-open after reset timeout', async () => {
    // ...
  })
})

// 測試 Backpressure
describe('EventQueue Backpressure', () => {
  it('should reject events when queue is full', async () => {
    // 填滿隊列 → 拋出 BackpressureError
  })
})
```

##### 整合測試

```typescript
// 端到端測試
describe('Event System E2E', () => {
  it('should handle event with retry and DLQ', async () => {
    let attempts = 0
    core.hooks.addAction('test:event', async () => {
      attempts++
      if (attempts < 3) throw new Error('Simulated failure')
    })

    await core.hooks.doActionAsync('test:event', {}, {
      retry: { maxRetries: 3, dlqAfterMaxRetries: true }
    })

    // 驗證：重試 3 次後成功
    expect(attempts).toBe(3)
  })
})
```

##### 性能測試

```bash
# Benchmark: 吞吐量測試
$ k6 run benchmark/event-throughput.js
# 目標：10000 events/s 無 OOM

# 負載測試：背壓行為
$ k6 run benchmark/event-backpressure.js
# 驗證：隊列深度 > 8000 時，正確觸發背壓
```

##### 混沌工程

```typescript
// Chaos Test: 隨機失敗
describe('Chaos Engineering', () => {
  it('should remain stable under random listener failures', async () => {
    core.hooks.addAction('test:event', async () => {
      if (Math.random() < 0.3) throw new Error('Random failure')
    }, {
      circuitBreaker: { failureThreshold: 5 }
    })

    // 發送 1000 個事件
    for (let i = 0; i < 1000; i++) {
      await core.hooks.doActionAsync('test:event', { id: i })
    }

    // 驗證：Circuit Breaker 應該開啟
    const status = core.circuit.getStatus('test:event')
    expect(status.state).toBe('OPEN')
  })
})
```

---

#### 預期收益

**可靠性**：
- ✅ 事件丟失率：從 5% → 0.01%（DLQ 保bottom）
- ✅ 級聯故障：從 100% → 0%（Circuit Breaker 隔離）
- ✅ OOM 風險：從 High → None（Backpressure 控制）

**擴展性**：
- ✅ 峰值處理：10000 events/s（Bull Queue 分佈式）
- ✅ 水平擴展：支持多 Worker 並行
- ✅ 彈性伸縮：根據隊列深度自動調整

**可運維性**：
- ✅ DLQ 管理：CLI 工具 + UI 界面
- ✅ Circuit Status：實時狀態監控
- ✅ Backpressure Alert：自動告警

---

#### 與現有系統整合

**依賴組件**：
- `@gravito/stasis` - Circuit Breaker Store（已存在）
- `@gravito/stream` - Bull Queue 管理（已存在）
- `@gravito/plasma` - Redis Aggregator（性能監控）

**整合點**：
```typescript
// packages/core/src/HookManager.ts
import { CircuitBreakerStore } from '@gravito/stasis'
import { OrbitStream } from '@gravito/stream'
import { RedisAggregator } from '@gravito/plasma'

class HookManager {
  constructor(
    private circuitBreakerStore: CircuitBreakerStore,
    private stream: OrbitStream,
    private metrics: RedisAggregator
  ) {}

  // 實現邏輯...
}
```

---

#### Schema 版本管理

```typescript
// 未來考慮：Event Schema Registry
interface Event<T> {
  name: string
  version: string          // 'v1', 'v2'
  payload: T
  schemaId?: string        // Schema Registry ID
}

// 版本兼容性
class SchemaRegistry {
  async validate(event: Event<any>) {
    const schema = await this.getSchema(event.name, event.version)
    return schema.validate(event.payload)
  }

  async canUpgrade(fromVersion: string, toVersion: string) {
    // 檢查是否向後兼容
    return this.isBackwardCompatible(fromVersion, toVersion)
  }
}

// 使用方式
await core.hooks.doActionAsync('order:created', payload, {
  version: 'v2',  // 明確版本
})
```

---

#### 關鍵決策點

基於 **flash-sale-fullstack** 專案的實際分析，以下是 5 個關鍵問題的答案：

---

##### 問題 1: 現有系統有多少事件類型？

**答案**：**13 個事件類型**（評估遷移工作量：**中等**）

**事件清單**：

| 類別 | 事件名稱 | 派發位置 | 監聽器 | 優先級建議 |
|------|---------|---------|--------|-----------|
| **訂單流程** | `order:created` | Flash-Sale Satellite | order-queue-handler | **High** |
| | `order:ready_for_payment` | LockInventoryJob | Payment Satellite | **High** |
| | `order:lock_failed` | LockInventoryJob | Alert System | Normal |
| | `order:lock_permanent_failure` | LockInventoryJob | DLQ + Alert | **High** |
| | `order:confirmed` | ConfirmOrderJob | Analytics | Normal |
| | `order:confirm_failed` | ConfirmOrderJob | Alert System | Normal |
| | `order:confirm_permanent_failure` | ConfirmOrderJob | DLQ + Alert | **High** |
| **庫存流程** | `order:deduct_failed` | DeductInventoryJob | Alert System | Normal |
| | `order:deduct_permanent_failure` | DeductInventoryJob | DLQ + Alert | **High** |
| | `inventory:released` | ReleaseInventoryJob | Analytics | Low |
| | `inventory:release_failed` | ReleaseInventoryJob | Alert System | Normal |
| | `inventory:release_permanent_failure` | ReleaseInventoryJob | DLQ + Alert | **High** |
| **支付流程** | `payment:succeeded` | Payment Satellite | payment-queue-handler | **High** |

**遷移工作量評估**：
- ✅ **低風險事件**（6 個）：Analytics、Alert 類事件，可直接異步化
- ⚠️ **中風險事件**（4 個）：`order:created`, `payment:succeeded`, `order:ready_for_payment`, `order:confirmed`，需要順序保證
- 🔴 **高風險事件**（3 個）：`*_permanent_failure` 事件，需要 DLQ 支持

**遷移策略**：
```typescript
// Phase 1: 先遷移低優先級事件（Analytics）
core.hooks.doActionAsync('inventory:released', payload, {
  priority: 'low',
  async: true,
})

// Phase 2: 遷移核心流程事件（需要順序保證）
core.hooks.doActionAsync('order:created', payload, {
  priority: 'high',
  ordering: 'partition',
  partitionKey: payload.orderId,  // 相同訂單保證順序
})

// Phase 3: 遷移失敗事件（需要 DLQ）
core.hooks.doActionAsync('order:lock_permanent_failure', payload, {
  priority: 'high',
  retry: {
    maxRetries: 3,
    dlqAfterMaxRetries: true,
  }
})
```

---

##### 問題 2: 是否有事件順序依賴？

**答案**：**是，有嚴格的順序依賴**（決定 Ordering 策略：**Partition Ordering**）

**關鍵順序依賴**：

```
訂單生命週期（必須按順序）：
1. order:created
   ↓
2. order:ready_for_payment  (LockInventoryJob 成功後)
   ↓
3. payment:succeeded  (支付完成)
   ↓
4. order:confirmed  (DeductInventoryJob 成功後)

失敗分支（可以亂序）：
- order:lock_failed
- order:deduct_failed
- inventory:release_failed
```

**順序保證需求分析**：

| 事件對 | 順序要求 | 原因 | 策略 |
|--------|---------|------|------|
| `order:created` → `order:ready_for_payment` | **嚴格** | 必須先鎖定庫存再支付 | Partition by `orderId` |
| `payment:succeeded` → `order:confirmed` | **嚴格** | 必須先支付再確認訂單 | Partition by `orderId` |
| `order:confirmed` → `inventory:released` | **寬鬆** | 釋放庫存可延遲 | None |
| `*:failed` 事件 | **無** | 告警事件無順序要求 | None |

**推薦策略**：**Partition Ordering**

```typescript
// 實現方式：按 orderId 分區
await core.hooks.doActionAsync('order:created', payload, {
  ordering: 'partition',
  partitionKey: payload.orderId,  // 相同 orderId 的事件保證順序
})

// 優勢：
// ✅ 相同訂單的事件按順序處理
// ✅ 不同訂單的事件可並行處理
// ✅ 性能與順序的最佳平衡
```

**為什麼不用 Strict Ordering？**
- ❌ 全局順序會嚴重降低吞吐量
- ❌ 不同訂單之間無需順序保證
- ❌ 秒殺場景需要高並發處理

---

##### 問題 3: 可接受的事件丟失率？

**答案**：**0.01%**（選擇 Delivery Semantics：**At-least-once + 冪等性**）

**業務容忍度分析**：

| 事件類型 | 丟失影響 | 可接受丟失率 | 補償機制 |
|---------|---------|------------|---------|
| `order:created` | 🔴 **嚴重** - 訂單丟失，用戶投訴 | **0%** | DLQ + 人工介入 |
| `payment:succeeded` | 🔴 **嚴重** - 已付款但未發貨 | **0%** | DLQ + 自動重試 |
| `order:confirmed` | 🟠 **中等** - 訂單狀態不一致 | **0.1%** | 定時任務修復 |
| `inventory:released` | 🟡 **輕微** - 庫存統計誤差 | **1%** | 定期對賬 |
| `*:failed` 告警事件 | 🟢 **低** - 告警遺漏 | **5%** | 多渠道告警 |

**推薦 Delivery Semantics**：**At-least-once**

```typescript
// At-least-once 保證：
// ✅ 事件至少被處理一次
// ⚠️ 可能重複處理（需要冪等性）

// 實現方式：
await core.hooks.doActionAsync('order:created', payload, {
  retry: {
    maxRetries: 3,              // 重試 3 次
    backoff: 'exponential',     // 指數退避
    dlqAfterMaxRetries: true,   // 超過重試送 DLQ
  },
  idempotencyKey: `order:${payload.orderId}:created`,  // 去重
  ttl: 3600000,  // 1 小時內去重
})
```

**為什麼不用 Exactly-once？**
- ❌ 性能代價極高（需要分佈式事務）
- ❌ 實現複雜度高
- ✅ At-least-once + 冪等性可達到相同效果

**冪等性設計**：

```typescript
// 監聽器冪等性範例
core.hooks.addAction('order:created', async (payload) => {
  // 1. 檢查是否已處理
  const processed = await redis.get(`processed:order:${payload.orderId}`)
  if (processed) {
    logger.info(`訂單 ${payload.orderId} 已處理，跳過`)
    return
  }

  // 2. 處理業務邏輯
  await processOrder(payload)

  // 3. 標記已處理
  await redis.setex(`processed:order:${payload.orderId}`, 3600, '1')
})
```

**目標丟失率**：**0.01%**（10000 個事件中最多丟失 1 個）

---

##### 問題 4: Bull Queue 已部署嗎？

**答案**：**是，已部署 `@gravito/stream`**（Phase 4 前置條件：**滿足**）

**現有基礎設施**：

```typescript
// 專案已使用 @gravito/stream (Bull Queue 封裝)
import { getQueueManager } from '../app'
import { LockInventoryJob } from '../queue/jobs/LockInventoryJob'

// 已有 4 個 Job 類：
// 1. LockInventoryJob      - 鎖定庫存
// 2. DeductInventoryJob    - 扣減庫存
// 3. ReleaseInventoryJob   - 釋放庫存
// 4. ConfirmOrderJob       - 確認訂單

// 使用方式：
const job = new LockInventoryJob(payload)
await queueManager.push(job.onQueue('inventory'))
```

**整合優勢**：
- ✅ **已有 Redis 連接**：可直接用於 Event Queue
- ✅ **已有 Job 抽象**：可創建 `SystemEventJob`
- ✅ **已有 Worker 機制**：可復用分佈式執行
- ✅ **已有監控**：Bull Board UI 可直接使用

**整合方案**：

```typescript
// 創建 SystemEventJob（新增）
class SystemEventJob extends Job {
  constructor(
    public eventName: string,
    public payload: any,
    public listeners: ListenerFunction[]
  ) {
    super()
  }

  async handle() {
    // 執行所有監聽器
    for (const listener of this.listeners) {
      await listener(this.payload)
    }
  }
}

// Event System 自動轉換
class StreamEventBackend {
  async dispatchAsync(name: string, payload: any, options: EventOptions) {
    const job = new SystemEventJob(
      name,
      payload,
      this.getListeners(name)
    )

    await queueManager.push(job.onQueue('system-events'))
  }
}
```

**部署狀態**：
- ✅ Redis: 已部署（用於 Cache + Queue）
- ✅ Bull Queue: 已部署（`@gravito/stream`）
- ✅ Worker: 已部署（處理 Job）
- ⚠️ Bull Board UI: 未部署（需要添加）

**Phase 4 可立即開始**！

---

##### 問題 5: 是否需要多區域部署？

**答案**：**短期不需要，長期需要**（影響 Redlock 需求：**Phase 2 暫不實施**）

**當前部署架構**：
- 🌍 **單區域部署**（台灣或香港）
- 🔴 **單 Redis 實例**（無 HA）
- 🟡 **單應用實例**（可水平擴展）

**多區域需求評估**：

| 階段 | 用戶規模 | 部署策略 | Redlock 需求 |
|------|---------|---------|------------|
| **Phase 1-2** (前 6 個月) | < 10 萬 | 單區域 + 單 Redis | ❌ 不需要 |
| **Phase 3** (6-12 個月) | 10-50 萬 | 單區域 + Redis Sentinel (HA) | ⚠️ 可選 |
| **Phase 4** (12+ 個月) | 50 萬+ | 多區域 + Redis Cluster | ✅ **需要** |

**推薦策略**：

```typescript
// Phase 1-2: 單 Redis Lock（簡單可靠）
const lock = await distributedLock.acquire(`inventory:${productId}`, {
  ttl: 900000,
  replication: 'single',  // 單 Redis
})

// Phase 3: Redis Sentinel（高可用）
const lock = await distributedLock.acquire(`inventory:${productId}`, {
  ttl: 900000,
  replication: 'sentinel',  // 主從切換
})

// Phase 4: Redlock（多區域）
const lock = await distributedLock.acquire(`inventory:${productId}`, {
  ttl: 900000,
  replication: 'redlock',  // 多 Redis 實例
  nodes: [
    'redis://tw-redis-1:6379',
    'redis://hk-redis-1:6379',
    'redis://sg-redis-1:6379',
  ]
})
```

**為什麼短期不需要 Redlock？**
- ✅ 單 Redis 性能足夠（10 萬 QPS+）
- ✅ 實現簡單，維護成本低
- ✅ 故障恢復快（< 30 秒）
- ❌ Redlock 複雜度高，容易出錯

**長期規劃**：
- **12 個月內**：專注於單區域優化
- **12-18 個月**：評估多區域需求
- **18+ 個月**：實施 Redlock（如果需要）

---

### 📋 最終決策總結

基於以上分析，**推薦決策**如下：

| 決策項 | 選擇 | 理由 |
|--------|------|------|
| **Ordering** | **Partition** (按 `orderId`) | 平衡性能與順序，相同訂單保證順序 |
| **Delivery** | **At-least-once** + 冪等性 | 可靠性高，性能好，實現簡單 |
| **Backend** | **Bull Queue** (`@gravito/stream`) | 已部署，可立即使用 |
| **Circuit Breaker** | **監聽器級別** | 細粒度控制，隔離故障 |
| **Redlock** | **暫不實施**（Phase 4 再評估） | 單 Redis 足夠，降低複雜度 |
| **事件丟失率目標** | **0.01%** | DLQ + 重試機制保證 |
| **遷移優先級** | Low → Normal → High | 漸進式遷移，降低風險 |

---

---

### Issue 1.3: 數據庫連接池管理不足

**發現時間**：Week 5
**嚴重性**：⭐⭐⭐⭐ High
**影響度**：高併發下連接耗盡

#### 問題描述

```typescript
// 當前配置（atlas package）
pool: {
  min: 2,
  max: 10,  // ❌ 太小，高併發下會耗盡
}
```

**現象**：
- 100+ 並發用戶時連接池耗盡
- 新請求等待空閒連接（等待時間 > 500ms）
- 無自動調整機制
- 無連接池監控告警

**根本原因**：
- 默認池大小太小 (max: 10)
- 無根據負載自動調整
- 缺少監控指標曝露

#### 臨時解決方案

```typescript
// 手動增大連接池
pool: {
  min: 5,
  max: 50,  // 根據負載手動調整
  idleTimeoutMillis: 30000,
}
```

#### 改進建議

```typescript
// 1. 自適應連接池
interface AdaptivePoolConfig {
  minSize: number
  maxSize: number
  targetUtilization: 0.7  // 目標利用率 70%
  adjustInterval: 60000   // 每 60 秒調整
  metrics: true           // 曝露 Prometheus 指標
}

// 2. 連接池監控指標
metrics:
  - db.connections.active
  - db.connections.idle
  - db.connections.waiting
  - db.query.time (P50/P95/P99)
  - db.connection.timeout.count

// 3. 自動告警
alerts:
  - connections_exhausted > 95%
  - query_wait_time > 1000ms
  - connection_timeout_rate > 1%

// 4. 健康檢查
healthCheck: {
  interval: 30000,
  timeout: 5000,
  testQuery: 'SELECT 1'
}
```

#### 實施計畫

1. **Phase 1**: 曝露連接池監控指標 (Prometheus)
2. **Phase 2**: 實現自適應連接池管理
3. **Phase 3**: 集成 Grafana 監控面板
4. **Phase 4**: 自動告警與恢復機制

**預期收益**：
- 連接耗盡率降低 99%
- 查詢響應時間穩定
- 自動化容量管理

---

### Issue 1.4: 缺少內置分佈式鎖支持

**發現時間**：Week 3
**嚴重性**：⭐⭐⭐⭐ High
**影響度**：庫存一致性保證

#### 問題描述

```typescript
// 當前做法：手動使用 Redis 客戶端
const locked = await redis.set(
  `lock:${productId}`,
  userId,
  'NX',    // 只在不存在時設置
  'EX',
  900      // 900 秒過期
)
if (!locked) {
  throw new Error('Already locked')
}
```

**問題**：
- 無統一的鎖管理接口
- 無死鎖偵測機制
- 無自動重試邏輯
- 無 Redlock 容錯支持

#### 改進建議

```typescript
// 新增 @gravito/distributed-lock 包

interface LockOptions {
  ttl: number                    // 鎖定時間
  retry: {
    attempts: number
    delayMs: number
    backoff: 'linear' | 'exponential'
  }
  deadlockDetection: true        // 死鎖偵測
  replication: 'single' | 'redlock'  // 複製策略
}

// 使用方式
const lock = await core.container
  .make('distributed-lock')
  .acquire(`inventory:${productId}`, {
    ttl: 900000,                 // 900 秒
    retry: {
      attempts: 3,
      delayMs: 100,
      backoff: 'exponential'
    },
    deadlockDetection: true,
    replication: 'redlock'       // 多 Redis 容錯
  })

try {
  // 執行臨界段代碼
  await deductInventory()
} finally {
  await lock.release()
}
```

#### 實施計畫

1. **Phase 1**: 創建 `@gravito/distributed-lock` 包
2. **Phase 2**: 實現基礎 Redis Lock
3. **Phase 3**: 實現 Redlock 算法（多 Redis）
4. **Phase 4**: 添加死鎖偵測與自動恢復

**預期收益**：
- 鎖管理統一標準化
- 支持多 Redis 部署
- 自動容錯與恢復

---

## 🟠 優先級 2: 短期改進 (High)

### Issue 2.1: 缺少分佈式追蹤支持

**發現時間**：Week 7
**嚴重性**：⭐⭐⭐⭐ High
**影響度**：性能診斷與問題排查

#### 問題描述

```
當前：單機日誌記錄
問題：
  - 無法追蹤跨 Satellite 請求
  - 無法看到完整的調用鏈路
  - 無法自動識別性能瓶頸
  - 無法關聯多個 Job 執行
```

#### 改進建議

```typescript
// 集成 OpenTelemetry

// 1. 自動追蹤儀器化
import { NodeTracerProvider } from '@opentelemetry/node'
import { registerInstrumentations } from '@opentelemetry/auto-instrumentations-node'

const provider = new NodeTracerProvider()
registerInstrumentations()  // 自動追蹤 HTTP、DB、Redis 等

// 2. Satellite 間追蹤
@Hook('order:created')
async onOrderCreated(payload) {
  const span = tracer.startSpan('inventory.lock')
  try {
    await core.container.make('inventory-lock').lock()
  } finally {
    span.end()
  }
}

// 3. Job 執行追蹤
class OrderJob {
  async handle() {
    const span = tracer.startSpan('order.processing', {
      attributes: { jobId: this.id }
    })
    try {
      await this.process()
    } finally {
      span.end()
    }
  }
}

// 4. 匯出到 Jaeger/Zipkin
const exporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces'
})
provider.addSpanProcessor(new BatchSpanProcessor(exporter))
```

**預期收益**：
- 自動生成完整調用鏈路
- 自動識別性能瓶頸 (>1s 自動告警)
- 支持分佈式追蹤可視化

---

### Issue 2.2: 缺少速率限制與熔斷機制

**發現時間**：Week 6
**嚴重性**：⭐⭐⭐ Medium
**影響度**：系統穩定性與級聯故障

#### 改進建議

```typescript
// 1. 內置速率限制
const rateLimiter = core.container.make('rate-limiter')

// 基於 IP 的速率限制
app.use(rateLimiter.middleware({
  keyGenerator: (req) => req.ip,
  limit: 100,         // 100 請求
  window: 60000,      // 60 秒窗口
}))

// 基於用戶的速率限制
app.post('/api/orders',
  rateLimiter.middleware({
    keyGenerator: (req) => req.user.id,
    limit: 10,         // 單用戶 10 個/分鐘
    window: 60000,
    skipSuccessfulRequests: false,  // 失敗也計數
  }),
  orderController.create
)

// 2. 熔斷器
const circuitBreaker = core.container.make('circuit-breaker')

class PaymentService {
  async processPayment(order) {
    return await circuitBreaker.execute(
      async () => this.stripe.charge(order),
      {
        name: 'stripe-payment',
        failureThreshold: 5,        // 5 次失敗後熔斷
        resetTimeout: 30000,        // 30 秒後嘗試恢復
        onOpen: () => {
          logger.error('Payment service circuit breaker opened')
        }
      }
    )
  }
}

// 3. 自適應降級
class InventoryService {
  async getInventory(productId) {
    try {
      // 優先使用快取
      return await cache.get(`inventory:${productId}`)
    } catch (error) {
      // 快取失敗，降級到過期數據
      return await cache.getStale(`inventory:${productId}`)
    }
  }
}
```

**預期收益**：
- 防止單個服務故障級聯
- 自動限流保護系統
- 優雅降級提升可用性

---

## 🟡 優先級 3: 中期優化 (Medium)

### Issue 3.1: 快取層還需優化

**發現時間**：Week 6
**嚴重性**：⭐⭐⭐ Medium

#### 改進建議

```typescript
// 1. 二級快取（本地 + Redis）
class MultiLevelCache {
  async get(key) {
    // L1: 本地記憶體快取 (100ms TTL)
    let value = this.localCache.get(key)
    if (value) return value

    // L2: Redis 快取 (5分鐘 TTL)
    value = await redis.get(key)
    if (value) {
      this.localCache.set(key, value)  // 回源到本地
      return value
    }

    // L3: 資料庫
    value = await db.query(key)
    await redis.setex(key, 300, value)  // 放回 Redis
    return value
  }
}

// 2. 快取預熱
class CacheWarmer {
  async warmUp() {
    // 應用啟動時預熱熱點數據
    const products = await db.getHotProducts(100)
    for (const product of products) {
      await cache.set(`product:${product.id}`, product, {
        ttl: 3600  // 1 小時
      })
    }
  }
}

// 3. 快取失效策略
// 當前：TTL 失效
// 改進：
//   - 事件驅動失效
//   - 模式匹配清理
//   - 預測性刷新
```

---

### Issue 3.2: 缺少事件溯源支持

**發現時間**：Week 8
**嚴重性**：⭐⭐ Low
**影響度**：審計日誌與故障恢復

#### 改進建議

```typescript
// Event Sourcing 支持
interface Event {
  id: string
  aggregate: 'Order' | 'Inventory'
  aggregateId: string
  type: 'OrderCreated' | 'OrderConfirmed' | string
  version: number
  timestamp: Date
  data: any
  metadata: {
    userId: string
    source: string
  }
}

// 事件存儲
class EventStore {
  async append(event: Event) {
    // 追加事件到不可變日誌
    await db.table('events').insert(event)
    // 觸發訂閱者
    await bus.publish(event)
  }

  async getEvents(aggregateId: string, fromVersion: number = 0) {
    // 重放事件重構狀態
    return db.table('events')
      .where('aggregateId', aggregateId)
      .where('version', '>', fromVersion)
      .orderBy('version')
  }
}

// 狀態重構
class OrderAggregate {
  async loadFromHistory(orderId: string) {
    const events = await eventStore.getEvents(orderId)
    let order = new Order()

    for (const event of events) {
      switch(event.type) {
        case 'OrderCreated':
          order = Order.create(event.data)
          break
        case 'OrderConfirmed':
          order.confirm(event.data)
          break
        case 'OrderCancelled':
          order.cancel(event.data)
          break
      }
    }

    return order
  }
}
```

**應用場景**：
- 完整審計日誌
- 時間旅行調試
- 故障恢復與重放
- 跨系統同步

---

## 📊 優化優先級排序

| 優先級 | Issue | 嚴重性 | 工作量 | 收益 | 建議實施時間 |
|--------|-------|--------|--------|------|-------------|
| 🔴 1 | Event System - Core Async | 🔴 Critical | 中 | 🌟🌟🌟 高 | 即刻（Week 1-6） |
| 🔴 1 | Event System - Reliability | 🟠 High | 大 | 🌟🌟🌟 高 | Week 7-14 |
| 🔴 1 | 連接池管理 | 🟠 High | 小 | 🌟🌟🌟 高 | Week 1-4 |
| 🔴 1 | 分佈式鎖 | 🟠 High | 中 | 🌟🌟🌟 高 | Week 5-8 |
| 🟠 2 | 分佈式追蹤 | 🟠 High | 中 | 🌟🌟🌟 高 | Week 9-12 |
| 🟠 2 | 速率限制 | 🟡 Medium | 小 | 🌟🌟 中 | Week 13-15 |
| 🟡 3 | 快取層優化 | 🟡 Medium | 小 | 🌟🌟 中 | Week 16-20 |
| 🟡 3 | 事件溯源 | 🟢 Low | 大 | 🌟 低 | Week 24+ |

---

## 🎯 建議實施路線圖

### Phase 1: 核心異步 + 基礎設施（Week 1-6）

**目標**：解決 Event System 核心性能問題，建立可觀測性基礎

```
Week 1-2: Event System - Core Async Dispatch (Issue 1.1 Phase 1)
  ├─ 實現 doActionAsync + EventPriorityQueue
  ├─ Feature Flag: asyncByDefault
  └─ 單元測試 (80%+ 覆蓋率)

Week 3-4: Event System - Observability (Issue 1.1 Phase 2)
  ├─ OpenTelemetry 集成
  ├─ Prometheus 指標導出
  ├─ Grafana 監控面板
  └─ 性能告警規則

Week 4-6: 連接池管理（Issue 1.3）
  ├─ 曝露連接池監控指標
  ├─ 自適應連接池管理
  └─ Grafana 監控面板
```

### Phase 2: 容錯與可靠性（Week 7-14）

**目標**：建立完整的容錯機制，提升系統可靠性

```
Week 7-8: Event System - DLQ + Retry (Issue 1.2 Phase 1)
  ├─ 實現 Dead Letter Queue
  ├─ RetryPolicy 與 Backoff
  └─ CLI 管理工具

Week 9-10: Event System - Circuit Breaker (Issue 1.2 Phase 2)
  ├─ 整合 @gravito/stasis Circuit Breaker
  ├─ 監聽器級別熔斷
  └─ 狀態監控 CLI

Week 11-12: Event System - Backpressure (Issue 1.2 Phase 3)
  ├─ QueueConfig + BackpressureManager
  ├─ 記憶體監控與拒絕策略
  └─ HTTP 429 響應

Week 13-14: Event System - Bull Queue (Issue 1.2 Phase 4)
  ├─ SystemEventJob 實現
  ├─ StreamEventBackend 整合
  └─ Bull Board UI
```

### Phase 3: 分佈式增強（Week 15-20）

**目標**：完善分佈式工具鏈，支持高併發場景

```
Week 15-17: 分佈式鎖（Issue 1.4）
  ├─ 創建 @gravito/distributed-lock 包
  ├─ 基礎 Redis Lock
  ├─ Redlock 算法（多 Redis）
  └─ 死鎖偵測與恢復

Week 18-20: 速率限制與熔斷（Issue 2.2）
  ├─ 內置速率限制 Middleware
  ├─ 熔斷器優雅降級
  └─ 自適應降級策略
```

### Phase 4: 長期優化（Week 21+）

**目標**：持續改進系統性能與可維護性

```
Week 21-24: 分佈式追蹤（Issue 2.1）
  ├─ 自動追蹤儀器化
  ├─ Satellite 間追蹤
  └─ Jaeger/Zipkin 集成

Week 25-28: 快取層優化（Issue 3.1）
  ├─ 二級快取（本地 + Redis）
  ├─ 快取預熱機制
  └─ 事件驅動失效

Week 28+: 事件溯源（Issue 3.2）
  ├─ Event Store 實現
  ├─ 狀態重構機制
  └─ 審計日誌系統
```

---

## 📋 對 Gravito 框架的總體評價

### 優勢 ⭐⭐⭐⭐⭐

✅ **Satellite 架構設計優秀**
- 高內聚、低耦合
- 易於擴展和測試
- 適合微服務應用

✅ **事件系統易用直觀**
- Hooks 模式簡潔
- 跨 Satellite 通訊清晰
- 基礎功能完善

✅ **TypeScript 支持完善**
- 類型安全
- 開發體驗好
- 編譯檢查嚴格

✅ **整體架構合理**
- 依賴注入完整
- 生命週期管理好
- 配置靈活

### 改進空間 ⭐⭐

❌ **高併發場景還需優化**
- Event System 同步派發瓶頸
- 連接池管理不夠自適應
- 缺少內置容錯機制

❌ **可觀測性工具不足**
- 無內置分佈式追蹤
- 監控指標曝露不完整
- 性能診斷工具缺乏

❌ **分佈式特性支持不完整**
- 無內置分佈式鎖
- 無限流熔斷機制
- 無事件溯源支持

---

## 💡 最終建議

### 對 Gravito 框架團隊

1. **優先處理 Event System 性能**
   - 這是最常見的瓶頸
   - 影響所有 Satellite 應用
   - 改造難度相對較小

2. **建立內置分佈式工具庫**
   - `@gravito/distributed-lock`
   - `@gravito/rate-limiter`
   - `@gravito/circuit-breaker`

3. **集成分佈式追蹤**
   - OpenTelemetry 集成
   - 自動儀器化
   - 內置 Jaeger/Zipkin 支持

4. **加強文檔和示例**
   - 高併發場景最佳實踐
   - 性能調優指南
   - 故障排除手冊

### 對使用 Gravito 的開發者

1. **做好準備**
   - 高併發應用提前測試
   - 準備降級方案
   - 監控告警配置充分

2. **主動優化**
   - 使用快取層減輕負擔
   - 非同步隊列替代 Event
   - 定期性能測試

3. **参與貢獻**
   - 反饋發現的問題
   - 提交改進建議
   - 參與框架優化

---

**評價總結**：

Gravito 是一個優秀的框架，**架構設計先進，基礎功能完善**。但在 **高併發和分佈式** 場景下還需要進一步優化。建議：

- **適用於**：電商搶購、高併發 API、多微服務應用
- **需要改進**：Event System 性能、分佈式工具、可觀測性
- **綜合評分**：⭐⭐⭐⭐ (4/5)

---

**最後更新**：2026-02-02
**版本**：1.0
**撰寫者**：搶購系統開發團隊
