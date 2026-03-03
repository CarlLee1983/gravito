import type { DeadLetterQueue } from '../events/DeadLetterQueue'
import type { EventOptions } from '../events/EventOptions'
import type { DeadLetterQueueManager } from '../reliability/DeadLetterQueueManager'
/**
 * DLQ 操作輔助函式模組。
 *
 * 提取自 HookManager 的 DLQ 管理邏輯，以降低 HookManager 複雜度。
 * 這些函式接受所需依賴作為參數，便於測試與重用。
 *
 * @internal
 */
/**
 * 重新加入單一 DLQ 項目到事件佇列。
 *
 * @param dlqEntryId - DLQ 項目 ID
 * @param dlq - 記憶體內 DLQ 實例
 * @param requeue - 重新加入佇列的回調函式
 * @returns 是否成功重新加入
 */
export declare function requeueDLQEntry(
  dlqEntryId: string,
  dlq: DeadLetterQueue,
  requeue: (eventName: string, payload: unknown, options: EventOptions) => Promise<void>
): Promise<boolean>
/**
 * 批次重新加入指定事件名稱的所有 DLQ 項目。
 *
 * @param eventName - 事件名稱
 * @param dlq - 記憶體內 DLQ 實例
 * @param requeue - 重新加入佇列的回調函式
 * @returns 成功重新加入的項目數
 */
export declare function requeueDLQBatch(
  eventName: string,
  dlq: DeadLetterQueue,
  requeue: (entryId: string) => Promise<boolean>
): Promise<number>
/**
 * 建立 EventPriorityQueue 持久化 DLQ 處理器。
 *
 * @param persistentDlqManager - 持久化 DLQ 管理器
 * @returns 持久化 DLQ 處理器函式
 */
export declare function createPersistentDLQHandler(
  persistentDlqManager: DeadLetterQueueManager
): (
  hook: string,
  args: unknown,
  options: EventOptions,
  error: Error,
  retryCount: number,
  _firstFailedAt: number
) => Promise<void>
/**
 * 重新加入持久化 DLQ 單一項目到事件佇列。
 *
 * @param dlqId - 持久化 DLQ 項目 UUID
 * @param persistentDlqManager - 持久化 DLQ 管理器
 * @param doActionAsync - 重新加入佇列的回調函式
 * @returns 是否成功重新加入
 */
export declare function requeuePersistentDLQEntry(
  dlqId: string,
  persistentDlqManager: DeadLetterQueueManager,
  doActionAsync: (event: string, args: unknown, options: EventOptions) => Promise<void>
): Promise<boolean>
/**
 * 批次重新加入持久化 DLQ 項目。
 *
 * @param filter - 過濾條件
 * @param persistentDlqManager - 持久化 DLQ 管理器
 * @returns 批次操作結果統計
 */
export declare function requeuePersistentDLQBatch(
  filter:
    | {
        eventName?: string
        status?: 'pending' | 'requeued' | 'resolved' | 'abandoned'
      }
    | undefined,
  persistentDlqManager: DeadLetterQueueManager
): Promise<{
  total: number
  succeeded: number
  failed: number
}>
