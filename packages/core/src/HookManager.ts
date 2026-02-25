import { DeadLetterQueue } from './events/DeadLetterQueue'
import type { EventBackend } from './events/EventBackend'
import type { EventOptions } from './events/EventOptions'
import { EventPriorityQueue } from './events/EventPriorityQueue'
import { ActionManager } from './hooks/ActionManager'
import { AsyncDetector } from './hooks/AsyncDetector'
import {
  createPersistentDLQHandler,
  requeueDLQBatch as dlqRequeueBatch,
  requeueDLQEntry as dlqRequeueEntry,
  requeuePersistentDLQBatch as persistentDlqRequeueBatch,
  requeuePersistentDLQEntry as persistentDlqRequeueEntry,
} from './hooks/dlq-operations'
import { FilterManager } from './hooks/FilterManager'
import { MigrationWarner } from './hooks/MigrationWarner'
import { DeadLetterQueueManager } from './reliability/DeadLetterQueueManager'

// 重新匯出所有 hook 相關型別，維持向後相容性
export type {
  ActionCallback,
  FilterCallback,
  HookManagerConfig,
  ListenerInfo,
  ListenerOptions,
} from './hooks/types'

// 導入類型供內部使用
import type {
  ActionCallback,
  FilterCallback,
  HookManagerConfig,
  ListenerInfo,
  ListenerOptions,
} from './hooks/types'

/**
 * Manager for WordPress-style hooks (actions and filters).
 *
 * 此為 facade 類別，將職責委派給專門的管理器：
 * - FilterManager：處理 filter hook 的登記與執行
 * - ActionManager：處理 action hook 的登記與執行
 * - AsyncDetector：非同步偵測快取
 * - MigrationWarner：遷移警告管理
 *
 * @public
 */
export class HookManager {
  private filterManager: FilterManager
  private actionManager: ActionManager
  private asyncDetector: AsyncDetector
  private migrationWarner: MigrationWarner

  private eventQueue: EventPriorityQueue
  private backend: EventBackend
  private dlq?: DeadLetterQueue
  private persistentDlqManager?: DeadLetterQueueManager
  private messageQueueBridge?: any
  private config: HookManagerConfig

  constructor(config: HookManagerConfig = {}) {
    this.config = {
      asyncByDefault: false,
      migrationMode: 'sync',
      showDeprecationWarnings: false,
      enableDLQ: true,
      enablePersistentDLQ: false,
      ...config,
    }
    this.eventQueue = new EventPriorityQueue(config.queue)
    this.backend = config.backend || this.eventQueue

    // 初始化專門管理器
    this.asyncDetector = new AsyncDetector()
    this.migrationWarner = new MigrationWarner()
    this.filterManager = new FilterManager()
    this.actionManager = new ActionManager(
      this.backend,
      this.config,
      this.asyncDetector,
      this.migrationWarner
    )

    // 初始化記憶體內 DLQ
    if (config.enableDLQ ?? true) {
      if (this.backend instanceof EventPriorityQueue) {
        this.dlq = new DeadLetterQueue()
        this.eventQueue.setDeadLetterQueue(this.dlq)
      }
    }

    // 若有啟用，初始化持久化 DLQ
    if (config.enablePersistentDLQ && config.db) {
      this.persistentDlqManager = new DeadLetterQueueManager(config.db)
    }

    // 若持久化 DLQ manager 存在，設定 EventPriorityQueue 的持久化 DLQ 處理器
    if (this.persistentDlqManager && this.backend instanceof EventPriorityQueue) {
      this.eventQueue.setPersistentDLQHandler(this.createPersistentDLQHandler())
    }

    // 初始化 Message Queue Bridge for distributed processing
    if (config.messageQueueBridge) {
      this.messageQueueBridge = config.messageQueueBridge
    }
  }

  // ========== Filter Methods（委派至 FilterManager）==========

  /**
   * Register a filter hook.
   *
   * Filters are used to transform a value (input/output) through a chain of
   * callbacks. Each callback must return the modified value.
   *
   * @template T - The type of value being filtered.
   * @param hook - The unique name of the hook.
   * @param callback - The callback function to execute.
   *
   * @example
   * ```typescript
   * core.hooks.addFilter('content', async (content: string) => {
   *   return content.toUpperCase()
   * })
   * ```
   */
  addFilter<T = unknown>(hook: string, callback: FilterCallback<T>): void {
    this.filterManager.addFilter(hook, callback)
  }

