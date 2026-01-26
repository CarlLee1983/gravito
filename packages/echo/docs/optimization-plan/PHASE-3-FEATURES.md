# Phase 3: 功能增強

> 新增企業級功能：持久化、批量處理、死信隊列

## 概述

本階段將擴展 Echo 的核心功能，加入企業環境中常見的 Webhook 處理需求，包括事件持久化、批量發送、死信隊列（DLQ）與事件重放能力。

## 功能清單

| 功能 | 說明 | 優先級 |
|------|------|--------|
| 持久化層 | 儲存 Webhook 事件與傳送紀錄 | P0 |
| 批量發送 | 一次發送多個 Webhook | P0 |
| 死信隊列 | 處理失敗事件的隔離區 | P1 |
| 事件重放 | 重新發送歷史 Webhook | P1 |
| 速率限制 | 控制發送頻率 | P2 |

## 3.1 持久化層

### 設計目標

- 可插拔的儲存後端
- 支援常見資料庫（Redis、SQLite、PostgreSQL）
- 記錄接收與發送的完整歷程

### 介面設計

```typescript
/**
 * Webhook 事件儲存介面
 */
export interface WebhookStore {
  /**
   * 儲存接收的 Webhook 事件
   */
  saveIncomingEvent(event: IncomingWebhookRecord): Promise<string>

  /**
   * 儲存發送的 Webhook 紀錄
   */
  saveOutgoingEvent(event: OutgoingWebhookRecord): Promise<string>

  /**
   * 更新發送嘗試紀錄
   */
  updateDeliveryAttempt(id: string, attempt: DeliveryAttempt): Promise<void>

  /**
   * 取得事件詳情
   */
  getEvent(id: string): Promise<WebhookRecord | null>

  /**
   * 查詢事件
   */
  queryEvents(filter: EventQueryFilter): Promise<WebhookRecord[]>

  /**
   * 標記事件為已處理
   */
  markProcessed(id: string): Promise<void>

  /**
   * 標記事件為失敗
   */
  markFailed(id: string, error: string): Promise<void>
}

/**
 * 接收的 Webhook 紀錄
 */
export interface IncomingWebhookRecord {
  id?: string
  provider: string
  eventType: string
  payload: unknown
  headers: Record<string, string | undefined>
  rawBody: string
  receivedAt: Date
  status: 'pending' | 'processed' | 'failed'
  processingError?: string
}

/**
 * 發送的 Webhook 紀錄
 */
export interface OutgoingWebhookRecord {
  id?: string
  url: string
  event: string
  payload: unknown
  createdAt: Date
  status: 'pending' | 'delivered' | 'failed'
  attempts: DeliveryAttempt[]
}

/**
 * 傳送嘗試紀錄
 */
export interface DeliveryAttempt {
  attemptNumber: number
  timestamp: Date
  statusCode?: number
  responseBody?: string
  error?: string
  duration: number
}

/**
 * 事件查詢過濾器
 */
export interface EventQueryFilter {
  direction?: 'incoming' | 'outgoing'
  provider?: string
  eventType?: string
  status?: string
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}
```

### 記憶體儲存實作

```typescript
/**
 * 記憶體儲存實作（開發/測試用）
 */
export class MemoryWebhookStore implements WebhookStore {
  private events = new Map<string, WebhookRecord>()

  async saveIncomingEvent(event: IncomingWebhookRecord): Promise<string> {
    const id = event.id ?? crypto.randomUUID()
    this.events.set(id, { ...event, id, direction: 'incoming' })
    return id
  }

  async saveOutgoingEvent(event: OutgoingWebhookRecord): Promise<string> {
    const id = event.id ?? crypto.randomUUID()
    this.events.set(id, { ...event, id, direction: 'outgoing' })
    return id
  }

  async updateDeliveryAttempt(id: string, attempt: DeliveryAttempt): Promise<void> {
    const event = this.events.get(id)
    if (event && event.direction === 'outgoing') {
      const outgoing = event as OutgoingWebhookRecord & { direction: 'outgoing' }
      outgoing.attempts.push(attempt)
    }
  }

  async getEvent(id: string): Promise<WebhookRecord | null> {
    return this.events.get(id) ?? null
  }

  async queryEvents(filter: EventQueryFilter): Promise<WebhookRecord[]> {
    let results = Array.from(this.events.values())

    if (filter.direction) {
      results = results.filter(e => e.direction === filter.direction)
    }
    if (filter.provider) {
      results = results.filter(e =>
        'provider' in e && e.provider === filter.provider
      )
    }
    if (filter.status) {
      results = results.filter(e => e.status === filter.status)
    }
    if (filter.from) {
      results = results.filter(e => {
        const date = 'receivedAt' in e ? e.receivedAt : e.createdAt
        return date >= filter.from!
      })
    }
    if (filter.to) {
      results = results.filter(e => {
        const date = 'receivedAt' in e ? e.receivedAt : e.createdAt
        return date <= filter.to!
      })
    }

    results.sort((a, b) => {
      const dateA = 'receivedAt' in a ? a.receivedAt : a.createdAt
      const dateB = 'receivedAt' in b ? b.receivedAt : b.createdAt
      return dateB.getTime() - dateA.getTime()
    })

    const offset = filter.offset ?? 0
    const limit = filter.limit ?? 100

    return results.slice(offset, offset + limit)
  }

  async markProcessed(id: string): Promise<void> {
    const event = this.events.get(id)
    if (event) {
      event.status = 'processed'
    }
  }

  async markFailed(id: string, error: string): Promise<void> {
    const event = this.events.get(id)
    if (event) {
      event.status = 'failed'
      if ('processingError' in event) {
        event.processingError = error
      }
    }
  }
}
```

