// biome-ignore lint/suspicious/noExplicitAny: convenient for users
export type FilterCallback<T = any> = (value: T, ...args: unknown[]) => Promise<T> | T
// biome-ignore lint/suspicious/noExplicitAny: convenient for users
export type ActionCallback<TArgs = any> = (args: TArgs) => Promise<void> | void

export class HookManager {
  private filters: Map<string, FilterCallback[]> = new Map()
  private actions: Map<string, ActionCallback[]> = new Map()

  /**
   * Register a filter hook.
   *
   * Filters are used to transform a value (input/output).
   */
  // biome-ignore lint/suspicious/noExplicitAny: convenient for users
  addFilter<T = any>(hook: string, callback: FilterCallback<T>): void {
    if (!this.filters.has(hook)) {
      this.filters.set(hook, [])
    }
    this.filters.get(hook)?.push(callback)
  }

  /**
   * Apply all registered filters sequentially.
   *
   * Each callback receives the previous callback's return value.
   */
  // biome-ignore lint/suspicious/noExplicitAny: convenient for users
  async applyFilters<T = any>(hook: string, initialValue: T, ...args: unknown[]): Promise<T> {
    const callbacks = this.filters.get(hook) || []
    let value = initialValue

    for (const callback of callbacks) {
      try {
        value = await callback(value, ...args)
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
   * Actions are for side effects (no return value).
   */
  // biome-ignore lint/suspicious/noExplicitAny: convenient for users
  addAction<TArgs = any>(hook: string, callback: ActionCallback<TArgs>): void {
    if (!this.actions.has(hook)) {
      this.actions.set(hook, [])
    }
    this.actions.get(hook)?.push(callback)
  }

  /**
   * Run all registered actions sequentially.
   */
  // biome-ignore lint/suspicious/noExplicitAny: convenient for users
  async doAction<TArgs = any>(hook: string, args: TArgs): Promise<void> {
    const callbacks = this.actions.get(hook) || []

    for (const callback of callbacks) {
      try {
        await callback(args)
      } catch (error) {
        console.error(`[HookManager] Error in action '${hook}':`, error)
      }
    }
  }
}
