import { EventAggregationManager } from '../events/aggregation/EventAggregationManager'
import { CircuitBreaker } from '../events/CircuitBreaker'
import type { EventBackend } from '../events/EventBackend'
import type { EventOptions } from '../events/EventOptions'
import { DEFAULT_EVENT_OPTIONS } from '../events/EventOptions'
import { EventPriorityQueue } from '../events/EventPriorityQueue'
import { IdempotencyCache } from '../events/IdempotencyCache'
import type { EventTask } from '../events/types'
import type { AsyncDetector } from './AsyncDetector'
import type { MigrationWarner } from './MigrationWarner'
import type { ActionCallback, HookManagerConfig, ListenerInfo, ListenerOptions } from './types'

/**
 * 管理 action hook 的登記與執行。
 *
 * Action hook 用於觸發副作用（例如發送 email、記錄日誌）。
 * 支援同步和非同步執行模式，以及透過 EventPriorityQueue 的優先級佇列處理。
 *
 * @internal
 */
export class ActionManager {
  /**
   * 儲存所有已登記的 action callbacks。
   */
  private actions: Map<string, ActionCallback[]> = new Map()

  private backend: EventBackend
  private idempotencyCache: IdempotencyCache
  private config: HookManagerConfig
  private asyncDetector: AsyncDetector
  private migrationWarner: MigrationWarner
  private aggregationManager?: EventAggregationManager

  constructor(
    backend: EventBackend,
    config: HookManagerConfig,
    asyncDetector: AsyncDetector,
    migrationWarner: MigrationWarner
  ) {
    this.backend = backend
    this.config = config
    this.asyncDetector = asyncDetector
    this.migrationWarner = migrationWarner
    this.idempotencyCache = new IdempotencyCache()

    // 初始化事件聚合管理器（FS-102）
    if (config.aggregation?.enabled) {
      this.aggregationManager = new EventAggregationManager(config.aggregation)
      this.aggregationManager.setSubmitToQueueFn((tasks) => {
        for (const task of tasks) {
          this.backend.enqueue(task)
        }
        return Promise.resolve()
      })
      // 連接 backpressure manager 以調整窗口
      if (this.backend instanceof EventPriorityQueue) {
        const backpressure = this.backend.getBackpressureManager()
        if (backpressure) {
          this.aggregationManager.setBackpressureManager(backpressure)
        }
      }
    }
  }

  /**
   * 更新設定。
   */
  updateConfig(config: HookManagerConfig): void {
    this.config = config
  }

  /**
   * 更新 backend。
   */
  setBackend(backend: EventBackend): void {
    this.backend = backend
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
   * actionManager.addAction('user_registered', async (user: User) => {
   *   await sendWelcomeEmail(user)
   * })
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

    // 如有 type override，儲存至 AsyncDetector
    if (options?.type && options.type !== 'auto') {
      this.asyncDetector.setTypeOverride(finalCallback as unknown as ActionCallback, options.type)
    }

    // Generic type erasure for storage
    this.actions.get(hook)?.push(finalCallback as unknown as ActionCallback)
  }

  /**
   * 判斷是否需要使用非同步 dispatch，並在需要時發出遷移警告。
   *
   * 此方法僅判斷 dispatch 模式和發出警告，不執行實際的 dispatch。
   * 實際執行由 HookManager.doAction 負責，以確保 ObservableHookManager 等子類別
   * 的多型覆寫（override）能正確攔截 doActionSync / doActionAsync 呼叫。
   *
   * @param hook - Hook name
   * @param args - Event args (unused here, kept for API consistency)
   * @param options - Event options
   * @returns 'async' if async dispatch should be used, 'sync' otherwise
   */
  resolveDispatchMode<TArgs = unknown>(
    hook: string,
    _args: TArgs,
    options?: EventOptions
  ): 'async' | 'sync' {
    const callbacks = this.actions.get(hook) || []
    const shouldUseAsync = this.shouldUseAsyncDispatch(callbacks, options)

    if (!shouldUseAsync) {
      // 同步 dispatch（legacy mode）—發出遷移警告
      if (this.config.showDeprecationWarnings || this.config.migrationMode === 'hybrid') {
        if (this.config.migrationMode === 'hybrid' || this.config.showDeprecationWarnings) {
          this.migrationWarner.warn(
            hook,
            'Consider migrating to async mode for better performance and reliability.'
          )
        }
      }
    }

    return shouldUseAsync ? 'async' : 'sync'
  }

  /**
   * Run all registered actions synchronously (legacy mode).
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
   * @param args - The arguments to pass to the callbacks.
   */
  async doActionSync<TArgs = unknown>(hook: string, args: TArgs): Promise<void> {
    const callbacks = this.actions.get(hook) || []

    for (const callback of callbacks) {
      try {
        await callback(args)
      } catch (error) {
        // biome-ignore lint/suspicious/noConsole: ActionManager has no Logger dependency — low-level event infrastructure
        console.error(`[HookManager] Error in action '${hook}':`, error)
      }
    }
  }

