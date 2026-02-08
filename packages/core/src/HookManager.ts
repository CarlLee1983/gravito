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
 * Options for listener registration.
 * @public
 */
export interface ListenerOptions {
  /**
   * Explicitly specify the listener type.
   * - 'sync': Force synchronous dispatch for this listener
   * - 'async': Force asynchronous dispatch for this listener
   * - 'auto': Auto-detect based on function signature (default)
   * @default 'auto'
   */
  type?: 'sync' | 'async' | 'auto'

  /**
   * Circuit breaker configuration for this listener.
   */
  circuitBreaker?: CircuitBreakerOptions
}

/**
 * Information about a registered listener.
 * @public
 */
export interface ListenerInfo {
  /**
   * The callback function.
   */
  callback: ActionCallback

  /**
   * Whether the listener is considered async.
   */
  isAsync: boolean

  /**
   * The explicit type override, if any.
   */
  typeOverride?: 'sync' | 'async' | 'auto'
}

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

  /**
   * Message Queue Bridge for distributed event processing via Bull Queue.
   * When provided, enables dispatchQueued() method for routing events to Redis-backed queue.
   */
  messageQueueBridge?: any
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
  private messageQueueBridge?: any
  private idempotencyCache: IdempotencyCache
  private config: HookManagerConfig
  private migrationWarner: MigrationWarner

  /**
   * Cache for async detection results (WeakMap for automatic garbage collection).
   * @internal
   */
  private asyncDetectionCache: WeakMap<ActionCallback, boolean> = new WeakMap()

  /**
   * Count of items in the async detection cache (for testing/debugging).
   * @internal
   */
  private asyncDetectionCacheCount = 0

  /**
   * Map of listener type overrides (callback -> type).
   * @internal
   */
  private listenerTypeOverrides: WeakMap<ActionCallback, 'sync' | 'async' | 'auto'> = new WeakMap()

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

    // Initialize Message Queue Bridge for distributed processing
    if (config.messageQueueBridge) {
      this.messageQueueBridge = config.messageQueueBridge
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
   * @param options - Optional listener options (type override, circuit breaker).
   *
   * @example
   * ```typescript
   * core.hooks.addAction('user_registered', async (user: User) => {
   *   await sendWelcomeEmail(user);
   * });
   *
   * // With explicit type override
   * core.hooks.addAction('sync_handler', handler, { type: 'async' });
   * ```
   */
  addAction<TArgs = unknown>(
    hook: string,
    callback: ActionCallback<TArgs>,
    options?: ListenerOptions
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

    // Store type override if specified
    if (options?.type && options.type !== 'auto') {
      this.listenerTypeOverrides.set(finalCallback as unknown as ActionCallback, options.type)
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

    this.backend.enqueue(task)

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
   * Check if a callback is an async function (with caching).
   *
   * Detection methods:
   * 1. Check cache first
   * 2. Check type override
   * 3. Check constructor.name === 'AsyncFunction'
   * 4. Fallback: Check function string representation
   *
   * @param callback - The callback to check
   * @returns True if the callback is async
   * @public
   */
  isAsyncListener(callback: ActionCallback): boolean {
    // Check cache first
    const cachedResult = this.asyncDetectionCache.get(callback)
    if (cachedResult !== undefined) {
      return cachedResult
    }

    // Check type override
    const typeOverride = this.listenerTypeOverrides.get(callback)
    if (typeOverride === 'async') {
      this.cacheAsyncResult(callback, true)
      return true
    }
    if (typeOverride === 'sync') {
      this.cacheAsyncResult(callback, false)
      return false
    }

    // Primary detection: constructor name
    let isAsync = callback.constructor.name === 'AsyncFunction'

    // Fallback detection: function string representation
    // This handles edge cases like transpiled code or bound functions
    if (!isAsync) {
      const fnStr = callback.toString()
      // Check for async keyword at the start (handles async arrow functions and async function expressions)
      isAsync = /^async\s/.test(fnStr) || fnStr.startsWith('async ')
    }

    // Cache result
    this.cacheAsyncResult(callback, isAsync)

    return isAsync
  }

  /**
   * Cache async detection result.
   * @internal
   */
  private cacheAsyncResult(callback: ActionCallback, isAsync: boolean): void {
    if (!this.asyncDetectionCache.has(callback)) {
      this.asyncDetectionCacheCount++
    }
    this.asyncDetectionCache.set(callback, isAsync)
  }

  /**
   * Runtime detection for functions that return Promises but aren't declared async.
   *
   * This method executes the callback with test args and checks if the result is a Promise.
   * Use with caution as it actually invokes the callback.
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
    try {
      const result = callback(testArgs)
      const isPromise = result instanceof Promise

      // Update cache with runtime result
      if (isPromise) {
        this.cacheAsyncResult(callback as ActionCallback, true)
        // Wait for the promise to settle (don't leave hanging promises)
        await result.catch(() => {
          // Intentionally swallow error - we only care about Promise detection
        })
      }

      return isPromise
    } catch {
      // If the callback throws, treat it as sync (error will be handled by normal flow)
      return false
    }
  }

  /**
   * Get the size of the async detection cache (for testing/debugging).
   *
   * @returns Number of cached detection results
   * @public
   */
  getAsyncDetectionCacheSize(): number {
    return this.asyncDetectionCacheCount
  }

  /**
   * Clear the async detection cache.
   *
   * @public
   */
  clearAsyncDetectionCache(): void {
    this.asyncDetectionCache = new WeakMap()
    this.asyncDetectionCacheCount = 0
  }

  /**
   * Check if any listener for a hook is async (including type overrides).
   *
   * @param hook - Hook name
   * @returns True if any listener is async
   * @public
   */
  hasAsyncListeners(hook: string): boolean {
    const callbacks = this.getListeners(hook)
    return callbacks.some((cb) => this.isListenerEffectivelyAsync(cb))
  }

  /**
   * Check if a listener is effectively async (considering type override).
   *
   * @param callback - The callback to check
   * @returns True if the listener should be treated as async
   * @internal
   */
  private isListenerEffectivelyAsync(callback: ActionCallback): boolean {
    const typeOverride = this.listenerTypeOverrides.get(callback)

    if (typeOverride === 'async') {
      return true
    }
    if (typeOverride === 'sync') {
      return false
    }

    // Auto detection
    return this.isAsyncListener(callback)
  }

  /**
   * Get detailed information about all listeners for a hook.
   *
   * @param hook - Hook name
   * @returns Array of listener info objects
   * @public
   */
  getListenerInfo(hook: string): ListenerInfo[] {
    const callbacks = this.getListeners(hook)

    return callbacks.map((callback) => {
      const typeOverride = this.listenerTypeOverrides.get(callback)
      const isAsync = this.isListenerEffectivelyAsync(callback)

      return {
        callback,
        isAsync,
        typeOverride,
      }
    })
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
      // Check if any callback is async (considering type overrides)
      const hasAsyncListeners = callbacks.some((cb) => this.isListenerEffectivelyAsync(cb))
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
   * Get the EventPriorityQueue instance.
   *
   * @returns EventPriorityQueue instance
   * @protected
   */
  protected getEventQueue(): EventPriorityQueue {
    return this.eventQueue
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
      _firstFailedAt: number
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
   * Dispatch an event through Bull Queue (分佈式異步處理).
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
   * Dispatch an event through Bull Queue with delay (延遲隊列分發).
   *
   * 通過 Bull Queue 的 delayed jobs 功能實現延遲處理。
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
   * @example
   * ```typescript
   * const status = await hookManager.getEventStatus('queue-1707000000000-abc123')
   * console.log(status) // { eventId, status, attempts, createdAt, ... }
   * ```
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
