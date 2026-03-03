import type { FilterCallback } from './types'
/**
 * 管理 filter hook 的登記與執行。
 *
 * Filter hook 用於轉換數值：每個 callback 接收前一個 callback 的回傳值，
 * 並返回新的轉換後數值。所有 callback 按登記順序依次執行。
 *
 * @internal
 */
export declare class FilterManager {
  /**
   * 儲存所有已登記的 filter callbacks。
   * Map key 為 hook 名稱，value 為 callback 陣列。
   */
  private filters
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
   * filterManager.addFilter('content', async (content: string) => {
   *   return content.toUpperCase()
   * })
   * ```
   */
  addFilter<T = unknown>(hook: string, callback: FilterCallback<T>): void
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
   * const content = await filterManager.applyFilters('content', 'hello world')
   * ```
   */
  applyFilters<T = unknown>(hook: string, initialValue: T, ...args: unknown[]): Promise<T>
  /**
   * Check if any filters are registered for a hook.
   *
   * @param hook - Hook name
   * @returns True if at least one filter is registered
   */
  hasFilters(hook: string): boolean
  /**
   * Get count of registered filters for a hook.
   *
   * @param hook - Hook name
   * @returns Number of registered filters
   */
  getFilterCount(hook: string): number
  /**
   * Remove all filters for a specific hook.
   *
   * @param hook - Hook name
   */
  removeFilters(hook: string): void
}
