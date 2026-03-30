/**
 * @gravito/core - Message Queue Bridge
 *
 * 橋接層，連接 HookManager 與 Bull Queue (via StreamEventBackend)
 * 支持分佈式事件流：HookManager → Bull Queue → Worker → 完成/DLQ
 */

import type { HookManager } from '../HookManager'
import type { DeadLetterQueueManager } from '../reliability/DeadLetterQueueManager'
import type { EventBackend } from './EventBackend'
import type { EventTask } from './types'
import type { WorkerPool } from './WorkerPool'

/**
 * 事件執行狀態
 */
export interface EventStatus {
  eventId: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'in_dlq'
  attempts: number
  lastError?: string
  createdAt: number
  processedAt?: number
}

/**
 * MessageQueueBridge 配置
 */
export interface MessageQueueBridgeConfig {
  /**
   * HookManager 實例
   */
  hookManager: HookManager

  /**
   * Worker 線程池（可選）
   */
  workerPool?: WorkerPool

  /**
   * 分佈式事件後端（Bull Queue）
   */
  eventBackend: EventBackend

  /**
   * Dead Letter Queue 管理器
   */
  dlqManager: DeadLetterQueueManager

  /**
   * 是否啟用 CircuitBreaker 檢查
   * @default false
   */
  enableCircuitBreaker?: boolean
}

/**
 * MessageQueueBridge - 連接 HookManager 與 Bull Queue 的橋接層
 *
 * 功能：
 * 1. 通過 Bull Queue 分發事件（dispatchWithQueue）
 * 2. Worker 中處理隊列事件（processQueuedEvent）
 * 3. 失敗任務轉移至 DLQ（handleJobFailure）
 * 4. 查詢事件執行狀態（getEventStatus）
 *
 * @example
 * ```typescript
 * const bridge = new MessageQueueBridge({
 *   hookManager,
 *   eventBackend: streamEventBackend,
 *   dlqManager,
 *   enableCircuitBreaker: true
 * })
 *
 * // 分發事件至 Bull Queue
 * const jobId = await bridge.dispatchWithQueue('order:created', { orderId: 123 })
 *
 * // Worker 處理事件
 * await bridge.processQueuedEvent(jobId, task)
 * ```
 */
export class MessageQueueBridge {
  constructor(private config: MessageQueueBridgeConfig) {
    if (!config.hookManager) {
      throw new Error('MessageQueueBridge: hookManager is required')
    }
    if (!config.eventBackend) {
      throw new Error('MessageQueueBridge: eventBackend is required')
    }
    if (!config.dlqManager) {
      throw new Error('MessageQueueBridge: dlqManager is required')
    }
  }

  /**
   * 通過 Bull Queue 分發事件（分佈式異步處理）
   *
   * 流程：
   * 1. 驗證事件 listeners 存在
   * 2. 檢查 CircuitBreaker 狀態（如果啟用）
   * 3. 構建 EventTask
   * 4. 入隊到 eventBackend (Bull Queue)
   *
   * @param eventName - 事件名稱
   * @param args - 事件參數
   * @param options - 事件選項（可選）
   * @returns Job ID
   * @throws 如果沒有 listeners 或 CircuitBreaker 打開
   *
   * @example
   * ```typescript
   * const jobId = await bridge.dispatchWithQueue('order:created', {
   *   orderId: 'ORD-123',
   *   amount: 999.99
   * })
   * ```
   */
  async dispatchWithQueue<TArgs = unknown>(
    eventName: string,
    args: TArgs,
    options?: any
  ): Promise<string> {
    // 1. 驗證 listeners 存在
    const listeners = this.config.hookManager.getListeners(eventName)
    if (listeners.length === 0) {
      throw new Error(`[MessageQueueBridge] No listeners registered for event: ${eventName}`)
    }

    // 2. 檢查 CircuitBreaker 狀態（如果啟用）
    if (this.config.enableCircuitBreaker) {
      const breaker = (this.config.hookManager as any).getCircuitBreaker?.(eventName)
      if (breaker?.getState?.() === 'OPEN') {
        throw new Error(`[MessageQueueBridge] Circuit breaker is OPEN for event: ${eventName}`)
      }
    }

    // 3. 構建 EventTask
    const nowMs = Date.now()
    const task: EventTask = {
      id: `queue-${nowMs}-${Math.random().toString(36).substr(2, 9)}`,
      hook: eventName,
      args,
      callbacks: listeners,
      options: options || {},
      createdAt: nowMs,
      enqueuedAt: nowMs,
      retryCount: 0,
    }

    // 4. 入隊到 eventBackend (Bull Queue)
    // 返回 Job ID (由 StreamEventBackend 生成)
    const jobId = task.id
    await this.config.eventBackend.enqueue(task)

    // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
    console.info(`[MessageQueueBridge] Event "${eventName}" enqueued to Bull Queue (job: ${jobId})`)

    return jobId
  }

