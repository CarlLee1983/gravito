# Phase 1: Dead Letter Queue + 重試機制

**週期**：Week 7-8
**任務數**：5 個
**技術棧**：Database + Redis + CLI
**預期交付物**：完整的失敗事件管理系統

---

## 📋 任務清單

### ✅ Task 1.2.1.1: 創建 event_dlq 資料表

**檔案**：`packages/atlas/migrations/create_event_dlq_table.ts`

**目標**：
創建持久化存儲失敗事件的數據表

**資料表設計**：

```typescript
// Migration: CreateEventDlqTable
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('event_dlq', (table) => {
    // 主鍵
    table.increments('id').primary()

    // 事件信息
    table.string('dlq_id', 36).unique().notNullable()  // UUID
    table.string('event_name', 255).notNullable()      // order:created
    table.json('event_payload').notNullable()           // 事件負載
    table.json('event_options').nullable()              // 事件選項

    // 重試信息
    table.integer('attempt_count').defaultTo(1)         // 重試次數
    table.integer('max_retries').defaultTo(3)           // 最大重試數
    table.timestamp('next_retry_at').nullable()         // 下次重試時間
    table.json('last_error').nullable()                 // 最後錯誤信息

    // 狀態追蹤
    table.enum('status', ['pending', 'requeued', 'resolved', 'abandoned'])
      .defaultTo('pending')
    table.text('resolution_notes').nullable()           // 解決說明

    // 時間戳
    table.timestamp('failed_at').notNullable()
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())

    // 索引
    table.index('event_name')
    table.index('status')
    table.index('next_retry_at')
    table.index('failed_at')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('event_dlq')
}
```

**數據例子**：

```json
{
  "id": 1,
  "dlq_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_name": "order:created",
  "event_payload": {
    "orderId": "ORD-12345",
    "userId": "USR-67890",
    "amount": 999.99
  },
  "event_options": {
    "priority": "high",
    "retry": { "maxRetries": 3, "backoff": "exponential" }
  },
  "attempt_count": 3,
  "max_retries": 3,
  "status": "pending",
  "last_error": {
    "message": "Service temporarily unavailable",
    "code": "SERVICE_UNAVAILABLE",
    "timestamp": "2026-02-02T12:34:56Z"
  },
  "failed_at": "2026-02-02T12:30:00Z",
  "next_retry_at": "2026-02-02T12:35:00Z"
}
```

**驗收標準**：
- [ ] 資料表結構完整
- [ ] 索引優化正確
- [ ] 列類型合理
- [ ] Migration 可回滾

**估計工作量**：2 小時

---

### ✅ Task 1.2.1.2: 實現 RetryPolicy 邏輯

**檔案**：`packages/core/src/reliability/RetryPolicy.ts`

**目標**：
實現重試策略引擎，支持退避算法

**詳細需求**：

