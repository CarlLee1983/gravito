import type { EventBackend } from '../events/EventBackend'
import type { EventOptions } from '../events/EventOptions'
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
export declare class ActionManager {
  /**
   * 儲存所有已登記的 action callbacks。
   */
  private actions
  private backend
  private idempotencyCache
  private config
  private asyncDetector
  private migrationWarner
  private aggregationManager?
  constructor(
    backend: EventBackend,
    config: HookManagerConfig,
    asyncDetector: AsyncDetector,
    migrationWarner: MigrationWarner
  )
  /**
   * 更新設定。
   */
  updateConfig(config: HookManagerConfig): void
  /**
   * 更新 backend。
   */
  setBackend(backend: EventBackend): void
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
  ): void
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
  ): 'async' | 'sync'
  /**
   * Run all registered actions synchronously (legacy mode).
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
   * @param args - The arguments to pass to the callbacks.
   */
  doActionSync<TArgs = unknown>(hook: string, args: TArgs): Promise<void>
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
  doActionAsync<TArgs = unknown>(hook: string, args: TArgs, options?: EventOptions): Promise<void>
  /**
   * Determine if async dispatch should be used.
   *
   * @param callbacks - Callbacks to check
   * @param options - Event options
   * @returns True if async dispatch should be used
   */
  shouldUseAsyncDispatch(callbacks: ActionCallback[], options?: EventOptions): boolean
  /**
   * Determine the dispatch mode for an event.
   *
   * @param hook - Hook name
   * @param options - Optional event options
   * @returns The dispatch mode: 'sync' or 'async'
   */
  detectMode(hook: string, options?: EventOptions): 'sync' | 'async'
  /**
   * Check if any listener for a hook is async (including type overrides).
   *
   * @param hook - Hook name
   * @returns True if any listener is async
   */
  hasAsyncListeners(hook: string): boolean
  /**
   * Get detailed information about all listeners for a hook.
   *
   * @param hook - Hook name
   * @returns Array of listener info objects
   */
  getListenerInfo(hook: string): ListenerInfo[]
  /**
   * Get all registered listeners for a hook.
   *
   * @param hook - Hook name
   * @returns Array of callbacks
   */
  getListeners(hook: string): ActionCallback[]
  /**
   * Remove all listeners for a specific action hook.
   *
   * @param hook - Hook name
   */
  removeAction(hook: string): void
}
