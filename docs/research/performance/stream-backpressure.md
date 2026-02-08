# 流處理與背壓機制

## 1. 背景 (Background)

### 1.1 為什麼需要背壓？

在高吞吐量的系統中，消費者可能處理速度慢於生產者，導致：
- 內存堆積（未處理的消息）
- OOM（Out of Memory）崩潰
- 系統響應緩慢

背壓（Backpressure）是解決此問題的機制。

### 1.2 Gravito 的流處理系統

Gravito 使用 **Stream** 包（基於 BullMQ）實現：
- 非同步任務隊列
- 優先級隊列
- 背壓機制
- 自動重試

---

## 2. 背壓基本概念 (Backpressure Basics)

### 2.1 什麼是背壓？

背壓是讓生產者速度適應消費者處理能力的機制：

```
無背壓（有問題）：
生產者：[生成 1000 條消息] → 隊列 → 消費者：[每秒處理 10 條]
        └─────────────────────────┴───────────────────────┘
                          內存堆積 990 條！

有背壓（正常）：
生產者：[等待...等待...生成 10 條] → 隊列 → 消費者：[處理 10 條]
        └─ 不要發送，消費者忙著────────────────────────┘
```

### 2.2 背壓信號

```typescript
// 背壓工作流
Producer → 檢查隊列深度 → 如果隊列已滿：
                          ├─ 暫停（await）
                          └─ 等待消費者處理
                        → 如果隊列未滿：
                          └─ 繼續生成並發送
```

---

## 3. BullMQ 中的背壓 (Backpressure in BullMQ)

### 3.1 隊列配置

```typescript
import { Queue, Worker } from 'bullmq'
import { redis } from '@gravito/core'

// 建立隊列
const orderQueue = new Queue('orders', {
  connection: redis.getConnection(),
  defaultJobOptions: {
    attempts: 3,           // 失敗重試 3 次
    backoff: {
      type: 'exponential',
      delay: 2000            // 指數退避：2s, 4s, 8s...
    },
    removeOnComplete: true  // 完成後移除
  }
})

// 配置背壓
const workerOptions = {
  connection: redis.getConnection(),
  concurrency: 5,  // 同時處理 5 個任務
  // 當隊列深度超過此值時，自動應用背壓
  maxStalledCount: 10
}
```

### 3.2 生產者側背壓

```typescript
// 新增任務時檢查隊列深度
async function addOrderTask(order: Order): Promise<void> {
  // 檢查隊列深度
  const size = await orderQueue.count()

  // 如果隊列過深，暫停
  if (size > 1000) {
    // 等待隊列消耗
    await new Promise(resolve => {
      const interval = setInterval(async () => {
        const newSize = await orderQueue.count()
        if (newSize < 500) {
          clearInterval(interval)
          resolve(undefined)
        }
      }, 1000)
    })
  }

  // 新增任務
  await orderQueue.add('process', order, {
    priority: order.urgent ? 1 : 10  // 優先級
  })
}
```

### 3.3 消費者側背壓

```typescript
// Worker 自動處理背壓
const orderWorker = new Worker('orders', async (job) => {
  // 模擬長時間操作
  console.log(`Processing order ${job.data.orderId}`)
  await processOrder(job.data)

  return { success: true }
}, workerOptions)

// 監聽隊列事件
orderWorker.on('completed', (job) => {
  console.log(`Order ${job.id} completed`)
})

orderWorker.on('failed', (job, error) => {
  console.error(`Order ${job.id} failed:`, error.message)
})

orderWorker.on('stalled', (jobId) => {
  console.warn(`Order ${jobId} stalled (background job not completing)`)
})
```

---

## 4. 隊列深度監控 (Queue Depth Monitoring)

### 4.1 監測隊列狀態

```typescript
// 定期檢查隊列深度
setInterval(async () => {
  const waitingCount = await orderQueue.getWaitingCount()
  const activeCount = await orderQueue.getActiveCount()
  const completedCount = await orderQueue.getCompletedCount()
  const failedCount = await orderQueue.getFailedCount()

  console.log(`Queue Status:
    Waiting: ${waitingCount}
    Active: ${activeCount}
    Completed: ${completedCount}
    Failed: ${failedCount}
  `)

  // 告警：隊列堆積
  if (waitingCount > 5000) {
    logger.error('Queue backlog exceeds 5000 items!')
    // 可觸發告警或自動擴展
  }
}, 10000)
```

