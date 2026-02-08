# Bull Queue 整合指南

Gravito Core 支持與 Bull Queue 無縫集成，實現高性能、持久化的分佈式事件隊列。本指南將幫助您快速上手。

## 📋 目錄

- [快速開始](#快速開始)
- [配置詳解](#配置詳解)
- [API 參考](#api-參考)
- [最佳實踐](#最佳實踐)
- [故障排除](#故障排除)

---

## 快速開始

### 1. 安裝依賴

```bash
bun add bull redis ioredis
bun add -d @types/bull
```

### 2. 配置 Bull Queue 適配器

```typescript
import { PlanetCore } from '@gravito/core'
import { BullQueueAdapter } from '@gravito/core'

const core = await PlanetCore.boot({
  config: { APP_NAME: 'MyApp' },
  orbits: [],
  // 其他配置...
})

// 配置 Bull Queue 適配器
const bullAdapter = new BullQueueAdapter({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD,
  },
  queueName: 'gravito-events',
  concurrency: 4,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
  },
  enableMetrics: true,
  enableLogging: true,
})

// 將適配器與 EventPriorityQueue 整合
core.container.get(EventPriorityQueue).useBullQueueBackend({
  bullAdapter,
  // 其他配置
})
```

### 3. 使用隊列

```typescript
import { HookManager } from '@gravito/core'

const hookManager = core.container.get(HookManager)

// 標準事件分發（自動持久化到 Bull Queue）
await hookManager.dispatch('user.created', { userId: 123 })

// 延遲分發
await hookManager.dispatchQueued('order.submitted',
  { orderId: 456 },
  { delay: 5000 }
)

// 查詢事件狀態
const status = await core.container
  .get(MessageQueueBridge)
  .getEventStatus('job-123')
```

---

## 配置詳解

### BullQueueAdapterConfig 完整選項

```typescript
interface BullQueueAdapterConfig {
  // Redis 連接配置
  redis: {
    host: string        // Redis 主機（預設：localhost）
    port: number        // Redis 端口（預設：6379）
    password?: string   // Redis 密碼（可選）
    db?: number         // Redis 數據庫索引（預設：0）
  }

  // 隊列配置
  queueName: string     // 隊列名稱（預設：gravito-queue）
  jobPrefix?: string    // 任務 ID 前綴（預設：gravito）

  // 性能設置
  concurrency?: number  // 並發處理任務數（預設：1）
  defaultJobOptions?: {
    attempts?: number   // 重試次數（預設：3）
    backoff?: {
      type: 'exponential' | 'fixed'
      delay: number     // 延遲時間（ms，預設：2000）
    }
    removeOnComplete?: boolean  // 完成後刪除（預設：true）
    removeOnFail?: boolean      // 失敗後刪除（預設：false）
  }

  // 監控配置
  enableMetrics?: boolean   // 啟用指標收集（預設：true）
  enableLogging?: boolean   // 啟用日誌輸出（預設：false）
}
```

### 環境變數配置

建議在 `.env` 中配置：

```env
# Redis 連接
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# Bull Queue 配置
QUEUE_NAME=gravito-events
QUEUE_CONCURRENCY=4
QUEUE_ATTEMPTS=3
QUEUE_BACKOFF_DELAY=2000

# 日誌與監控
ENABLE_QUEUE_LOGGING=true
ENABLE_QUEUE_METRICS=true
```

---

## API 參考

### BullQueueAdapter 類

#### 方法

##### `enqueue(task: EventTask): Promise<string>`

入隊一個事件任務。

```typescript
const jobId = await adapter.enqueue({
  id: 'evt-123',
  eventName: 'user.created',
  args: [{ userId: 123, email: 'user@example.com' }],
  priority: 'high',
  options: { retryCount: 0 },
})

console.log(`Job ${jobId} queued`)
```

**返回值**：任務 ID（可用於查詢狀態）

---

##### `dequeue(): Promise<EventTask | undefined>`

出隊下一個待處理任務。

```typescript
const task = await adapter.dequeue()

if (task) {
  console.log(`Processing task: ${task.eventName}`)
  // 處理任務...
}
```

**返回值**：EventTask 或 undefined（隊列為空時）

---

##### `acknowledgeCompletion(jobId: string): Promise<void>`

確認任務完成。

```typescript
try {
  // 處理任務...
  await adapter.acknowledgeCompletion(jobId)
} catch (error) {
  await adapter.acknowledgeFailure(jobId, error as Error)
}
```

---

##### `acknowledgeFailure(jobId: string, error: Error): Promise<void>`

確認任務失敗（觸發重試或 DLQ）。

```typescript
await adapter.acknowledgeFailure(jobId, new Error('Processing failed'))
```

---

##### `getQueueStats(): Promise<QueueStats>`

獲取隊列統計信息。

```typescript
const stats = await adapter.getQueueStats()

console.log(`
  Queue Depth: ${stats.depth}
  Processing: ${stats.processing}
  Completed: ${stats.completed}
  Failed: ${stats.failed}
`)
```

---

##### `getPendingJobs(): Promise<BulkJobInfo[]>`

獲取所有待處理任務列表。

```typescript
const jobs = await adapter.getPendingJobs()

for (const job of jobs) {
  console.log(`Job ${job.id}: ${job.data.eventName} (priority: ${job.data.priority})`)
}
```

---

### HookManager 擴展方法

#### `dispatchQueued(event: string, args: any[], options?: DispatchOptions): Promise<string>`

通過 Bull Queue 分發事件（異步）。

```typescript
const jobId = await hookManager.dispatchQueued('user.updated', [userData], {
  priority: 'high',
  delay: 1000,
})

console.log(`Job ${jobId} queued for async processing`)
```

---

#### `dispatchDeferredQueued(event: string, args: any[], delay: number, options?: DispatchOptions): Promise<string>`

延遲隊列分發事件。

```typescript
// 在 5 分鐘後處理
await hookManager.dispatchDeferredQueued(
  'email.send',
  [{ to: 'user@example.com' }],
  5 * 60 * 1000
)
```

---

### MessageQueueBridge 類

#### `processQueuedEvent(jobId: string, task: EventTask): Promise<void>`

手動處理隊列中的事件。

```typescript
await bridge.processQueuedEvent(jobId, task)
```

---

#### `getEventStatus(eventId: string): Promise<EventStatus>`

查詢事件處理狀態。

```typescript
const status = await bridge.getEventStatus(jobId)

if (status.state === 'completed') {
  console.log('Event processed successfully')
} else if (status.state === 'failed') {
  console.error(`Event failed: ${status.error}`)
}
```

---

## 最佳實踐

### 1. 優先級管理

為不同事件設置合理的優先級：

```typescript
// 高優先級：用戶認證相關
await hookManager.dispatchQueued('auth.login', [data], { priority: 'high' })

// 普通優先級：業務邏輯
await hookManager.dispatchQueued('order.created', [data], { priority: 'normal' })

// 低優先級：非關鍵操作
await hookManager.dispatchQueued('analytics.track', [data], { priority: 'low' })
```

### 2. 重試策略

配置適當的重試機制：

```typescript
const config = {
  defaultJobOptions: {
    attempts: 5,  // 最多重試 5 次
    backoff: {
      type: 'exponential',
      delay: 2000,  // 首次延遲 2s，後續指數增長
    },
    removeOnComplete: true,
    removeOnFail: false,  // 保留失敗任務用於分析
  },
}
```

### 3. 監控與告警

啟用 QueueDashboard 進行實時監控：

```typescript
import { QueueDashboard } from '@gravito/core'

const dashboard = new QueueDashboard({
  eventQueue: core.container.get(EventPriorityQueue),
  workerPool: core.container.get(WorkerPool),
  dlq: core.container.get(DeadLetterQueue),
  hookManager: core.container.get(HookManager),
})

// 定期檢查隊列深度
setInterval(() => {
  const metrics = dashboard.getQueueMetrics()

  if (metrics.backpressure.state === 'CRITICAL') {
    // 觸發告警
    console.error('⚠️  Queue backpressure CRITICAL!')
  }
}, 5000)
```

### 4. 定期清理

清理已完成的任務以節省存儲空間：

```typescript
// 每天凌晨 2 點清理 7 天前的任務
const rule = '0 2 * * *'  // Cron 表達式

schedule(rule, async () => {
  const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000
  await adapter.cleanCompletedJobs(cutoffTime)
})
```

### 5. 優雅關閉

確保應用關閉時隊列被正確清理：

```typescript
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...')

  // 停止接收新任務
  await hookManager.pause()

  // 等待現有任務完成
  await core.container.get(WorkerPool).stop()

  // 關閉 Bull Queue 連接
  await adapter.close()

  process.exit(0)
})
```

---

## 故障排除

### 問題 1：Redis 連接失敗

**症狀**：`Error: connect ECONNREFUSED 127.0.0.1:6379`

**解決方案**：

```bash
# 確認 Redis 運行中
redis-cli ping  # 應返回 PONG

# 檢查連接配置
echo $REDIS_HOST $REDIS_PORT
```

### 問題 2：任務無限重試

**症狀**：任務持續重試，從不成功或進入 DLQ

**檢查清單**：

1. 確認 Redis 中的重試次數設置：
```typescript
const jobOptions = config.defaultJobOptions
console.log(`Max attempts: ${jobOptions.attempts}`)
```

2. 檢查任務處理器是否拋出異常：
```typescript
hookManager.addAction('user.created', async (data) => {
  if (!data.email) {
    throw new Error('Email required')  // 會觸發重試
  }
})
```

3. 使用 DLQ 查詢失敗原因：
```typescript
const dlqEntries = dlq.list({ limit: 10 })
for (const entry of dlqEntries) {
  console.log(`Event: ${entry.eventName}, Error: ${entry.error}`)
}
```

### 問題 3：隊列堵塞（背壓）

**症狀**：`backpressure.state === 'CRITICAL'`

**解決方案**：

```typescript
// 1. 增加並發數
const config = {
  concurrency: 8,  // 從 4 增加到 8
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
}

// 2. 啟用自動擴容
const pool = new WorkerPool({
  enableAutoScaling: true,
  minWorkers: 2,
  maxWorkers: 16,
  scaleUpThreshold: 0.7,
  scaleDownThreshold: 0.3,
})

// 3. 檢查慢處理任務
const metrics = dashboard.getWorkerMetrics()
const slowWorkers = metrics.workers.filter(w => w.avgDurationMs > 1000)
console.log(`Slow workers: ${slowWorkers.length}`)
```

### 問題 4：內存洩漏

**症狀**：進程內存不斷增長

**檢查點**：

```typescript
// 確保已完成的任務被刪除
const config = {
  defaultJobOptions: {
    removeOnComplete: true,  // 必須設置為 true
    removeOnFail: false,     // 失敗任務保留以分析
  },
}

// 定期檢查隊列大小
setInterval(async () => {
  const stats = await adapter.getQueueStats()
  console.log(`Queue depth: ${stats.depth}`)

  if (stats.depth > 100000) {
    console.warn('⚠️  Queue getting too large!')
  }
}, 60000)
```

### 問題 5：任務重複處理

**症狀**：同一任務被處理多次

**原因**：worker 在確認完成前崩潰

**解決方案**：

```typescript
// 使用自動確認（推薦）
const task = await adapter.dequeue()

try {
  await processTask(task)
  await adapter.acknowledgeCompletion(task.id)  // 自動確認
} catch (error) {
  await adapter.acknowledgeFailure(task.id, error)
}

// 設置合理的任務超時
const config = {
  taskTimeout: 30000,  // 30 秒內必須完成
}
```

---

## 進階主題

### 自定義事件優先級策略

```typescript
const strategy = {
  getPriority(eventName: string): 'high' | 'normal' | 'low' {
    if (eventName.startsWith('auth.') || eventName.startsWith('payment.')) {
      return 'high'
    }
    if (eventName.startsWith('analytics.') || eventName.startsWith('log.')) {
      return 'low'
    }
    return 'normal'
  },
}

// 在分發時應用
await hookManager.dispatchQueued(eventName, args, {
  priority: strategy.getPriority(eventName),
})
```

### 與監控系統集成

```typescript
import { getOpenTelemetrySDK } from '@gravito/core'

const meter = getOpenTelemetrySDK().getMeter('gravito-queue')

// 自定義指標
const queueDepthGauge = meter.createObservableGauge('custom_queue_depth')
queueDepthGauge.addCallback(async (result) => {
  const stats = await adapter.getQueueStats()
  result.observe(stats.depth)
})
```

---

## 更多資源

- [Bull Queue 官方文檔](https://docs.bullmq.io/)
- [EventPriorityQueue API](../packages/core/src/events/EventPriorityQueue.ts)
- [MessageQueueBridge 源碼](../packages/core/src/events/MessageQueueBridge.ts)
- [背壓管理器指南](./CIRCUIT_BREAKER_GUIDE.md)

---

**最後更新**：2026-02-07
**維護者**：Gravito 開發團隊
