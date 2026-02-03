/**
 * @gravito/core - Dead Letter Queue Manager
 *
 * 管理失敗事件的持久化存儲
 * 支持 CRUD、重新入隊、批量重試和統計功能
 */

import { randomUUID } from 'node:crypto'
import type { ConnectionContract } from '@gravito/atlas'
import type { EventOptions } from '../events/EventOptions'
import type { RetryPolicy } from './RetryPolicy'
import { RetryEngine } from './RetryPolicy'

/**
 * DLQ 事件的數據庫記錄
 */
export interface DLQRecord {
  id: number
  dlq_id: string
  event_name: string
  event_payload: unknown
  event_options: unknown
  attempt_count: number
  max_retries: number
  next_retry_at: string | null
  last_error: unknown
  status: 'pending' | 'requeued' | 'resolved' | 'abandoned'
  resolution_notes: string | null
  failed_at: string
  created_at: string
  updated_at: string
}

/**
 * DLQ 事件查詢過濾選項（for DeadLetterQueueManager）
 */
export interface DLQManagerFilter {
  /** 按事件名稱篩選 */
  eventName?: string

  /** 按狀態篩選 */
  status?: 'pending' | 'requeued' | 'resolved' | 'abandoned'

  /** 開始時間 */
  from?: Date

  /** 結束時間 */
  to?: Date

  /** 結果數量限制 */
  limit?: number

  /** 分頁偏移 */
  offset?: number
}

/**
 * DLQ 統計信息
 */
export interface DLQStats {
  /** 事件總數 */
  total: number

  /** 按事件名稱的統計 */
  byEvent: Record<string, number>

  /** 按狀態的統計 */
  byStatus: Record<string, number>
}

/**
 * Dead Letter Queue 管理器
 *
 * 負責管理失敗事件的持久化存儲，支持：
 * - 自動將失敗事件移至 DLQ
 * - 查詢和篩選 DLQ 事件
 * - 重新入隊單個或批量事件
 * - 標記事件為已解決或已放棄
 * - 查看統計信息
 *
 * @example
 * ```typescript
 * const db = container.make('db') as ConnectionContract
 * const dlqManager = new DeadLetterQueueManager(db)
 *
 * // 將失敗事件移至 DLQ
 * const dlqId = await dlqManager.moveToDlq(
 *   'order:created',
 *   { orderId: '123' },
 *   { retry: {...} },
 *   error,
 *   3
 * )
 *
 * // 查詢 DLQ 事件
 * const events = await dlqManager.list({ event: 'order:created', status: 'pending' })
 *
 * // 重新入隊
 * await dlqManager.requeue(dlqId)
 *
 * // 批量重試
 * const result = await dlqManager.retryBatch({ eventName: 'order:created' })
 *
 * // 統計
 * const stats = await dlqManager.getStats()
 * ```
 */
export class DeadLetterQueueManager {
  private retryEngine: RetryEngine

  constructor(private db: ConnectionContract) {
    this.retryEngine = new RetryEngine()
  }

