/**
 * @gravito/core - Dead Letter Queue Manager
 *
 * 管理失敗事件的持久化存儲
 * 支持 CRUD、重新入隊、批量重試和統計功能
 */
import type { EventOptions } from '../events/EventOptions'
import type { RetryPolicy } from './RetryPolicy'
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
 * const db = container.make('db') as any
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
export declare class DeadLetterQueueManager {
  private db
  private retryEngine
  constructor(db: any)
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
  moveToDlq(
    eventName: string,
    payload: unknown,
    options: EventOptions,
    error: Error,
    attemptCount: number,
    retryPolicy?: RetryPolicy
  ): Promise<string>
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
  getById(dlqId: string): Promise<DLQRecord | undefined>
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
  list(filter?: DLQManagerFilter): Promise<DLQRecord[]>
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
  requeue(dlqId: string): Promise<void>
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
  retryBatch(filter?: DLQManagerFilter): Promise<{
    total: number
    succeeded: number
    failed: number
  }>
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
  resolve(dlqId: string, notes?: string): Promise<void>
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
  abandon(dlqId: string, reason?: string): Promise<void>
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
  updateStatus(
    dlqId: string,
    status: 'pending' | 'requeued' | 'resolved' | 'abandoned',
    notes?: string
  ): Promise<void>
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
  deleteEntry(dlqId: string): Promise<boolean>
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
  deleteEntries(dlqIds: string[]): Promise<number>
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
  getStats(): Promise<DLQStats>
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
  getCountByEvent(eventName: string): Promise<number>
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
  clear(includeResolved?: boolean): Promise<number>
  /**
   * 通過 Bull Job ID 查找 DLQ 記錄
   *
   * 用於 MessageQueueBridge 集成：當 Bull Queue job 失敗時，
   * 通過 Job ID 查找相應的 DLQ 記錄。
   *
   * @param bullJobId - Bull Queue Job ID
   * @returns DLQ 記錄或 undefined
   *
   * @example
   * ```typescript
   * const record = await dlqManager.findByBullJobId('job-abc123')
   * if (record) {
   *   console.log(`Event ${record.event_name} is in DLQ`)
   * }
   * ```
   */
  findByBullJobId(bullJobId: string): Promise<DLQRecord | undefined>
  /**
   * 調度延遲重試（整合 Bull Queue delayed jobs）
   *
   * 從 DLQ 中提取事件，通過 Bull Queue 的延遲 job 功能進行重試。
   *
   * @param dlqId - DLQ 記錄 ID
   * @param delayMs - 延遲時間（毫秒）
   * @throws 如果記錄不存在
   *
   * @example
   * ```typescript
   * // 延遲 1 小時後重試
   * await dlqManager.scheduleRetry('dlq-uuid-123', 3600000)
   * ```
   */
  scheduleRetry(dlqId: string, delayMs: number): Promise<void>
}