### 4.2 隊列深度回調

```typescript
import { EventMetrics } from '@gravito/core'

const metrics = new EventMetrics()

// 當隊列深度超過閾值時回調
metrics.onQueueDepth((depth) => {
  if (depth > 1000) {
    // 隊列深度警告
    logger.warn(`High queue depth: ${depth}`)

    // 可觸發動態擴展
    if (depth > 5000) {
      spawnAdditionalWorkers(5)  // 增加 5 個 Worker
    }
  }
})
```

---

## 5. 背壓實踐模式 (Backpressure Patterns)

### 5.1 主動背壓

```typescript
// 生產者主動檢查並等待
async function produceWithBackpressure<T>(
  items: T[],
  queue: Queue,
  maxQueueDepth: number = 1000
): Promise<void> {
  for (const item of items) {
    // 檢查隊列深度
    const depth = await queue.count()

    if (depth >= maxQueueDepth) {
      // 背壓：等待隊列消耗
      console.log(`Backpressure: waiting for queue to drain (depth: ${depth})`)

      await waitUntil(
        () => queue.count(),
        (count) => count < maxQueueDepth * 0.7,  // 等到 70%
        { maxWait: 60000 }
      )
    }

    // 添加任務
    await queue.add('process', item)
  }
}
```

### 5.2 快速失敗

```typescript
// 替代方案：快速失敗而非等待
async function produceWithFastFail<T>(
  items: T[],
  queue: Queue,
  maxQueueDepth: number = 1000
): Promise<{ succeeded: T[]; failed: T[] }> {
  const succeeded: T[] = []
  const failed: T[] = []

  for (const item of items) {
    const depth = await queue.count()

    if (depth >= maxQueueDepth) {
      // 快速失敗
      failed.push(item)
      continue
    }

    try {
      await queue.add('process', item)
      succeeded.push(item)
    } catch (error) {
      failed.push(item)
    }
  }

  return { succeeded, failed }
}
```

### 5.3 適應性背壓

```typescript
// 根據系統狀態動態調整背壓
class AdaptiveBackpressure {
  private maxDepth: number = 1000

  async addWithAdaptiveBackpressure(item: any, queue: Queue): Promise<void> {
    // 監測系統指標
    const memoryUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal
    const cpuUsage = os.loadavg()[0] / os.cpus().length

    // 根據系統狀態調整背壓閾值
    if (memoryUsage > 0.8) {
      // 內存緊張：降低背壓閾值
      this.maxDepth = 500
    } else if (memoryUsage < 0.5 && cpuUsage < 0.5) {
      // 資源充足：提高背壓閾值
      this.maxDepth = 2000
    } else {
      this.maxDepth = 1000
    }

    // 應用背壓
    let depth = await queue.count()
    while (depth >= this.maxDepth) {
      await sleep(100)
      depth = await queue.count()
    }

    await queue.add('process', item)
  }
}
```

---

## 6. 優先級隊列與背壓 (Priority Queue + Backpressure)

### 6.1 優先級影響背壓

```typescript
// 高優先級任務不受背壓限制
async function addUrgentTask(task: any, queue: Queue): Promise<void> {
  // 高優先級（priority = 1）：總是接受
  await queue.add('process', task, {
    priority: 1,  // 最高優先級
    removeOnComplete: true
  })
}

async function addNormalTask(task: any, queue: Queue): Promise<void> {
  // 普通優先級（priority = 10）：檢查背壓
  const depth = await queue.count()

  if (depth > 1000) {
    throw new Error('Queue full')
  }

  await queue.add('process', task, {
    priority: 10,  // 普通優先級
    removeOnComplete: true
  })
}
```

### 6.2 優先級隊列深度監控

```typescript
// 按優先級追蹤隊列深度
async function getQueueDepthByPriority(queue: Queue) {
  const jobs = await queue.getWaiting()

  const depthByPriority = new Map<number, number>()

  for (const job of jobs) {
    const priority = job.opts.priority || 10
    depthByPriority.set(
      priority,
      (depthByPriority.get(priority) || 0) + 1
    )
  }

  return depthByPriority
}

// 監控：優先級隊列深度
const depthMap = await getQueueDepthByPriority(orderQueue)
for (const [priority, count] of depthMap) {
  console.log(`Priority ${priority}: ${count} jobs`)
}
```

---

## 7. 與 Hooks 系統集成 (Integration with Hooks)