```typescript
interface RetryPolicy {
  maxRetries: number                  // 最大重試次數
  backoff: 'exponential' | 'linear'   // 退避策略
  initialDelayMs: number              // 初始延遲（ms）
  maxDelayMs: number                  // 最大延遲（ms）
  dlqAfterMaxRetries: boolean         // 超過重試後送 DLQ
}

export class RetryEngine {
  /**
   * 計算下次重試延遲
   */
  calculateDelay(
    attemptCount: number,
    policy: RetryPolicy
  ): number {
    const { backoff, initialDelayMs, maxDelayMs } = policy

    let delay: number

    if (backoff === 'exponential') {
      // 指數退避: delay = initialDelay * 2^(attemptCount - 1)
      delay = initialDelayMs * Math.pow(2, attemptCount - 1)
    } else {
      // 線性退避: delay = initialDelay * attemptCount
      delay = initialDelayMs * attemptCount
    }

    // 加入隨機噪聲，避免 Thundering Herd
    const jitter = Math.random() * delay * 0.1
    delay = delay + jitter

    // 限制最大延遲
    return Math.min(delay, maxDelayMs)
  }

  /**
   * 判斷是否應該重試
   */
  shouldRetry(
    attemptCount: number,
    error: Error,
    policy: RetryPolicy
  ): boolean {
    // 已達最大重試次數
    if (attemptCount > policy.maxRetries) {
      return false
    }

    // 可重試的錯誤類型
    const retryableErrors = [
      'ECONNRESET',      // 連接重置
      'ECONNREFUSED',    // 連接被拒
      'ETIMEDOUT',       // 超時
      'SERVICE_UNAVAILABLE',
      'RATE_LIMIT_EXCEEDED',
    ]

    return retryableErrors.some(errCode =>
      error.message.includes(errCode) ||
      error.code === errCode
    )
  }

  /**
   * 計算下次重試時間
   */
  getNextRetryTime(
    attemptCount: number,
    policy: RetryPolicy
  ): Date {
    const delayMs = this.calculateDelay(attemptCount + 1, policy)
    return new Date(Date.now() + delayMs)
  }
}

// 使用方式
const retryPolicy: RetryPolicy = {
  maxRetries: 3,
  backoff: 'exponential',
  initialDelayMs: 1000,      // 1秒
  maxDelayMs: 30000,         // 30秒
  dlqAfterMaxRetries: true
}

const engine = new RetryEngine()

// 第 1 次重試延遲：1000ms * 2^0 = 1000ms
// 第 2 次重試延遲：1000ms * 2^1 = 2000ms
// 第 3 次重試延遲：1000ms * 2^2 = 4000ms
// 第 4 次重試延遲：超過最大，進入 DLQ
```

**退避曲線**：

```
指數退避（推薦）：
延遲
  ^
  |     *
  |   *
  |  *
  | *
  |*___________> 嘗試次數

線性退避：
延遲
  ^
  |      *
  |    *
  |  *
  |*
  |___________> 嘗試次數
```

**驗收標準**：
- [ ] 指數退避計算正確
- [ ] 線性退避計算正確
- [ ] Jitter 加入合理
- [ ] 最大延遲限制有效

**估計工作量**：2 小時

---

### ✅ Task 1.2.1.3: 實現 DeadLetterQueueManager

**檔案**：`packages/core/src/reliability/DeadLetterQueueManager.ts`

**目標**：
管理 DLQ 中的失敗事件，支持查詢、重新入隊等操作

**詳細需求**：