### 整合至 WebhookReceiver

```typescript
export class WebhookReceiver {
  private store?: WebhookStore

  /**
   * 設定儲存後端
   */
  setStore(store: WebhookStore): this {
    this.store = store
    return this
  }

  async handle(/* ... */): Promise<WebhookVerificationResult & { handled: boolean }> {
    // ... 既有邏輯 ...

    // 儲存事件（如果有設定 store）
    let eventId: string | undefined
    if (this.store) {
      eventId = await this.store.saveIncomingEvent({
        provider: providerName,
        eventType: result.eventType ?? 'unknown',
        payload: result.payload,
        headers: Object.fromEntries(
          Object.entries(headers).map(([k, v]) =>
            [k, Array.isArray(v) ? v[0] : v]
          )
        ),
        rawBody: typeof body === 'string' ? body : body.toString('utf-8'),
        receivedAt: new Date(),
        status: 'pending',
      })
    }

    try {
      // ... 處理事件 ...

      if (this.store && eventId) {
        await this.store.markProcessed(eventId)
      }
    } catch (error) {
      if (this.store && eventId) {
        await this.store.markFailed(eventId, String(error))
      }
      throw error
    }

    return { ...result, handled, eventId }
  }
}
```

## 3.2 批量發送

### 設計目標

- 支援一次發送多個 Webhook
- 並行處理以提升效能
- 可設定並行度上限

### 介面設計

```typescript
export interface BatchDispatchOptions {
  /** 最大並行數量，預設 5 */
  concurrency?: number
  /** 是否在首個失敗時停止，預設 false */
  stopOnFirstFailure?: boolean
}

export interface BatchDispatchResult {
  /** 總數 */
  total: number
  /** 成功數 */
  succeeded: number
  /** 失敗數 */
  failed: number
  /** 各項結果 */
  results: Array<{
    payload: WebhookPayload
    result: WebhookDeliveryResult
  }>
}
```

### 實作

```typescript
export class WebhookDispatcher {
  /**
   * 批量發送 Webhook
   */
  async dispatchBatch<T = unknown>(
    payloads: WebhookPayload<T>[],
    options: BatchDispatchOptions = {}
  ): Promise<BatchDispatchResult> {
    const concurrency = options.concurrency ?? 5
    const stopOnFirstFailure = options.stopOnFirstFailure ?? false

    const results: BatchDispatchResult['results'] = []
    let succeeded = 0
    let failed = 0
    let stopped = false

    // 使用 chunk 處理以控制並行度
    for (let i = 0; i < payloads.length && !stopped; i += concurrency) {
      const chunk = payloads.slice(i, i + concurrency)

      const chunkResults = await Promise.all(
        chunk.map(async (payload) => {
          if (stopped) {
            return {
              payload,
              result: {
                success: false,
                attempt: 0,
                duration: 0,
                deliveredAt: new Date(),
                error: 'Batch dispatch stopped',
              } as WebhookDeliveryResult,
            }
          }

          const result = await this.dispatch(payload)

          if (result.success) {
            succeeded++
          } else {
            failed++
            if (stopOnFirstFailure) {
              stopped = true
            }
          }

          return { payload, result }
        })
      )

      results.push(...chunkResults)
    }

    return {
      total: payloads.length,
      succeeded,
      failed,
      results,
    }
  }
}
```

