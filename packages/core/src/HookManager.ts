import type { ConnectionContract } from '@gravito/atlas'
import { CircuitBreaker, type CircuitBreakerOptions } from './events/CircuitBreaker'
import { DeadLetterQueue } from './events/DeadLetterQueue'
import type { EventBackend } from './events/EventBackend'
import type { EventOptions } from './events/EventOptions'
import { DEFAULT_EVENT_OPTIONS } from './events/EventOptions'
import { EventPriorityQueue, type EventQueueConfig } from './events/EventPriorityQueue'
import { IdempotencyCache } from './events/IdempotencyCache'
import type { EventTask } from './events/types'
import { DeadLetterQueueManager } from './reliability/DeadLetterQueueManager'

/**
 * Callback function for filters (transforms values).
 * @public
 */
export type FilterCallback<T = unknown> = (value: T, ...args: unknown[]) => Promise<T> | T

/**
 * Callback function for actions (side effects).
 * @public
 */
export type ActionCallback<TArgs = unknown> = (args: TArgs) => Promise<void> | void

/**
 * Configuration for HookManager.
 * @public
 */
export interface HookManagerConfig {
  /**
   * Enable async event dispatch by default.
   * When true, doAction() will automatically use async dispatch if any listener is async.
   * @default false
   */
  asyncByDefault?: boolean

  /**
   * Migration mode for backward compatibility.
   * - 'sync': All events use synchronous dispatch (legacy mode)
   * - 'hybrid': Auto-detect and use async for async listeners (recommended)
   * - 'async': All events use async dispatch (future mode)
   * @default 'sync'
   */
  migrationMode?: 'sync' | 'hybrid' | 'async'

  /**
   * Enable deprecation warnings for synchronous event dispatch.
   * @default false
   */
  showDeprecationWarnings?: boolean

  /**
   * Enable Dead Letter Queue for failed events.
   * @default true
   */
  enableDLQ?: boolean

  /**
   * Configuration for the event priority queue (Backpressure).
   */
  queue?: EventQueueConfig

  /**
   * Custom event backend for distributed processing.
   */
  backend?: EventBackend

  /**
   * Database connection for persistent DLQ (optional).
   * If provided, failed events after max retries will be persisted to database.
   */
  db?: ConnectionContract

  /**
   * Enable persistent DLQ for failed events (requires db).
   * @default false
   */
  enablePersistentDLQ?: boolean
}

/**
 * Manager for WordPress-style hooks (actions and filters).
 * @public
 */
/**
 * Migration warning manager for deprecation warnings.
 * @internal
 */
class MigrationWarner {
  private suppressedWarnings: Set<string> = new Set()

  constructor() {
    // Load suppressed warnings from environment variable
    const suppressed = process.env.GRAVITO_SUPPRESS_MIGRATION_WARNING
    if (suppressed) {
      suppressed.split(',').forEach((event) => {
        this.suppressedWarnings.add(event.trim())
      })
    }
  }

  warn(eventName: string, message: string): void {
    if (this.suppressedWarnings.has(eventName)) {
      return
    }

    console.warn(`[Gravito Migration] Event "${eventName}" using synchronous dispatch`)
    console.warn(`  ${message}`)
    console.warn(`  Reference: https://gravito.dev/docs/events/async-migration`)
    console.warn(`  To suppress this warning: GRAVITO_SUPPRESS_MIGRATION_WARNING="${eventName}"`)
  }

  suppress(eventName: string): void {
    this.suppressedWarnings.add(eventName)
  }
}

export class HookManager {
  private filters: Map<string, FilterCallback[]> = new Map()
  private actions: Map<string, ActionCallback[]> = new Map()
  private eventQueue: EventPriorityQueue
  private backend: EventBackend
  private dlq?: DeadLetterQueue
  private persistentDlqManager?: DeadLetterQueueManager
  private idempotencyCache: IdempotencyCache
  private config: HookManagerConfig
  private migrationWarner: MigrationWarner

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
    this.idempotencyCache = new IdempotencyCache()
    this.migrationWarner = new MigrationWarner()