```typescript
export class DeadLetterQueueManager {
  constructor(
    private db: Database,
    private retryEngine: RetryEngine,
    private eventSystem: HookManager
  ) {}

  /**
   * 將事件移至 DLQ
   */
  async moveToDlq(
    eventName: string,
    payload: any,
    options: EventOptions,
    error: Error,
    attemptCount: number
  ): Promise<string> {
    const dlqId = crypto.randomUUID()

    await this.db.table('event_dlq').insert({
      dlq_id: dlqId,
      event_name: eventName,
      event_payload: payload,
      event_options: options,
      attempt_count: attemptCount,
      max_retries: options.retry?.maxRetries || 3,
      status: 'pending',
      last_error: {
        message: error.message,
        code: error.code,
        stack: error.stack,
        timestamp: new Date()
      },
      failed_at: new Date(),
      next_retry_at: null
    })

    logger.error(`Event moved to DLQ: ${dlqId}`)
    return dlqId
  }

  /**
   * 查看 DLQ 事件
   */
  async list(filter: {
    event?: string
    status?: string
    from?: Date
    to?: Date
    limit?: number
    offset?: number
  } = {}): Promise<DlqEvent[]> {
    let query = this.db.table('event_dlq')

    if (filter.event) {
      query = query.where('event_name', filter.event)
    }

    if (filter.status) {
      query = query.where('status', filter.status)
    }

    if (filter.from || filter.to) {
      if (filter.from) query = query.where('failed_at', '>=', filter.from)
      if (filter.to) query = query.where('failed_at', '<=', filter.to)
    }

    return query
      .orderBy('failed_at', 'desc')
      .limit(filter.limit || 100)
      .offset(filter.offset || 0)
  }

  /**
   * 重新入隊單個事件
   */
  async requeue(dlqId: string): Promise<void> {
    const event = await this.db.table('event_dlq')
      .where('dlq_id', dlqId)
      .first()

    if (!event) {
      throw new Error(`DLQ event not found: ${dlqId}`)
    }

    // 派發事件
    await this.eventSystem.doActionAsync(
      event.event_name,
      event.event_payload,
      event.event_options
    )

    // 更新狀態
    await this.db.table('event_dlq')
      .where('dlq_id', dlqId)
      .update({
        status: 'requeued',
        resolution_notes: `Manual requeue at ${new Date().toISOString()}`,
        updated_at: new Date()
      })

    logger.info(`Event requeued: ${dlqId}`)
  }

  /**
   * 批量重試 DLQ 事件
   */
  async retryBatch(filter: {
    event?: string
    from?: Date
    to?: Date
  }): Promise<{ total: number; succeeded: number; failed: number }> {
    const events = await this.list(filter)
    let succeeded = 0
    let failed = 0

    for (const event of events) {
      try {
        await this.requeue(event.dlq_id)
        succeeded++
      } catch (error) {
        logger.error(`Failed to requeue ${event.dlq_id}:`, error)
        failed++
      }
    }

    return { total: events.length, succeeded, failed }
  }

  /**
   * 解決 DLQ 事件
   */
  async resolve(dlqId: string, notes: string): Promise<void> {
    await this.db.table('event_dlq')
      .where('dlq_id', dlqId)
      .update({
        status: 'resolved',
        resolution_notes: notes,
        updated_at: new Date()
      })
  }

  /**
   * 放棄 DLQ 事件
   */
  async abandon(dlqId: string, reason: string): Promise<void> {
    await this.db.table('event_dlq')
      .where('dlq_id', dlqId)
      .update({
        status: 'abandoned',
        resolution_notes: `Abandoned: ${reason}`,
        updated_at: new Date()
      })
  }

  /**
   * 統計 DLQ 狀態
   */
  async getStats(): Promise<{
    total: number
    byEvent: Record<string, number>
    byStatus: Record<string, number>
  }> {
    const [total, byEvent, byStatus] = await Promise.all([
      this.db.table('event_dlq').count('* as count').first(),
      this.db.table('event_dlq')
        .groupBy('event_name')
        .count('* as count')
        .select('event_name'),
      this.db.table('event_dlq')
        .groupBy('status')
        .count('* as count')
        .select('status'),
    ])

    return {
      total: total.count,
      byEvent: Object.fromEntries(
        byEvent.map(r => [r.event_name, r.count])
      ),
      byStatus: Object.fromEntries(
        byStatus.map(r => [r.status, r.count])
      )
    }
  }
}

// 使用方式
const dlqManager = new DeadLetterQueueManager(db, retryEngine, hookManager)

// 查看 DLQ
await dlqManager.list({ event: 'order:created', status: 'pending' })

// 重新入隊
await dlqManager.requeue('dlq-id-123')

// 批量重試
await dlqManager.retryBatch({ event: 'order:created' })

// 統計
const stats = await dlqManager.getStats()
```

**驗收標準**：
- [ ] CRUD 操作正確
- [ ] 批量操作高效
- [ ] 統計查詢正確
- [ ] 交易一致性

**估計工作量**：3 小時

---

### ✅ Task 1.2.1.4: 添加 CLI 工具（list/requeue）

**檔案**：`packages/cli/commands/event-dlq.ts`

**目標**：
提供命令行工具管理 DLQ

**詳細需求**：