  /**
   * Run all registered actions asynchronously via priority queue.
   *
   * 透過 EventPriorityQueue 進行非同步 dispatch，支援：
   * - 優先級處理（high > normal > low）
   * - 超時處理
   * - 順序保證（strict、partition、none）
   * - 冪等性
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
   * @param args - The arguments to pass to the callbacks.
   * @param options - Event options for async dispatch.
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

    // 與預設選項合併
    const mergedOptions: EventOptions = {
      ...DEFAULT_EVENT_OPTIONS,
      ...options,
      async: true,
    }

    // 冪等性檢查
    if (mergedOptions.idempotencyKey) {
      const ttl = mergedOptions.ttl || DEFAULT_EVENT_OPTIONS.ttl
      const isDuplicate = this.idempotencyCache.isDuplicate(mergedOptions.idempotencyKey, ttl)

      if (isDuplicate) {
        // biome-ignore lint/suspicious/noConsole: ActionManager has no Logger dependency — low-level event infrastructure
        console.warn(
          `[HookManager] Event '${hook}' with idempotency key '${mergedOptions.idempotencyKey}' was skipped (duplicate within TTL window)`
        )
        return
      }
    }

    // 使用 backend 加入佇列
    const nowMs = Date.now()
    const task: EventTask = {
      id: `task-${nowMs}-${Math.random().toString(36).substr(2, 9)}`,
      hook,
      args,
      callbacks: callbacks as ActionCallback[],
      options: mergedOptions,
      createdAt: nowMs,
      enqueuedAt: nowMs,
      partitionKey: mergedOptions.partitionKey,
      retryCount: 0,
    }

    // === FS-102: Aggregation layer interception ===
    if (this.aggregationManager && mergedOptions.aggregation?.enabled) {
      try {
        const accepted = await this.aggregationManager.submit(task)
        if (!accepted) {
          // biome-ignore lint/suspicious/noConsole: ActionManager has no Logger dependency — low-level event infrastructure
          console.warn(
            `[HookManager] Event '${hook}' was rejected due to backpressure (aggregation overflow)`
          )
        }
      } catch (error) {
        // biome-ignore lint/suspicious/noConsole: ActionManager has no Logger dependency — low-level event infrastructure
        console.error(`[HookManager] Aggregation error for event '${hook}':`, error)
        // 錯誤時降級至直接加入佇列
        this.backend.enqueue(task)
      }
    } else {
      // 直接加入佇列，不使用聚合
      this.backend.enqueue(task)
    }

    // 注意：此處不 await 佇列處理
    // 事件在背景非同步處理
  }

  /**
   * Determine if async dispatch should be used.
   *
   * @param callbacks - Callbacks to check
   * @param options - Event options
   * @returns True if async dispatch should be used
   */
  shouldUseAsyncDispatch(callbacks: ActionCallback[], options?: EventOptions): boolean {
    // 明確指定 async 選項
    if (options?.async === true) {
      return true
    }

    // 明確指定 sync 選項
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

    // Migration mode: hybrid（自動偵測）
    if (this.config.migrationMode === 'hybrid') {
      const hasAsyncListeners = callbacks.some((cb) => this.asyncDetector.isEffectivelyAsync(cb))
      return hasAsyncListeners || this.config.asyncByDefault === true
    }

    return false
  }

  /**
   * Determine the dispatch mode for an event.
   *
   * @param hook - Hook name
   * @param options - Optional event options
   * @returns The dispatch mode: 'sync' or 'async'
   */
  detectMode(hook: string, options?: EventOptions): 'sync' | 'async' {
    const callbacks = this.getListeners(hook)
    const shouldUseAsync = this.shouldUseAsyncDispatch(callbacks, options)
    return shouldUseAsync ? 'async' : 'sync'
  }

  /**
   * Check if any listener for a hook is async (including type overrides).
   *
   * @param hook - Hook name
   * @returns True if any listener is async
   */
  hasAsyncListeners(hook: string): boolean {
    const callbacks = this.getListeners(hook)
    return callbacks.some((cb) => this.asyncDetector.isEffectivelyAsync(cb))
  }

  /**
   * Get detailed information about all listeners for a hook.
   *
   * @param hook - Hook name
   * @returns Array of listener info objects
   */
  getListenerInfo(hook: string): ListenerInfo[] {
    const callbacks = this.getListeners(hook)

    return callbacks.map((callback) => {
      const typeOverride = this.asyncDetector.getTypeOverride(callback)
      const isAsync = this.asyncDetector.isEffectivelyAsync(callback)

      return {
        callback,
        isAsync,
        typeOverride,
      }
    })
  }

  /**
   * Get all registered listeners for a hook.
   *
   * @param hook - Hook name
   * @returns Array of callbacks
   */
  getListeners(hook: string): ActionCallback[] {
    return this.actions.get(hook) || []
  }

  /**
   * Remove all listeners for a specific action hook.
   *
   * @param hook - Hook name
   */
  removeAction(hook: string): void {
    this.actions.delete(hook)
  }
}