## 3.3 死信隊列（DLQ）

### 設計目標

- 隔離重試失敗的事件
- 支援手動重試
- 提供查詢介面

### 介面設計

```typescript
/**
 * 死信隊列介面
 */
export interface DeadLetterQueue {
  /**
   * 加入失敗事件
   */
  enqueue(event: DeadLetterEvent): Promise<string>

  /**
   * 取得待處理事件
   */
  peek(limit?: number): Promise<DeadLetterEvent[]>

  /**
   * 移除已處理事件
   */
  dequeue(id: string): Promise<void>

  /**
   * 取得佇列長度
   */
  size(): Promise<number>

  /**
   * 清空佇列
   */
  clear(): Promise<void>
}

/**
 * 死信事件
 */
export interface DeadLetterEvent {
  id?: string
  type: 'incoming' | 'outgoing'
  originalEvent: IncomingWebhookRecord | OutgoingWebhookRecord
  failureReason: string
  failedAt: Date
  retryCount: number
  lastRetryAt?: Date
}
```

### 記憶體 DLQ 實作

```typescript
export class MemoryDeadLetterQueue implements DeadLetterQueue {
  private queue = new Map<string, DeadLetterEvent>()

  async enqueue(event: DeadLetterEvent): Promise<string> {
    const id = event.id ?? crypto.randomUUID()
    this.queue.set(id, { ...event, id })
    return id
  }

  async peek(limit = 10): Promise<DeadLetterEvent[]> {
    return Array.from(this.queue.values())
      .sort((a, b) => a.failedAt.getTime() - b.failedAt.getTime())
      .slice(0, limit)
  }

  async dequeue(id: string): Promise<void> {
    this.queue.delete(id)
  }

  async size(): Promise<number> {
    return this.queue.size
  }

  async clear(): Promise<void> {
    this.queue.clear()
  }
}
```

### 整合至 Dispatcher

```typescript
export class WebhookDispatcher {
  private dlq?: DeadLetterQueue
  private store?: WebhookStore

  /**
   * 設定死信隊列
   */
  setDeadLetterQueue(dlq: DeadLetterQueue): this {
    this.dlq = dlq
    return this
  }

  async dispatch<T = unknown>(payload: WebhookPayload<T>): Promise<WebhookDeliveryResult> {
    const result = await this.dispatchInternal(payload)

    // 重試失敗後加入 DLQ
    if (!result.success && this.dlq && result.attempt >= this.retryConfig.maxAttempts) {
      await this.dlq.enqueue({
        type: 'outgoing',
        originalEvent: {
          url: payload.url,
          event: payload.event,
          payload: payload.data,
          createdAt: new Date(),
          status: 'failed',
          attempts: [], // 會由 store 追蹤
        },
        failureReason: result.error ?? 'Unknown error',
        failedAt: new Date(),
        retryCount: result.attempt,
      })
    }

    return result
  }

  /**
   * 重試 DLQ 中的事件
   */
  async retryFromDlq(id: string): Promise<WebhookDeliveryResult | null> {
    if (!this.dlq) return null

    const events = await this.dlq.peek(100)
    const event = events.find(e => e.id === id)

    if (!event || event.type !== 'outgoing') return null

    const outgoing = event.originalEvent as OutgoingWebhookRecord
    const result = await this.dispatch({
      url: outgoing.url,
      event: outgoing.event,
      data: outgoing.payload,
    })

    if (result.success) {
      await this.dlq.dequeue(id)
    } else {
      // 更新重試次數
      event.retryCount++
      event.lastRetryAt = new Date()
    }

    return result
  }
}
```

## 3.4 事件重放

### 設計目標

- 重新發送歷史 Webhook 事件
- 支援按條件篩選重放
- 提供乾跑模式

### 介面設計

```typescript
export interface ReplayOptions {
  /** 事件 ID 列表 */
  eventIds?: string[]
  /** 時間範圍篩選 */
  timeRange?: {
    from: Date
    to: Date
  }
  /** Provider 篩選 */
  provider?: string
  /** 事件類型篩選 */
  eventType?: string
  /** 乾跑模式（不實際發送） */
  dryRun?: boolean
  /** 新目標 URL（可選） */
  targetUrl?: string
}

export interface ReplayResult {
  total: number
  replayed: number
  skipped: number
  failed: number
  events: Array<{
    eventId: string
    status: 'replayed' | 'skipped' | 'failed'
    result?: WebhookDeliveryResult
    error?: string
  }>
}
```

### 實作

