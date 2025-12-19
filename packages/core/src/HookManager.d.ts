export type FilterCallback<T = any> = (value: T, ...args: unknown[]) => Promise<T> | T
export type ActionCallback<TArgs = any> = (args: TArgs) => Promise<void> | void
export declare class HookManager {
  private filters
  private actions
  /**
   * Register a filter hook.
   *
   * Filters are used to transform a value (input/output).
   */
  addFilter<T = any>(hook: string, callback: FilterCallback<T>): void
  /**
   * Apply all registered filters sequentially.
   *
   * Each callback receives the previous callback's return value.
   */
  applyFilters<T = any>(hook: string, initialValue: T, ...args: unknown[]): Promise<T>
  /**
   * Register an action hook.
   *
   * Actions are for side effects (no return value).
   */
  addAction<TArgs = any>(hook: string, callback: ActionCallback<TArgs>): void
  /**
   * Run all registered actions sequentially.
   */
  doAction<TArgs = any>(hook: string, args: TArgs): Promise<void>
}
//# sourceMappingURL=HookManager.d.ts.map