  /**
   * 處理隊列事件（由 Bull Queue Worker 調用）
   *
   * 重要：使用 doActionSync() 避免遞迴
   * - 不能使用 doActionAsync()（會導致事件再次入隊）
   * - Worker 中直接同步執行 callbacks
   *
   * 流程：
   * 1. 直接執行 callbacks（不使用 doActionSync，避免吞掉錯誤）
   * 2. 記錄成功或失敗
   * 3. 拋出錯誤讓 Bull Queue 處理重試
   *
   * @param jobId - Bull Queue Job ID
   * @param task - 事件任務
   * @throws 如果 callback 執行失敗，讓 Bull Queue 處理重試
   *
   * @example
   * ```typescript
   * // 在 Bull Queue Worker 中：
   * await bridge.processQueuedEvent(jobId, task)
   * ```
   */
  async processQueuedEvent(jobId: string, task: EventTask): Promise<void> {
    let hasError = false
    let lastError: Error | null = null

    // 直接執行 callbacks，允許錯誤拋出
    for (const callback of task.callbacks) {
      try {
        await callback(task.args)
      } catch (error) {
        hasError = true
        lastError = error as Error
        // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
        console.error(
          `[MessageQueueBridge] Callback failed for event "${task.hook}" (job: ${jobId}):`,
          error
        )
      }
    }

    if (hasError) {
      // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
      console.error(`[MessageQueueBridge] Event "${task.hook}" processing failed (job: ${jobId})`)
      // 拋出錯誤，讓 Bull Queue 處理重試
      // 重試耗盡後會觸發 onFailed callback
      throw lastError || new Error('Event processing failed')
    }

    // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
    console.info(`[MessageQueueBridge] Event "${task.hook}" processed successfully (job: ${jobId})`)
  }

  /**
   * 處理 Bull Queue 任務失敗（由 onFailed callback 調用）
   *
   * 流程：
   * 1. 記錄警告日誌
   * 2. 移至 persistent DLQ（DeadLetterQueueManager）
   * 3. 持久化到 event_dlq 表，支持延遲重試
   *
   * @param jobId - Bull Queue Job ID
   * @param task - 事件任務
   * @param error - 導致失敗的錯誤
   * @param retryCount - 已重試次數（可選）
   *
   * @example
   * ```typescript
   * // 在 Bull Queue onFailed callback 中：
   * await bridge.handleJobFailure(jobId, task, error, 3)
   * ```
   */
  async handleJobFailure(
    jobId: string,
    task: EventTask,
    error: Error,
    retryCount = 0
  ): Promise<void> {
    // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
    console.warn(
      `[MessageQueueBridge] Event "${task.hook}" failed after retries (job: ${jobId}), moving to DLQ`
    )

    try {
      // 移至 persistent DLQ
      const dlqId = await this.config.dlqManager.moveToDlq(
        task.hook,
        task.args,
        task.options,
        error,
        retryCount
      )

      // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
      console.info(`[MessageQueueBridge] Event moved to DLQ (dlq_id: ${dlqId})`)
    } catch (dlqError) {
      // biome-ignore lint/suspicious/noConsole: Event infrastructure — no Logger dependency injected
      console.error(`[MessageQueueBridge] Failed to move event to DLQ:`, dlqError)
      // 即使 DLQ 失敗也不拋出，以免影響主流程
    }
  }

  /**
   * 查詢事件執行狀態
   *
   * 支持查詢：
   * 1. 待處理事件
   * 2. 正在處理的事件
   * 3. 已完成事件
   * 4. 失敗事件（在 DLQ 中）
   *
   * @param eventId - 事件 ID（task.id 或 jobId）
   * @returns 事件狀態
   *
   * @example
   * ```typescript
   * const status = await bridge.getEventStatus('queue-1707000000000-abc123')
   * console.log(status) // { eventId, status, attempts, ... }
   * ```
   */
  async getEventStatus(eventId: string): Promise<EventStatus> {
    // TODO: Phase 4 Task 3 - 整合 StreamEventBackend 的狀態查詢
    // 當前作為 stub 實現，返回待定狀態
    // 在完整實現中，應該查詢 Bull Queue 和 DLQ 數據庫

    return {
      eventId,
      status: 'pending',
      attempts: 0,
      createdAt: Date.now(),
    }
  }

  /**
   * 獲取 EventBackend 實例（用於高級操作）
   *
   * @returns EventBackend 實例
   * @internal
   */
  getEventBackend(): EventBackend {
    return this.config.eventBackend
  }

  /**
   * 獲取 DLQ 管理器實例（用於高級操作）
   *
   * @returns DeadLetterQueueManager 實例
   * @internal
   */
  getDLQManager(): DeadLetterQueueManager {
    return this.config.dlqManager
  }

  /**
   * 獲取 HookManager 實例（用於高級操作）
   *
   * @returns HookManager 實例
   * @internal
   */
  getHookManager(): HookManager {
    return this.config.hookManager
  }
}