```bash
# 查看 DLQ 統計
$ gravito event:dlq:stats
┌──────────────┬───────┐
│ Event        │ Count │
├──────────────┼───────┤
│ order:created│   145 │
│ payment:succeeded│  23 │
└──────────────┴───────┘

# 列出 DLQ 事件
$ gravito event:dlq:list --event=order:created --status=pending
ID                                   Event           Status   Failed At
550e8400-e29b-41d4-a716-446655440000 order:created   pending  2026-02-02 12:30:00

# 查看詳細信息
$ gravito event:dlq:show <dlq-id>
Event: order:created
Payload: { orderId: "ORD-12345", ... }
Attempts: 3/3
Last Error: Service temporarily unavailable
Failed At: 2026-02-02 12:30:00

# 重新入隊
$ gravito event:dlq:requeue <dlq-id>
✓ Event requeued successfully

# 批量重試
$ gravito event:dlq:retry --event=order:created
Processing 145 events...
✓ Succeeded: 140
✗ Failed: 5
Result: 140/145

# 標記為已解決
$ gravito event:dlq:resolve <dlq-id> --notes="Manual fix applied"
✓ Event marked as resolved

# 放棄事件
$ gravito event:dlq:abandon <dlq-id> --reason="Data corrupted"
✓ Event abandoned
```

**CLI 實現**：

```typescript
// packages/cli/commands/event-dlq.ts
import { Command } from 'commander'

export function registerDlqCommands(program: Command) {
  const dlq = program.command('event:dlq')

  // Subcommand: stats
  dlq
    .command('stats')
    .description('Show DLQ statistics')
    .action(async () => {
      const stats = await dlqManager.getStats()
      console.table(stats.byEvent)
    })

  // Subcommand: list
  dlq
    .command('list')
    .option('--event <name>', 'Filter by event name')
    .option('--status <status>', 'Filter by status')
    .option('--limit <n>', 'Limit results', '100')
    .action(async (options) => {
      const events = await dlqManager.list({
        event: options.event,
        status: options.status,
        limit: parseInt(options.limit)
      })
      console.table(events)
    })

  // Subcommand: show
  dlq
    .command('show <dlq-id>')
    .description('Show DLQ event details')
    .action(async (dlqId) => {
      const event = await dlqManager.getById(dlqId)
      console.log(JSON.stringify(event, null, 2))
    })

  // Subcommand: requeue
  dlq
    .command('requeue <dlq-id>')
    .description('Requeue a DLQ event')
    .action(async (dlqId) => {
      await dlqManager.requeue(dlqId)
      console.log('✓ Event requeued successfully')
    })

  // Subcommand: retry
  dlq
    .command('retry')
    .option('--event <name>', 'Retry by event name')
    .action(async (options) => {
      const result = await dlqManager.retryBatch({ event: options.event })
      console.log(`✓ Succeeded: ${result.succeeded}`)
      console.log(`✗ Failed: ${result.failed}`)
    })

  // Subcommand: resolve
  dlq
    .command('resolve <dlq-id>')
    .option('--notes <notes>', 'Resolution notes')
    .action(async (dlqId, options) => {
      await dlqManager.resolve(dlqId, options.notes || '')
      console.log('✓ Event marked as resolved')
    })

  // Subcommand: abandon
  dlq
    .command('abandon <dlq-id>')
    .option('--reason <reason>', 'Abandonment reason')
    .action(async (dlqId, options) => {
      await dlqManager.abandon(dlqId, options.reason || '')
      console.log('✓ Event abandoned')
    })
}
```

**驗收標準**：
- [ ] 所有命令實現完整
- [ ] 幫助信息清晰
- [ ] 輸出格式美觀
- [ ] 錯誤處理完善

**估計工作量**：2 小時

---

### ✅ Task 1.2.1.5: 編寫整合測試

**檔案**：`packages/core/tests/DeadLetterQueueManager.integration.test.ts`

**目標**：
端到端測試 DLQ 完整流程

**測試場景**：