  /**
   * Apply all registered filters sequentially.
   *
   * Each callback receives the previous callback's return value.
   *
   * @template T - The type of value being filtered.
   * @param hook - The name of the hook.
   * @param initialValue - The initial value to filter.
   * @param args - Additional arguments to pass to the callbacks.
   * @returns The final filtered value.
   *
   * @example
   * ```typescript
   * const content = await core.hooks.applyFilters('content', 'hello world')
   * ```
   */
  async applyFilters<T = unknown>(hook: string, initialValue: T, ...args: unknown[]): Promise<T> {
    return this.filterManager.applyFilters(hook, initialValue, ...args)
  }

  // ========== Action Methods（委派至 ActionManager）==========

  /**
   * Register an action hook.
   *
   * Actions are used to trigger side effects (e.g., logging, sending emails)
   * at specific points in the application lifecycle.
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The unique name of the hook.
   * @param callback - The callback function to execute.
   * @param options - Optional listener options (type override, circuit breaker).
   *
   * @example
   * ```typescript
   * core.hooks.addAction('user_registered', async (user: User) => {
   *   await sendWelcomeEmail(user)
   * })
   * ```
   */
  addAction<TArgs = unknown>(
    hook: string,
    callback: ActionCallback<TArgs>,
    options?: ListenerOptions
  ): void {
    this.actionManager.addAction(hook, callback, options)
  }

  /**
   * Run all registered actions.
   *
   * This method supports both synchronous and asynchronous dispatch based on configuration.
   * In hybrid mode, it auto-detects async listeners and uses async dispatch.
   *
   * 注意：dispatch 模式決策在此層級完成，以確保子類別（如 ObservableHookManager）
   * 可透過多型覆寫正確攔截 doActionSync / doActionAsync 的呼叫。
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
   * @param args - The arguments to pass to the callbacks.
   * @param options - Optional event options for async dispatch.
   *
   * @example
   * ```typescript
   * await core.hooks.doAction('user_registered', user)
   * ```
   */
  async doAction<TArgs = unknown>(
    hook: string,
    args: TArgs,
    options?: EventOptions
  ): Promise<void> {
    const mode = this.actionManager.resolveDispatchMode(hook, args, options)

    if (mode === 'async') {
      return this.doActionAsync(hook, args, options)
    }

    return this.doActionSync(hook, args)
  }

  /**
   * Run all registered actions synchronously (legacy mode).
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
   * @param args - The arguments to pass to the callbacks.
   */
  async doActionSync<TArgs = unknown>(hook: string, args: TArgs): Promise<void> {
    return this.actionManager.doActionSync(hook, args)
  }

  /**
   * Run all registered actions asynchronously via priority queue.
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
   * @param args - The arguments to pass to the callbacks.
   * @param options - Event options for async dispatch.
   *
   * @example
   * ```typescript
   * await core.hooks.doActionAsync('order:created', order, {
   *   priority: 'high',
   *   ordering: 'partition',
   *   partitionKey: order.id,
   *   timeout: 5000,
   * })
   * ```
   */
  async doActionAsync<TArgs = unknown>(
    hook: string,
    args: TArgs,
    options: EventOptions = {}
  ): Promise<void> {
    return this.actionManager.doActionAsync(hook, args, options)
  }

  // ========== Dispatch Mode Detection（委派至 ActionManager）==========

  /**
   * Determine the dispatch mode for an event.
   *
   * @param eventName - The name of the event
   * @param options - Optional event options
   * @returns The dispatch mode: 'sync' or 'async'
   * @public
   */
  detectMode(eventName: string, options?: EventOptions): 'sync' | 'async' {
    return this.actionManager.detectMode(eventName, options)
  }

  // ========== Async Detection（委派至 AsyncDetector）==========

  /**
   * Check if a callback is an async function (with caching).
   *
   * @param callback - The callback to check
   * @returns True if the callback is async
   * @public
   */
  isAsyncListener(callback: ActionCallback): boolean {
    return this.asyncDetector.isAsyncListener(callback)
  }

  /**
   * Runtime detection for functions that return Promises but aren't declared async.
   *
   * @param callback - The callback to check
   * @param testArgs - Arguments to pass to the callback for testing
   * @returns True if the callback returns a Promise
   * @public
   */
  async isAsyncListenerRuntime<TArgs = unknown>(
    callback: ActionCallback<TArgs>,
    testArgs: TArgs
  ): Promise<boolean> {
    return this.asyncDetector.isAsyncListenerRuntime(callback, testArgs)
  }