  /**
   * 將失敗事件移至死信隊列
   *
   * @param eventName - 事件名稱
   * @param payload - 事件負載
   * @param options - 事件選項
   * @param error - 導致失敗的錯誤
   * @param attemptCount - 當前嘗試次數
   * @param retryPolicy - 重試策略配置
   * @returns DLQ 記錄的 UUID
   *
   * @example
   * ```typescript
   * const dlqId = await dlqManager.moveToDlq(
   *   'order:created',
   *   { orderId: 'ORD-123' },
   *   { retry: { maxRetries: 3, backoff: 'exponential' } },
   *   new Error('Service unavailable'),
   *   3,
   *   { maxRetries: 3, backoff: 'exponential', initialDelayMs: 1000, maxDelayMs: 30000 }
   * )
   * ```
   */
  async moveToDlq(
    eventName: string,
    payload: unknown,
    options: EventOptions,
    error: Error,
    attemptCount: number,
    retryPolicy?: RetryPolicy
  ): Promise<string> {
    const dlqId = randomUUID()

    // 如果提供了重試策略，計算下次重試時間
    let nextRetryAt: string | null = null
    if (retryPolicy && this.retryEngine.shouldRetry(attemptCount + 1, retryPolicy)) {
      const delayMs = this.retryEngine.calculateDelay(attemptCount + 1, retryPolicy)
      nextRetryAt = new Date(Date.now() + delayMs).toISOString()
    }

    const record = {
      dlq_id: dlqId,
      event_name: eventName,
      event_payload: payload,
      event_options: options,
      attempt_count: attemptCount,
      max_retries: retryPolicy?.maxRetries || 3,
      next_retry_at: nextRetryAt,
      last_error: {
        message: error.message,
        code: (error as any).code,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
      status: 'pending',
      resolution_notes: null,
      failed_at: new Date(),
    }

    await this.db.table('event_dlq').insert(record)

    return dlqId
  }

  /**
   * 按 DLQ ID 獲取單個事件
   *
   * @param dlqId - DLQ 事件的 UUID
   * @returns DLQ 記錄，若不存在則返回 undefined
   *
   * @example
   * ```typescript
   * const event = await dlqManager.getById('550e8400-e29b-41d4-a716-446655440000')
   * if (event) {
   *   console.log(event.event_name, event.status)
   * }
   * ```
   */
  async getById(dlqId: string): Promise<DLQRecord | undefined> {
    const result = await this.db.table('event_dlq').where('dlq_id', dlqId).first()
    return (result as DLQRecord | null) || undefined
  }

  /**
   * 查詢 DLQ 事件
   *
   * @param filter - 查詢過濾條件
   * @returns DLQ 記錄列表（按失敗時間倒序）
   *
   * @example
   * ```typescript
   * // 查詢特定事件的待處理事件
   * const events = await dlqManager.list({
   *   eventName: 'order:created',
   *   status: 'pending',
   *   limit: 50
   * })
   *
   * // 查詢時間範圍內的所有失敗事件
   * const eventsInRange = await dlqManager.list({
   *   from: new Date('2026-02-01'),
   *   to: new Date('2026-02-03'),
   *   limit: 100
   * })
   * ```
   */
  async list(filter: DLQManagerFilter = {}): Promise<DLQRecord[]> {
    let query = this.db.table('event_dlq')

    // 按事件名稱篩選
    if (filter.eventName) {
      query = query.where('event_name', filter.eventName)
    }

    // 按狀態篩選
    if (filter.status) {
      query = query.where('status', filter.status)
    }

    // 按時間範圍篩選
    if (filter.from) {
      query = query.where('failed_at', '>=', filter.from)
    }

    if (filter.to) {
      query = query.where('failed_at', '<=', filter.to)
    }

    // 排序並分頁
    const results = await query
      .orderBy('failed_at', 'desc')
      .limit(filter.limit || 100)
      .offset(filter.offset || 0)
      .get()

    return results as unknown as DLQRecord[]
  }

  /**
   * 重新入隊單個 DLQ 事件
   *
   * 重新入隊不會自動派發事件，而是標記狀態為 'requeued'
   * 實際的事件派發應由調用者負責處理
   *
   * @param dlqId - DLQ 事件的 UUID
   * @throws 如果事件不存在
   *
   * @example
   * ```typescript
   * const event = await dlqManager.getById(dlqId)
   * if (event) {
   *   // 由調用者決定如何派發事件
   *   await eventSystem.doActionAsync(
   *     event.event_name,
   *     event.event_payload,
   *     event.event_options
   *   )
   *
   *   // 標記為已重新入隊
   *   await dlqManager.requeue(dlqId)
   * }
   * ```
   */
  async requeue(dlqId: string): Promise<void> {
    const event = await this.getById(dlqId)

    if (!event) {
      throw new Error(`DLQ event not found: ${dlqId}`)
    }

    await this.updateStatus(dlqId, 'requeued', `Manual requeue at ${new Date().toISOString()}`)
  }

  /**
   * 批量重新入隊 DLQ 事件
   *
   * @param filter - 查詢過濾條件
   * @returns 包含處理結果的統計對象
   *
   * @example
   * ```typescript
   * const result = await dlqManager.retryBatch({
   *   eventName: 'order:created',
   *   status: 'pending'
   * })
   *
   * console.log(`Success: ${result.succeeded}, Failed: ${result.failed}`)
   * ```
   */
  async retryBatch(
    filter: DLQManagerFilter = {}
  ): Promise<{ total: number; succeeded: number; failed: number }> {
    const events = await this.list(filter)
    let succeeded = 0
    let failed = 0

    for (const event of events) {
      try {
        await this.requeue(event.dlq_id)
        succeeded++
      } catch (error) {
        console.error(`Failed to requeue ${event.dlq_id}:`, error)
        failed++
      }
    }

    return { total: events.length, succeeded, failed }
  }

  /**
   * 標記 DLQ 事件為已解決
   *
   * @param dlqId - DLQ 事件的 UUID
   * @param notes - 解決說明
   *
   * @example
   * ```typescript
   * await dlqManager.resolve(dlqId, 'Manual fix applied: Database issue resolved')
   * ```
   */
  async resolve(dlqId: string, notes?: string): Promise<void> {
    await this.updateStatus(dlqId, 'resolved', notes || `Resolved at ${new Date().toISOString()}`)
  }

  /**
   * 放棄 DLQ 事件（不再重試）
   *
   * @param dlqId - DLQ 事件的 UUID
   * @param reason - 放棄原因
   *
   * @example
   * ```typescript
   * await dlqManager.abandon(dlqId, 'Data corrupted, cannot recover')
   * ```
   */
  async abandon(dlqId: string, reason?: string): Promise<void> {
    await this.updateStatus(
      dlqId,
      'abandoned',
      reason || `Abandoned at ${new Date().toISOString()}`
    )
  }

  /**
   * 更新 DLQ 事件狀態
   *
   * @param dlqId - DLQ 事件的 UUID
   * @param status - 新狀態
   * @param notes - 狀態變更說明
   * @throws 如果事件不存在
   *
   * @internal
   */
  async updateStatus(
    dlqId: string,
    status: 'pending' | 'requeued' | 'resolved' | 'abandoned',
    notes?: string
  ): Promise<void> {
    const event = await this.getById(dlqId)

    if (!event) {
      throw new Error(`DLQ event not found: ${dlqId}`)
    }

    await this.db
      .table('event_dlq')
      .where('dlq_id', dlqId)
      .update({
        status,
        resolution_notes: notes || event.resolution_notes,
        updated_at: new Date(),
      })
  }

  /**
   * 刪除單個 DLQ 事件
   *
   * @param dlqId - DLQ 事件的 UUID
   * @returns true 如果刪除成功，false 如果事件不存在
   *
   * @example
   * ```typescript
   * const deleted = await dlqManager.deleteEntry(dlqId)
   * if (deleted) {
   *   console.log('Event deleted')
   * }
   * ```
   */
  async deleteEntry(dlqId: string): Promise<boolean> {
    const result = await this.db.table('event_dlq').where('dlq_id', dlqId).delete()

    return result > 0
  }

  /**
   * 刪除多個 DLQ 事件
   *
   * @param dlqIds - DLQ 事件 UUID 列表
   * @returns 刪除的事件數量
   *
   * @example
   * ```typescript
   * const deletedCount = await dlqManager.deleteEntries([id1, id2, id3])
   * ```
   */
  async deleteEntries(dlqIds: string[]): Promise<number> {
    if (dlqIds.length === 0) {
      return 0
    }

    return this.db.table('event_dlq').whereIn('dlq_id', dlqIds).delete()
  }

  /**
   * 獲取 DLQ 統計信息
   *
   * @returns 包含總數、按事件名稱和狀態的統計信息
   *
   * @example
   * ```typescript
   * const stats = await dlqManager.getStats()
   *
   * console.log(`Total events: ${stats.total}`)
   * console.log('By event:', stats.byEvent)
   * // Output: { 'order:created': 145, 'payment:succeeded': 23 }
   *
   * console.log('By status:', stats.byStatus)
   * // Output: { pending: 120, requeued: 15, resolved: 8, abandoned: 2 }
   * ```
   */
  async getStats(): Promise<DLQStats> {
    // 獲取總數
    const total = await this.db.table('event_dlq').count()

    // 按事件名稱分組統計（使用 raw SQL 以確保跨數據庫兼容）
    const byEventResult = await this.db.raw<{ event_name: string; count: number }>(
      'SELECT event_name, COUNT(*) as count FROM event_dlq GROUP BY event_name'
    )

    const byEvent: Record<string, number> = {}
    for (const row of byEventResult.rows) {
      byEvent[row.event_name] = Number(row.count)
    }

    // 按狀態分組統計（使用 raw SQL 以確保跨數據庫兼容）
    const byStatusResult = await this.db.raw<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM event_dlq GROUP BY status'
    )

    const byStatus: Record<string, number> = {}
    for (const row of byStatusResult.rows) {
      byStatus[row.status] = Number(row.count)
    }

    return {
      total,
      byEvent,
      byStatus,
    }
  }

  /**
   * 獲取某個事件名稱的 DLQ 事件數
   *
   * @param eventName - 事件名稱
   * @returns 事件數量
   *
   * @example
   * ```typescript
   * const count = await dlqManager.getCountByEvent('order:created')
   * ```
   */
  async getCountByEvent(eventName: string): Promise<number> {
    return this.db.table('event_dlq').where('event_name', eventName).count()
  }

  /**
   * 清空所有 DLQ 事件（慎用！）
   *
   * @param includeResolved - 是否包含已解決的事件
   * @returns 清空的事件數量
   *
   * @example
   * ```typescript
   * // 只清空待處理的事件
   * const count = await dlqManager.clear(false)
   *
   * // 清空所有事件（包括已解決和已放棄）
   * const countAll = await dlqManager.clear(true)
   * ```
   */
  async clear(includeResolved = false): Promise<number> {
    let query = this.db.table('event_dlq')

    if (!includeResolved) {
      query = query.where('status', 'pending')
    }

    return query.delete()
  }
}