```typescript
export class WebhookReplayService {
  constructor(
    private store: WebhookStore,
    private dispatcher: WebhookDispatcher
  ) {}

  async replay(options: ReplayOptions): Promise<ReplayResult> {
    // 查詢符合條件的事件
    const events = await this.store.queryEvents({
      direction: 'outgoing',
      provider: options.provider,
      eventType: options.eventType,
      from: options.timeRange?.from,
      to: options.timeRange?.to,
    })

    // 如果有指定 ID，過濾出這些事件
    const targetEvents = options.eventIds
      ? events.filter(e => options.eventIds!.includes(e.id!))
      : events

    const result: ReplayResult = {
      total: targetEvents.length,
      replayed: 0,
      skipped: 0,
      failed: 0,
      events: [],
    }

    for (const event of targetEvents) {
      if (event.direction !== 'outgoing') {
        result.skipped++
        result.events.push({
          eventId: event.id!,
          status: 'skipped',
          error: 'Not an outgoing event',
        })
        continue
      }

      const outgoing = event as OutgoingWebhookRecord

      if (options.dryRun) {
        result.replayed++
        result.events.push({
          eventId: event.id!,
          status: 'replayed',
        })
        continue
      }

      try {
        const dispatchResult = await this.dispatcher.dispatch({
          url: options.targetUrl ?? outgoing.url,
          event: outgoing.event,
          data: outgoing.payload,
        })

        if (dispatchResult.success) {
          result.replayed++
          result.events.push({
            eventId: event.id!,
            status: 'replayed',
            result: dispatchResult,
          })
        } else {
          result.failed++
          result.events.push({
            eventId: event.id!,
            status: 'failed',
            result: dispatchResult,
            error: dispatchResult.error,
          })
        }
      } catch (error) {
        result.failed++
        result.events.push({
          eventId: event.id!,
          status: 'failed',
          error: String(error),
        })
      }
    }

    return result
  }
}
```

## 設定整合

### OrbitEcho 設定擴展

```typescript
export interface EchoConfig {
  // ... 既有設定 ...

  /** 持久化儲存 */
  store?: WebhookStore

  /** 死信隊列 */
  deadLetterQueue?: DeadLetterQueue

  /** 批量發送預設設定 */
  batch?: BatchDispatchOptions
}
```

### 使用範例

```typescript
import {
  OrbitEcho,
  MemoryWebhookStore,
  MemoryDeadLetterQueue,
} from '@gravito/echo'

const echo = new OrbitEcho({
  providers: {
    stripe: { name: 'stripe', secret: process.env.STRIPE_WEBHOOK_SECRET! },
  },
  dispatcher: {
    secret: process.env.OUTGOING_WEBHOOK_SECRET!,
  },
  store: new MemoryWebhookStore(),
  deadLetterQueue: new MemoryDeadLetterQueue(),
})

core.install(echo)

// 批量發送
const dispatcher = echo.getDispatcher()
const result = await dispatcher.dispatchBatch([
  { url: 'https://a.com/webhook', event: 'order.created', data: { id: 1 } },
  { url: 'https://b.com/webhook', event: 'order.created', data: { id: 2 } },
], { concurrency: 2 })
```

## 檔案結構

```
src/
├── storage/
│   ├── WebhookStore.ts          # 介面定義
│   ├── MemoryWebhookStore.ts    # 記憶體實作
│   └── index.ts
├── dlq/
│   ├── DeadLetterQueue.ts       # DLQ 介面
│   ├── MemoryDeadLetterQueue.ts # 記憶體實作
│   └── index.ts
├── replay/
│   ├── WebhookReplayService.ts  # 重放服務
│   └── index.ts
├── send/
│   ├── WebhookDispatcher.ts     # 更新：加入批量發送
│   └── index.ts
└── ...
```

## 成功標準

- [ ] 實作 `WebhookStore` 介面與記憶體實作
- [ ] 實作批量發送功能
- [ ] 實作 `DeadLetterQueue` 介面與記憶體實作
- [ ] 實作事件重放服務
- [ ] 所有新功能測試覆蓋率 90%+
- [ ] 更新 README 文檔
- [ ] 新功能皆為可選，不影響既有使用

## 風險評估

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|---------|
| 記憶體使用過高 | 中 | 中 | 記憶體實作加入上限設定 |
| 批量處理效能 | 中 | 低 | 可配置並行度 |
| API 複雜度增加 | 低 | 中 | 所有新功能可選，維持簡單預設 |

---

**下一階段**: [Phase 4: 可觀測性](./PHASE-4-OBSERVABILITY.md)