    // Initialize in-memory DLQ
    if (config.enableDLQ ?? true) {
      if (this.backend instanceof EventPriorityQueue) {
        this.dlq = new DeadLetterQueue()
        this.eventQueue.setDeadLetterQueue(this.dlq)
      }
    }

    // Initialize persistent DLQ if enabled
    if (config.enablePersistentDLQ && config.db) {
      this.persistentDlqManager = new DeadLetterQueueManager(config.db)
    }

    // Set persistent DLQ handler on EventPriorityQueue if available
    if (this.persistentDlqManager && this.backend instanceof EventPriorityQueue) {
      this.eventQueue.setPersistentDLQHandler(this.createPersistentDLQHandler())
    }
  }

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
   *   return content.toUpperCase();
   * });
   * ```
   */
  addFilter<T = unknown>(hook: string, callback: FilterCallback<T>): void {
    if (!this.filters.has(hook)) {
      this.filters.set(hook, [])
    }
    // Generic type erasure for storage
    this.filters.get(hook)?.push(callback as unknown as FilterCallback)
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
   * const content = await core.hooks.applyFilters('content', 'hello world');
   * ```
   */
  async applyFilters<T = unknown>(hook: string, initialValue: T, ...args: unknown[]): Promise<T> {
    const callbacks = this.filters.get(hook) || []
    let value = initialValue

    for (const callback of callbacks) {
      try {
        value = (await callback(value, ...args)) as T
      } catch (error) {
        console.error(`[HookManager] Error in filter '${hook}':`, error)
        // Error handling strategy: log error and continue with current value
      }
    }

    return value
  }

  /**
   * Register an action hook.
   *
   * Actions are used to trigger side effects (e.g., logging, sending emails)
   * at specific points in the application lifecycle.
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The unique name of the hook.
   * @param callback - The callback function to execute.
   *
   * @example
   * ```typescript
   * core.hooks.addAction('user_registered', async (user: User) => {
   *   await sendWelcomeEmail(user);
   * });
   * ```
   */
  addAction<TArgs = unknown>(
    hook: string,
    callback: ActionCallback<TArgs>,
    options?: {
      circuitBreaker?: CircuitBreakerOptions
    }
  ): void {
    if (!this.actions.has(hook)) {
      this.actions.set(hook, [])
    }

    let finalCallback = callback

    if (options?.circuitBreaker) {
      const breaker = new CircuitBreaker(options.circuitBreaker)

      finalCallback = async (args: TArgs) => {
        return breaker.execute(async () => {
          const result = callback(args)
          if (result instanceof Promise) {
            await result
          }
        })
      }
    }

    // Generic type erasure for storage
    this.actions.get(hook)?.push(finalCallback as unknown as ActionCallback)
  }

  /**
   * Run all registered actions.
   *
   * This method supports both synchronous and asynchronous dispatch based on configuration.
   * In hybrid mode, it auto-detects async listeners and uses async dispatch.
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
   * @param args - The arguments to pass to the callbacks.
   * @param options - Optional event options for async dispatch.
   *
   * @example
   * ```typescript
   * await core.hooks.doAction('user_registered', user);
   * ```
   */
  async doAction<TArgs = unknown>(
    hook: string,
    args: TArgs,
    options?: EventOptions
  ): Promise<void> {
    const callbacks = this.actions.get(hook) || []

    // Check if we should use async dispatch
    const shouldUseAsync = this.shouldUseAsyncDispatch(callbacks, options)

    if (shouldUseAsync) {
      return this.doActionAsync(hook, args, options)
    }

    // Synchronous dispatch (legacy mode)
    if (this.config.showDeprecationWarnings || this.config.migrationMode === 'hybrid') {
      // Show migration warning in hybrid mode or when explicitly enabled
      if (this.config.migrationMode === 'hybrid' || this.config.showDeprecationWarnings) {
        this.migrationWarner.warn(
          hook,
          'Consider migrating to async mode for better performance and reliability.'
        )
      }
    }

    return this.doActionSync(hook, args)
  }

  /**
   * Run all registered actions synchronously (legacy mode).
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
   * @param args - The arguments to pass to the callbacks.
   * @internal
   */
  async doActionSync<TArgs = unknown>(hook: string, args: TArgs): Promise<void> {
    const callbacks = this.actions.get(hook) || []

    for (const callback of callbacks) {
      try {
        await callback(args)
      } catch (error) {
        console.error(`[HookManager] Error in action '${hook}':`, error)
      }
    }
  }

  /**
   * Run all registered actions asynchronously via priority queue.
   *
   * This method uses EventPriorityQueue for async dispatch with support for:
   * - Priority-based processing (high > normal > low)
   * - Timeout handling
   * - Ordering guarantees (strict, partition, none)
   * - Idempotency
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
   * });
   * ```
   */
  async doActionAsync<TArgs = unknown>(
    hook: string,
    args: TArgs,
    options: EventOptions = {}
  ): Promise<void> {
    const callbacks = this.actions.get(hook) || []

    if (callbacks.length === 0) {
      return
    }

    // Merge with default options
    const mergedOptions: EventOptions = {
      ...DEFAULT_EVENT_OPTIONS,
      ...options,
      async: true,
    }

    // Check for idempotency
    if (mergedOptions.idempotencyKey) {
      const ttl = mergedOptions.ttl || DEFAULT_EVENT_OPTIONS.ttl
      const isDuplicate = this.idempotencyCache.isDuplicate(mergedOptions.idempotencyKey, ttl)

      if (isDuplicate) {
        console.warn(
          `[HookManager] Event '${hook}' with idempotency key '${mergedOptions.idempotencyKey}' was skipped (duplicate within TTL window)`
        )
        return
      }
    }

    // Use backend to enqueue
    // We construct the task here to ensure consistent ID generation and type safety
    const task: EventTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      hook,
      args,
      callbacks: callbacks as ActionCallback[],
      options: mergedOptions,
      createdAt: Date.now(),
      partitionKey: mergedOptions.partitionKey,
      retryCount: 0,
    }

    const result = this.backend.enqueue(task)
    if (result instanceof Promise) {
      await result
    }

    // Note: We don't await the queue processing here
    // Events are processed asynchronously in the background
  }

  /**
   * Determine if async dispatch should be used.
   *
   * @param callbacks - Callbacks to check
   * @param options - Event options
   * @returns True if async dispatch should be used
   * @internal
   */
  /**
   * Determine the dispatch mode for an event.
   *
   * @param eventName - The name of the event
   * @param options - Optional event options
   * @returns The dispatch mode: 'sync' or 'async'
   * @public
   */
  detectMode(eventName: string, options?: EventOptions): 'sync' | 'async' {
    const callbacks = this.getListeners(eventName)
    const shouldUseAsync = this.shouldUseAsyncDispatch(callbacks, options)
    return shouldUseAsync ? 'async' : 'sync'
  }

  /**
   * Check if a callback is an async function.
   *
   * @param callback - The callback to check
   * @returns True if the callback is async
   * @public
   */
  isAsyncListener(callback: ActionCallback): boolean {
    return callback.constructor.name === 'AsyncFunction'
  }

  private shouldUseAsyncDispatch(callbacks: ActionCallback[], options?: EventOptions): boolean {
    // Explicit async option
    if (options?.async === true) {
      return true
    }

    // Explicit sync option
    if (options?.async === false) {
      return false
    }

    // Migration mode: async
    if (this.config.migrationMode === 'async') {
      return true
    }

    // Migration mode: sync
    if (this.config.migrationMode === 'sync') {
      return false
    }

    // Migration mode: hybrid (auto-detect)
    if (this.config.migrationMode === 'hybrid') {
      // Check if any callback is async
      const hasAsyncListeners = callbacks.some((cb) => this.isAsyncListener(cb))
      return hasAsyncListeners || this.config.asyncByDefault === true
    }

    return false
  }

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
   * Get all registered listeners for a hook.
   *
   * @param hook - Hook name
   * @returns Array of callbacks
   * @internal
   */
  getListeners(hook: string): ActionCallback[] {
    return this.actions.get(hook) || []
  }

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
  }

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
    if (!this.dlq) return false
    const entry = this.dlq.get(dlqEntryId)

    if (!entry) {
      return false
    }

    // Update last retried timestamp
    this.dlq.updateLastRetried(dlqEntryId)

    // Requeue the event
    await this.doActionAsync(entry.eventName, entry.payload, entry.options)

    // Delete from DLQ after successful requeue
    this.dlq.delete(dlqEntryId)

    return true
  }

  /**
   * Requeue all failed events for a specific event name.
   *
   * @param eventName - Event name to requeue
   * @returns Number of events requeued
   */
  async requeueDLQBatch(eventName: string): Promise<number> {
    if (!this.dlq) return 0
    const entries = this.dlq.list({ eventName })
    let requeuedCount = 0

    for (const entry of entries) {
      const success = await this.requeueDLQEntry(entry.id)
      if (success) {
        requeuedCount++
      }
    }

    return requeuedCount
  }

  /**
   * Get Dead Letter Queue entries with optional filtering.
   *
   * @param filter - Filter options
   * @returns Array of DLQ entries
   */
  getDLQEntries(filter: { eventName?: string; from?: number; to?: number; limit?: number } = {}) {
    if (!this.dlq) return []
    return this.dlq.list(filter)
  }

  /**
   * Get count of Dead Letter Queue entries for an event.
   *
   * @param eventName - Event name
   * @returns Count of entries
   */
  getDLQCount(eventName: string): number {
    if (!this.dlq) return 0
    return this.dlq.getCountByEvent(eventName)
  }

  /**
   * Delete a DLQ entry.
   *
   * @param entryId - DLQ entry ID
   * @returns True if deleted, false if not found
   */
  deleteDLQEntry(entryId: string): boolean {
    if (!this.dlq) return false
    return this.dlq.delete(entryId)
  }

  /**
   * Remove all listeners for a specific action hook.
   *
   * @param hook - Hook name
   */
  removeAction(hook: string): void {
    this.actions.delete(hook)
  }

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
    return async (
      hook: string,
      args: unknown,
      options: EventOptions,
      error: Error,
      retryCount: number,
      firstFailedAt: number
    ) => {
      if (!this.persistentDlqManager) {
        return
      }

      try {
        // Convert event options to retry policy
        const retryPolicy = options.retry
          ? {
              maxRetries: options.retry.maxRetries || 3,
              backoff: options.retry.backoff || 'exponential',
              initialDelayMs: options.retry.initialDelayMs || 1000,
              maxDelayMs: options.retry.maxDelayMs || 30000,
            }
          : undefined

        // Move to persistent DLQ
        await this.persistentDlqManager.moveToDlq(
          hook,
          args,
          options,
          error,
          retryCount,
          retryPolicy
        )
      } catch (dlqError) {
        console.error(`[HookManager] Error moving event to persistent DLQ:`, dlqError)
      }
    }
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

    try {
      const event = await this.persistentDlqManager.getById(dlqId)
      if (!event) {
        return false
      }

      // Requeue the event
      await this.doActionAsync(
        event.event_name,
        event.event_payload,
        event.event_options as EventOptions
      )

      // Mark as requeued
      await this.persistentDlqManager.requeue(dlqId)

      return true
    } catch (error) {
      console.error(`[HookManager] Error requeuing persistent DLQ entry:`, error)
      return false
    }
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

    try {
      return await this.persistentDlqManager.retryBatch(filter)
    } catch (error) {
      console.error(`[HookManager] Error in persistent DLQ batch retry:`, error)
      return { total: 0, succeeded: 0, failed: 0 }
    }
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
