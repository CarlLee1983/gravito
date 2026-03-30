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
export async function requeueDLQEntry(
  dlqEntryId: string,
  dlq: DeadLetterQueue,
  requeue: (eventName: string, payload: unknown, options: EventOptions) => Promise<void>
): Promise<boolean> {
  const entry = dlq.get(dlqEntryId)

  if (!entry) {
    return false
  }

  // 更新最後重試時間戳
  dlq.updateLastRetried(dlqEntryId)

  // 重新加入佇列
  await requeue(entry.eventName, entry.payload, entry.options)

  // 成功重新加入後從 DLQ 刪除
  dlq.delete(dlqEntryId)

  return true
}

/**
 * 批次重新加入指定事件名稱的所有 DLQ 項目。
 *
 * @param eventName - 事件名稱
 * @param dlq - 記憶體內 DLQ 實例
 * @param requeue - 重新加入佇列的回調函式
 * @returns 成功重新加入的項目數
 */
export async function requeueDLQBatch(
  eventName: string,
  dlq: DeadLetterQueue,
  requeue: (entryId: string) => Promise<boolean>
): Promise<number> {
  const entries = dlq.list({ eventName })
  let requeuedCount = 0

  for (const entry of entries) {
    const success = await requeue(entry.id)
    if (success) {
      requeuedCount++
    }
  }

  return requeuedCount
}

/**
 * 建立 EventPriorityQueue 持久化 DLQ 處理器。
 *
 * @param persistentDlqManager - 持久化 DLQ 管理器
 * @returns 持久化 DLQ 處理器函式
 */
export function createPersistentDLQHandler(persistentDlqManager: DeadLetterQueueManager) {
  return async (
    hook: string,
    args: unknown,
    options: EventOptions,
    error: Error,
    retryCount: number,
    _firstFailedAt: number
  ): Promise<void> => {
    try {
      // 將 event options 轉換為 retry policy
      const retryPolicy = options.retry
        ? {
            maxRetries: options.retry.maxRetries || 3,
            backoff: options.retry.backoff || 'exponential',
            initialDelayMs: options.retry.initialDelayMs || 1000,
            maxDelayMs: options.retry.maxDelayMs || 30000,
          }
        : undefined

      // 移至持久化 DLQ
      await persistentDlqManager.moveToDlq(hook, args, options, error, retryCount, retryPolicy)
    } catch (dlqError) {
      // biome-ignore lint/suspicious/noConsole: Standalone DLQ handler function — no Logger instance injected
      console.error(`[HookManager] Error moving event to persistent DLQ:`, dlqError)
    }
  }
}

/**
 * 重新加入持久化 DLQ 單一項目到事件佇列。
 *
 * @param dlqId - 持久化 DLQ 項目 UUID
 * @param persistentDlqManager - 持久化 DLQ 管理器
 * @param doActionAsync - 重新加入佇列的回調函式
 * @returns 是否成功重新加入
 */
export async function requeuePersistentDLQEntry(
  dlqId: string,
  persistentDlqManager: DeadLetterQueueManager,
  doActionAsync: (event: string, args: unknown, options: EventOptions) => Promise<void>
): Promise<boolean> {
  try {
    const event = await persistentDlqManager.getById(dlqId)
    if (!event) {
      return false
    }

    // 重新加入佇列
    await doActionAsync(event.event_name, event.event_payload, event.event_options as EventOptions)

    // 標記為已重新加入佇列
    await persistentDlqManager.requeue(dlqId)

    return true
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: Standalone DLQ handler function — no Logger instance injected
    console.error(`[HookManager] Error requeuing persistent DLQ entry:`, error)
    return false
  }
}

/**
 * 批次重新加入持久化 DLQ 項目。
 *
 * @param filter - 過濾條件
 * @param persistentDlqManager - 持久化 DLQ 管理器
 * @returns 批次操作結果統計
 */
export async function requeuePersistentDLQBatch(
  filter:
    | { eventName?: string; status?: 'pending' | 'requeued' | 'resolved' | 'abandoned' }
    | undefined,
  persistentDlqManager: DeadLetterQueueManager
): Promise<{ total: number; succeeded: number; failed: number }> {
  try {
    return await persistentDlqManager.retryBatch(filter)
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: Standalone DLQ handler function — no Logger instance injected
    console.error(`[HookManager] Error in persistent DLQ batch retry:`, error)
    return { total: 0, succeeded: 0, failed: 0 }
  }
}