  /**
   * Get the size of the async detection cache (for testing/debugging).
   *
   * @returns Number of cached detection results
   * @public
   */
  getAsyncDetectionCacheSize(): number {
    return this.asyncDetector.getCacheSize()
  }

  /**
   * Clear the async detection cache.
   *
   * @public
   */
  clearAsyncDetectionCache(): void {
    this.asyncDetector.clearCache()
  }

  /**
   * Check if any listener for a hook is async (including type overrides).
   *
   * @param hook - Hook name
   * @returns True if any listener is async
   * @public
   */
  hasAsyncListeners(hook: string): boolean {
    return this.actionManager.hasAsyncListeners(hook)
  }

  /**
   * Get detailed information about all listeners for a hook.
   *
   * @param hook - Hook name
   * @returns Array of listener info objects
   * @public
   */
  getListenerInfo(hook: string): ListenerInfo[] {
    return this.actionManager.getListenerInfo(hook)
  }

  // ========== Queue Methods ==========

  /**
   * Get the current event queue depth.
   *
   * @returns Total number of events in the queue
   */
  getQueueDepth(): number {
    return this.eventQueue.getDepth()
  }

  /**
   * Get the event queue depth for a specific priority.
   *
   * @param priority - Priority level
   * @returns Number of events in the specified priority queue
   */
  getQueueDepthByPriority(priority: 'high' | 'normal' | 'low'): number {
    return this.eventQueue.getDepthByPriority(priority)
  }

  /**
   * Get the EventPriorityQueue instance.
   *
   * @returns EventPriorityQueue instance
   * @protected
   */
  protected getEventQueue(): EventPriorityQueue {
    return this.eventQueue
  }

  // ========== Listener Management ==========

  /**
   * Get all registered listeners for a hook.
   *
   * @param hook - Hook name
   * @returns Array of callbacks
   */
  getListeners(hook: string): ActionCallback[] {
    return this.actionManager.getListeners(hook)
  }

  /**
   * Remove all listeners for a specific action hook.
   *
   * @param hook - Hook name
   */
  removeAction(hook: string): void {
    this.actionManager.removeAction(hook)
  }

  // ========== Configuration ==========

