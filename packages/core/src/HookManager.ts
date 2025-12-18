// biome-ignore lint/suspicious/noExplicitAny: convenient for users
export type FilterCallback<T = any> = (value: T, ...args: unknown[]) => Promise<T> | T
// biome-ignore lint/suspicious/noExplicitAny: convenient for users
export type ActionCallback<TArgs = any> = (args: TArgs) => Promise<void> | void

export class HookManager {
  private filters: Map<string, FilterCallback[]> = new Map()
  private actions: Map<string, ActionCallback[]> = new Map()

  /**
   * 註冊一個 Filter (過濾器)
   * 用於修改資料，有進有出
   */
  // biome-ignore lint/suspicious/noExplicitAny: convenient for users
  addFilter<T = any>(hook: string, callback: FilterCallback<T>): void {
    if (!this.filters.has(hook)) {
      this.filters.set(hook, [])
    }
    this.filters.get(hook)?.push(callback)
  }

  /**
   * 執行 Filters
   * 依序執行所有註冊的 callbacks，將結果傳遞給下一個
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
   * 註冊一個 Action (動作)
   * 用於觸發副作用，只進不出
   */
  // biome-ignore lint/suspicious/noExplicitAny: convenient for users
  addAction<TArgs = any>(hook: string, callback: ActionCallback<TArgs>): void {
    if (!this.actions.has(hook)) {
      this.actions.set(hook, [])
    }
    this.actions.get(hook)?.push(callback)
  }

  /**
   * 執行 Actions
   * 依序執行所有註冊的 callbacks
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
