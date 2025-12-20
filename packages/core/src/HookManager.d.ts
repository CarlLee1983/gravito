export type FilterCallback<T = unknown> = (value: T, ...args: unknown[]) => Promise<T> | T
export type ActionCallback<TArgs = unknown> = (args: TArgs) => Promise<void> | void
export declare class HookManager {
  private filters
  private actions
  /**
   * Register a filter hook.
   *
   * Filters are used to transform a value (input/output).
   */
  addFilter<T = unknown>(hook: string, callback: FilterCallback<T>): void
  /**
   * Apply all registered filters sequentially.
   *
   * Each callback receives the previous callback's return value.
   */
  applyFilters<T = unknown>(hook: string, initialValue: T, ...args: unknown[]): Promise<T>
  /**
   * Register an action hook.
   *
   * Actions are for side effects (no return value).
   */
  addAction<TArgs = unknown>(hook: string, callback: ActionCallback<TArgs>): void
  /**
   * Run all registered actions sequentially.
   */
  doAction<TArgs = unknown>(hook: string, args: TArgs): Promise<void>
}
//# sourceMappingURL=HookManager.d.ts.map