### 7.1 Hooks 背壓

```typescript
// Hook 隊列深度監控
const hookQueue = core.hooks

hookQueue.onQueueDepth((depth) => {
  if (depth > 100) {
    logger.warn(`Hook queue depth: ${depth}`)

    // 可減少新的 hooks 註冊
    if (depth > 500) {
      // 暫停新的非關鍵 hooks
      hookQueue.pause('non-critical')
    }
  }
})
```

### 7.2 優化 Hook 性能

```typescript
// ❌ 低效：Hook 中進行耗時操作
core.hooks.addAction('order:created', async (payload) => {
  // 這會阻塞後續的 hooks
  await slowDatabaseQuery()  // 100ms
  await slowExternalAPI()    // 500ms
})

// ✅ 高效：使用隊列進行耗時操作
core.hooks.addAction('order:created', async (payload) => {
  // 立即返回，異步處理
  await streamQueue.add('process-order', payload)
})

// Worker 在背景處理
const worker = new Worker('stream', async (job) => {
  await slowDatabaseQuery()
  await slowExternalAPI()
})
```

---

## 8. 常見陷阱 (Common Pitfalls)

### 陷阱 1：忽略背壓導致 OOM

```typescript
// ❌ 錯誤：無限新增任務
for (let i = 0; i < 100000; i++) {
  await queue.add('process', { id: i })  // 會堆積在內存中
}

// ✅ 正確：檢查背壓
for (let i = 0; i < 100000; i++) {
  const depth = await queue.count()
  if (depth > 1000) {
    await sleep(1000)  // 等待隊列消耗
  }
  await queue.add('process', { id: i })
}
```

### 陷阱 2：不合理的 concurrency 設置

```typescript
// ❌ 錯誤：設置過高的 concurrency
const worker = new Worker('queue', handler, {
  concurrency: 1000  // 同時 1000 個任務 → OOM
})

// ✅ 正確：根據系統資源設置
const cpuCount = os.cpus().length
const concurrency = cpuCount * 2  // CPU 密集
// 或
const concurrency = 50  // I/O 密集
```

### 陷阱 3：無限重試導致隊列膨脹

```typescript
// ❌ 錯誤：無限重試
const queue = new Queue('jobs', {
  defaultJobOptions: {
    attempts: Infinity  // 永遠重試
  }
})

// ✅ 正確：限制重試次數
const queue = new Queue('jobs', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
})
```

---

## 9. 監測與告警 (Monitoring & Alerts)

### 9.1 設置隊列告警

```typescript
class QueueMonitor {
  constructor(private queue: Queue) {
    this.startMonitoring()
  }

  private startMonitoring(): void {
    setInterval(async () => {
      const depth = await this.queue.count()
      const waiting = await this.queue.getWaitingCount()
      const failed = await this.queue.getFailedCount()

      // 告警條件
      if (depth > 5000) {
        this.alert('CRITICAL', `Queue depth: ${depth}`)
      } else if (depth > 2000) {
        this.alert('WARNING', `Queue depth: ${depth}`)
      }

      if (failed > 100) {
        this.alert('WARNING', `Failed jobs: ${failed}`)
      }
    }, 10000)
  }

  private alert(level: string, message: string): void {
    console.log(`[${level}] ${message}`)
    // 可整合 Prometheus、Datadog 等
  }
}
```

### 9.2 性能指標

```typescript
// 追蹤隊列性能
interface QueueMetrics {
  throughput: number          // 每秒處理數
  avgProcessTime: number      // 平均處理時間（ms）
  failureRate: number         // 失敗率（%）
  p95Latency: number          // 95 分位延遲（ms）
}

function calculateMetrics(queue: Queue): QueueMetrics {
  // 實現細節...
  return {
    throughput: completedPerSecond,
    avgProcessTime: totalDuration / totalJobs,
    failureRate: (failedJobs / totalJobs) * 100,
    p95Latency: calculatePercentile(durations, 0.95)
  }
}
```

---

## 10. 相關文檔與資源

- **[packages/stream/](../../packages/stream/)** - Stream 實現
- **[BullMQ 官方文檔](https://docs.bullmq.io)** - 完整參考
- **[Redis 背壓指南](https://redis.io/commands/client-pause/)** - Redis 特定背壓
- **[ORM 查詢優化](./orm-query-optimization.md)** - 減少隊列壓力

---

**撰寫日期**：2026-02-08
**版本**：1.0
