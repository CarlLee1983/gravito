import type { FilterCallback } from './types'

/**
 * 管理 filter hook 的登記與執行。
 *
 * Filter hook 用於轉換數值：每個 callback 接收前一個 callback 的回傳值，
 * 並返回新的轉換後數值。所有 callback 按登記順序依次執行。
 *
 * @internal
 */
export class FilterManager {
  /**
   * 儲存所有已登記的 filter callbacks。
   * Map key 為 hook 名稱，value 為 callback 陣列。
   */
  private filters: Map<string, FilterCallback[]> = new Map()

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
   * const content = await filterManager.applyFilters('content', 'hello world')
   * ```
   */
  async applyFilters<T = unknown>(hook: string, initialValue: T, ...args: unknown[]): Promise<T> {
    const callbacks = this.filters.get(hook) || []
    let value = initialValue

    for (const callback of callbacks) {
      try {
        value = (await callback(value, ...args)) as T
      } catch (error) {
        // biome-ignore lint/suspicious/noConsole: FilterManager has no Logger dependency — low-level hook infrastructure
        console.error(`[HookManager] Error in filter '${hook}':`, error)
        // 錯誤處理策略：記錄錯誤並繼續使用當前值
      }
    }

    return value
  }

  /**
   * Check if any filters are registered for a hook.
   *
   * @param hook - Hook name
   * @returns True if at least one filter is registered
   */
  hasFilters(hook: string): boolean {
    const callbacks = this.filters.get(hook)
    return callbacks !== undefined && callbacks.length > 0
  }

  /**
   * Get count of registered filters for a hook.
   *
   * @param hook - Hook name
   * @returns Number of registered filters
   */
  getFilterCount(hook: string): number {
    return this.filters.get(hook)?.length ?? 0
  }

  /**
   * Remove all filters for a specific hook.
   *
   * @param hook - Hook name
   */
  removeFilters(hook: string): void {
    this.filters.delete(hook)
  }
}
