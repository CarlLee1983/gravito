export type FilterCallback<T = unknown> = (value: T, ...args: unknown[]) => Promise<T> | T
export type ActionCallback<TArgs = unknown> = (args: TArgs) => Promise<void> | void

export class HookManager {
  private filters: Map<string, FilterCallback[]> = new Map()
  private actions: Map<string, ActionCallback[]> = new Map()

  /**
   * Register a filter hook.
   *
   * Filters are used to transform a value (input/output).
   *
   * @template T - The type of value being filtered.
   * @param hook - The name of the hook.
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
   * Actions are for side effects (no return value).
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
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
   * Run all registered actions sequentially.
   *
   * @template TArgs - The type of arguments passed to the action.
   * @param hook - The name of the hook.
   * @param args - The arguments to pass to the callbacks.
   *
   * @example
   * ```typescript
   * await core.hooks.doAction('user_registered', user);
   * ```
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
