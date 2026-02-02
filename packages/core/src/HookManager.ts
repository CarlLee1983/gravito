import type { EventOptions } from './events/EventOptions'
import { DEFAULT_EVENT_OPTIONS } from './events/EventOptions'
import { EventPriorityQueue } from './events/EventPriorityQueue'

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
}

/**
 * Manager for WordPress-style hooks (actions and filters).
 * @public
 */
export class HookManager {
  private filters: Map<string, FilterCallback[]> = new Map()
  private actions: Map<string, ActionCallback[]> = new Map()
  private eventQueue: EventPriorityQueue
  private config: HookManagerConfig

  constructor(config: HookManagerConfig = {}) {
    this.config = {
      asyncByDefault: false,
      migrationMode: 'sync',
      showDeprecationWarnings: false,
      ...config,
    }
    this.eventQueue = new EventPriorityQueue()
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
  addAction<TArgs = unknown>(hook: string, callback: ActionCallback<TArgs>): void {
    if (!this.actions.has(hook)) {
      this.actions.set(hook, [])
    }
    // Generic type erasure for storage
    this.actions.get(hook)?.push(callback as unknown as ActionCallback)
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
    if (this.config.showDeprecationWarnings && this.config.migrationMode === 'hybrid') {
      console.warn(
        `[HookManager] Event "${hook}" is using synchronous dispatch. ` +
          `Consider migrating to async mode for better performance. ` +
          `See: https://gravito.dev/docs/events/async-migration`
      )
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
  private async doActionSync<TArgs = unknown>(hook: string, args: TArgs): Promise<void> {
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

    // Enqueue the event for async processing
    this.eventQueue.enqueue(hook, args, callbacks, mergedOptions)

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
      const hasAsyncListeners = callbacks.some((cb) => cb.constructor.name === 'AsyncFunction')
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
}
