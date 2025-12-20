export type FilterCallback<T = unknown> = (value: T, ...args: unknown[]) => Promise<T> | T
export type ActionCallback<TArgs = unknown> = (args: TArgs) => Promise<void> | void

export class HookManager {
  private filters: Map<string, FilterCallback[]> = new Map()
  private actions: Map<string, ActionCallback[]> = new Map()

  /**
   * Register a filter hook.
   *
   * Filters are used to transform a value (input/output).
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
   * Actions are for side effects (no return value).
   */
  addAction<TArgs = unknown>(hook: string, callback: ActionCallback<TArgs>): void {
    if (!this.actions.has(hook)) {
      this.actions.set(hook, [])
    }
    // Generic type erasure for storage
    this.actions.get(hook)?.push(callback as unknown as ActionCallback)
  }

  /**
   * Run all registered actions sequentially.
   */
  async doAction<TArgs = unknown>(hook: string, args: TArgs): Promise<void> {
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