  /**
   * Update HookManager configuration.
   *
   * @param config - New configuration
   */
  configure(config: Partial<HookManagerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    }
    this.actionManager.updateConfig(this.config)
  }

  /**
   * Get current configuration.
   *
   * @returns Current configuration
   */
  getConfig(): HookManagerConfig {
    return { ...this.config }
  }

  /**
   * Suppress migration warnings for a specific event.
   *
   * @param eventName - The name of the event to suppress warnings for
   * @public
   */
  suppressMigrationWarning(eventName: string): void {
    this.migrationWarner.suppress(eventName)
  }

  /**
   * Set the event backend for distributed processing.
   *
   * @param backend - Event backend instance
   */
  setBackend(backend: EventBackend): void {
    this.backend = backend
    this.actionManager.setBackend(backend)
  }

  // ========== Dead Letter Queue (In-Memory) ==========

  /**
   * Get the Dead Letter Queue instance.
   *
   * @returns Dead Letter Queue
   */
  getDLQ(): DeadLetterQueue | undefined {
    return this.dlq
  }

  /**
   * Requeue a failed event from the Dead Letter Queue.
   *
   * @param dlqEntryId - DLQ entry ID
   * @returns True if requeued successfully, false if entry not found
   */
  async requeueDLQEntry(dlqEntryId: string): Promise<boolean> {
    if (!this.dlq) {
      return false
    }
    return dlqRequeueEntry(dlqEntryId, this.dlq, (eventName, payload, options) =>
      this.doActionAsync(eventName, payload, options)
    )
  }

  /**
   * Requeue all failed events for a specific event name.
   *
   * @param eventName - Event name to requeue
   * @returns Number of events requeued
   */
  async requeueDLQBatch(eventName: string): Promise<number> {
    if (!this.dlq) {
      return 0
    }
    return dlqRequeueBatch(eventName, this.dlq, (entryId) => this.requeueDLQEntry(entryId))
  }

  /**
   * Get Dead Letter Queue entries with optional filtering.
   *
   * @param filter - Filter options
   * @returns Array of DLQ entries
   */
  getDLQEntries(filter: { eventName?: string; from?: number; to?: number; limit?: number } = {}) {
    if (!this.dlq) {
      return []
    }
    return this.dlq.list(filter)
  }

  /**
   * Get count of Dead Letter Queue entries for an event.
   *
   * @param eventName - Event name
   * @returns Count of entries
   */
  getDLQCount(eventName: string): number {
    if (!this.dlq) {
      return 0
    }
    return this.dlq.getCountByEvent(eventName)
  }

  /**
   * Delete a DLQ entry.
   *
   * @param entryId - DLQ entry ID
   * @returns True if deleted, false if not found
   */
  deleteDLQEntry(entryId: string): boolean {
    if (!this.dlq) {
      return false
    }
    return this.dlq.delete(entryId)
  }

  // ========== Circuit Breaker ==========

  /**
   * Get circuit breaker statistics for all events.
   *
   * @returns Array of circuit breaker statistics
   */
  getCircuitBreakerStats(): Array<{
    eventName: string
    state: string
    failureCount: number
    successCount: number
    lastFailureAt?: Date
    lastSuccessAt?: Date
    openedAt?: Date
    totalRequests: number
    totalFailures: number
    totalSuccesses: number
  }> {
    if (!(this.backend instanceof EventPriorityQueue)) {
      return []
    }

    const breakers = this.backend.getCircuitBreakers()
    const stats: Array<{
      eventName: string
      state: string
      failureCount: number
      successCount: number
      lastFailureAt?: Date
      lastSuccessAt?: Date
      openedAt?: Date
      totalRequests: number
      totalFailures: number
      totalSuccesses: number
    }> = []

    for (const [eventName, breaker] of breakers) {
      const metrics = breaker.getMetrics()
      stats.push({
        eventName,
        state: metrics.state,
        failureCount: metrics.failures,
        successCount: metrics.successes,
        lastFailureAt: metrics.lastFailureAt,
        lastSuccessAt: metrics.lastSuccessAt,
        openedAt: metrics.openedAt,
        totalRequests: metrics.totalRequests,
        totalFailures: metrics.totalFailures,
        totalSuccesses: metrics.totalSuccesses,
      })
    }

    return stats
  }

  /**
   * Reset a circuit breaker for an event.
   *
   * @param eventName - Event name
   * @returns True if reset, false if circuit breaker not found
   */
  resetCircuitBreaker(eventName: string): boolean {
    if (!(this.backend instanceof EventPriorityQueue)) {
      return false
    }

    return this.backend.resetCircuitBreaker(eventName)
  }

  // ========== Backpressure ==========

  /**
   * Get the current backpressure state.
   *
   * @returns Backpressure state ('NORMAL', 'WARNING', 'CRITICAL', 'OVERFLOW') or undefined if not enabled
   */
  getBackpressureState(): string | undefined {
    if (!(this.backend instanceof EventPriorityQueue)) {
      return undefined
    }

    const manager = this.backend.getBackpressureManager()
    return manager ? manager.getState() : undefined
  }

  /**
   * Get backpressure metrics snapshot.
   *
   * @returns Backpressure metrics snapshot or undefined if not enabled
   */
  getBackpressureMetrics(): object | undefined {
    if (!(this.backend instanceof EventPriorityQueue)) {
      return undefined
    }

    const manager = this.backend.getBackpressureManager()
    return manager ? manager.getMetrics() : undefined
  }

  // ========== Persistent DLQ ==========

  /**
   * Get the persistent DLQ manager instance.
   *
   * @returns DeadLetterQueueManager or undefined if not configured
   * @public
   */
  getPersistentDLQManager(): DeadLetterQueueManager | undefined {
    return this.persistentDlqManager
  }

  /**
   * Create a handler function for persistent DLQ.
   * This handler is used by EventPriorityQueue to persist failed events.
   *
   * @returns Handler function
   * @internal
   */
  private createPersistentDLQHandler() {
    if (!this.persistentDlqManager) {
      throw new Error('[HookManager] persistentDlqManager is not initialized')
    }
    return createPersistentDLQHandler(this.persistentDlqManager)
  }

  /**
   * Requeue a failed event from the persistent DLQ.
   *
   * @param dlqId - DLQ entry UUID
   * @returns True if requeued successfully
   * @public
   */
  async requeuePersistentDLQEntry(dlqId: string): Promise<boolean> {
    if (!this.persistentDlqManager) {
      return false
    }
    return persistentDlqRequeueEntry(dlqId, this.persistentDlqManager, (event, args, options) =>
      this.doActionAsync(event, args, options)
    )
  }

  /**
   * Requeue multiple events from persistent DLQ.
   *
   * @param filter - Filter criteria
   * @returns Result statistics
   * @public
   */
  async requeuePersistentDLQBatch(filter?: {
    eventName?: string
    status?: 'pending' | 'requeued' | 'resolved' | 'abandoned'
  }): Promise<{ total: number; succeeded: number; failed: number }> {
    if (!this.persistentDlqManager) {
      return { total: 0, succeeded: 0, failed: 0 }
    }
    return persistentDlqRequeueBatch(filter, this.persistentDlqManager)
  }

  // ========== Message Queue Bridge（分佈式處理）==========

  /**
   * Dispatch an event through Bull Queue（分佈式異步處理）.
   *
   * 與 doActionAsync() 不同：
   * - doActionAsync() 使用 EventPriorityQueue (Memory-based)
   * - dispatchQueued() 使用 Bull Queue (Redis-backed, 分佈式)
   *
   * 適用於需要持久化和跨進程處理的事件。
   *
   * @template TArgs - 事件參數類型
   * @param event - 事件名稱
   * @param args - 事件參數
   * @param options - 事件選項（可選）
   * @returns Job ID
   * @throws 如果未配置 MessageQueueBridge 或沒有 listeners
   *
   * @example
   * ```typescript
   * const jobId = await hookManager.dispatchQueued('order:created', {
   *   orderId: 'ORD-123',
   *   amount: 999.99
   * })
   * ```
   *
   * @public
   */
  async dispatchQueued<TArgs = unknown>(
    event: string,
    args: TArgs,
    options?: any
  ): Promise<string> {
    if (!this.messageQueueBridge) {
      throw new Error(
        '[HookManager] MessageQueueBridge not configured. Set messageQueueBridge in HookManagerConfig to use dispatchQueued().'
      )
    }

    return this.messageQueueBridge.dispatchWithQueue(event, args, options)
  }

  /**
   * Dispatch an event through Bull Queue with delay（延遲隊列分發）.
   *
   * @template TArgs - 事件參數類型
   * @param event - 事件名稱
   * @param args - 事件參數
   * @param delay - 延遲時間（毫秒）
   * @param options - 事件選項（可選）
   * @returns Job ID
   * @throws 如果未配置 MessageQueueBridge
   *
   * @example
   * ```typescript
   * // 延遲 5 秒後處理
   * const jobId = await hookManager.dispatchDeferredQueued(
   *   'reminder:send',
   *   { userId: '123' },
   *   5000
   * )
   * ```
   *
   * @public
   */
  async dispatchDeferredQueued<TArgs = unknown>(
    event: string,
    args: TArgs,
    delay: number,
    options?: any
  ): Promise<string> {
    if (!this.messageQueueBridge) {
      throw new Error(
        '[HookManager] MessageQueueBridge not configured. Set messageQueueBridge in HookManagerConfig to use dispatchDeferredQueued().'
      )
    }

    // 將延遲時間添加到 options
    const mergedOptions = {
      ...options,
      delay,
    }

    return this.messageQueueBridge.dispatchWithQueue(event, args, mergedOptions)
  }

  /**
   * Get the execution status of an event.
   *
   * 查詢事件執行狀態，支持查詢 Bull Queue 和 DLQ 中的事件。
   *
   * @param eventId - 事件 ID (task.id 或 jobId)
   * @returns 事件狀態信息
   * @throws 如果未配置 MessageQueueBridge
   *
   * @public
   */
  async getEventStatus(eventId: string): Promise<any> {
    if (!this.messageQueueBridge) {
      throw new Error(
        '[HookManager] MessageQueueBridge not configured. Set messageQueueBridge in HookManagerConfig to use getEventStatus().'
      )
    }

    return this.messageQueueBridge.getEventStatus(eventId)
  }

  /**
   * Get persistent DLQ statistics.
   *
   * @returns Statistics object with total, byEvent, and byStatus counts
   * @public
   */
  async getPersistentDLQStats() {
    if (!this.persistentDlqManager) {
      return undefined
    }

    try {
      return await this.persistentDlqManager.getStats()
    } catch (error) {
      console.error(`[HookManager] Error getting persistent DLQ stats:`, error)
      return undefined
    }
  }
}