```typescript
describe('DeadLetterQueueManager - Integration', () => {
  // 測試 1: DLQ 流程
  it('should move failed event to DLQ after max retries', async () => {
    let attempts = 0

    core.hooks.addAction('test:event', async () => {
      attempts++
      throw new Error('Simulated failure')
    })

    // 派發事件，配置 3 次重試
    await core.hooks.doActionAsync('test:event', { id: 1 }, {
      retry: {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 100,
        dlqAfterMaxRetries: true
      }
    })

    // 等待重試完成
    await delay(5000)

    // 驗證：應該重試 3 次，然後進入 DLQ
    expect(attempts).toBe(3)

    // 驗證 DLQ 中有記錄
    const dlqEvents = await dlqManager.list()
    expect(dlqEvents).toHaveLength(1)
    expect(dlqEvents[0].event_name).toBe('test:event')
    expect(dlqEvents[0].status).toBe('pending')
  })

  // 測試 2: DLQ 重新入隊
  it('should successfully requeue from DLQ', async () => {
    const results = []

    core.hooks.addAction('test:event', async (payload) => {
      results.push(payload)
    })

    // 模擬失敗事件進入 DLQ
    const dlqId = await dlqManager.moveToDlq(
      'test:event',
      { id: 1 },
      {},
      new Error('Simulated failure'),
      3
    )

    // 重新入隊
    await dlqManager.requeue(dlqId)

    // 等待處理完成
    await delay(500)

    // 驗證：事件被處理
    expect(results).toEqual([{ id: 1 }])
  })

  // 測試 3: 批量重試
  it('should retry multiple DLQ events', async () => {
    // 建立多個 DLQ 事件
    for (let i = 0; i < 5; i++) {
      await dlqManager.moveToDlq(
        'test:event',
        { id: i },
        {},
        new Error('Failure'),
        3
      )
    }

    // 批量重試
    const result = await dlqManager.retryBatch({ event: 'test:event' })

    expect(result.total).toBe(5)
    expect(result.succeeded).toBe(5)
  })

  // 測試 4: 統計功能
  it('should provide accurate statistics', async () => {
    // 建立不同事件的 DLQ 記錄
    await dlqManager.moveToDlq('event:a', {}, {}, new Error(''), 1)
    await dlqManager.moveToDlq('event:a', {}, {}, new Error(''), 1)
    await dlqManager.moveToDlq('event:b', {}, {}, new Error(''), 1)

    const stats = await dlqManager.getStats()

    expect(stats.byEvent['event:a']).toBe(2)
    expect(stats.byEvent['event:b']).toBe(1)
    expect(stats.total).toBe(3)
  })
})
```

**驗收標準**：
- [ ] 所有流程測試通過
- [ ] 覆蓋率 > 80%
- [ ] 無已知缺陷

**估計工作量**：3 小時

---

## 📊 工作量統計

| 任務 | 工作量 | 總計 |
|------|--------|------|
| 1.2.1.1 | 2 h | 2 h |
| 1.2.1.2 | 2 h | 2 h |
| 1.2.1.3 | 3 h | 3 h |
| 1.2.1.4 | 2 h | 2 h |
| 1.2.1.5 | 3 h | 3 h |
| **總計** | | **12 h** |

---

## ✅ 驗收標準

**Functionality**：
- [ ] DLQ 資料表創建完成
- [ ] 重試邏輯正確實現
- [ ] 事件入隊/出隊正常
- [ ] CLI 工具功能完整

**Testing**：
- [ ] 單元測試通過
- [ ] 整合測試通過
- [ ] 覆蓋率 > 80%

**Performance**：
- [ ] DLQ 查詢 < 100ms
- [ ] 批量重試 < 1s（1000 事件）
- [ ] 無性能回退

---

## 📝 交付物清單

- `packages/atlas/migrations/create_event_dlq_table.ts` - 資料表遷移
- `packages/core/src/reliability/RetryPolicy.ts` - 重試策略
- `packages/core/src/reliability/DeadLetterQueueManager.ts` - DLQ 管理器
- `packages/cli/commands/event-dlq.ts` - CLI 工具
- `packages/core/tests/DeadLetterQueueManager.integration.test.ts` - 整合測試

---

## 🔗 相關文檔

- [Issue 1.2 總覽](./README.md)
- [Phase 2: Circuit Breaker](./Phase2-熔断器.md)
- [Phase 3: 背壓機制](./Phase3-背压机制.md)

---

**最後更新**：2026-02-02
