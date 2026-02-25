import type { ActionCallback } from './types'

/**
 * 負責偵測 callback 函數是否為非同步（async）。
 *
 * 提供靜態偵測（透過函數簽名）和運行時偵測（透過執行函數）兩種方式，
 * 並包含快取機制以提升重複偵測的性能。
 *
 * @internal
 */
export class AsyncDetector {
  /**
   * 快取非同步偵測結果（WeakMap 以自動垃圾回收）。
   */
  private asyncDetectionCache: WeakMap<ActionCallback, boolean> = new WeakMap()

  /**
   * 快取中的項目計數（供測試/偵錯使用）。
   */
  private asyncDetectionCacheCount = 0

  /**
   * 儲存 listener type override（callback -> type）。
   */
  private listenerTypeOverrides: WeakMap<ActionCallback, 'sync' | 'async' | 'auto'> = new WeakMap()

  /**
   * 設定 listener 的 type override。
   *
   * @param callback - 目標 callback
   * @param type - Type override 值
   */
  setTypeOverride(callback: ActionCallback, type: 'sync' | 'async' | 'auto'): void {
    this.listenerTypeOverrides.set(callback, type)
  }

  /**
   * 取得 listener 的 type override。
   *
   * @param callback - 目標 callback
   * @returns Type override 或 undefined
   */
  getTypeOverride(callback: ActionCallback): 'sync' | 'async' | 'auto' | undefined {
    return this.listenerTypeOverrides.get(callback)
  }

  /**
   * Check if a callback is an async function (with caching).
   *
   * Detection methods:
   * 1. Check cache first
   * 2. Check type override
   * 3. Check constructor.name === 'AsyncFunction'
   * 4. Fallback: Check function string representation
   *
   * @param callback - The callback to check
   * @returns True if the callback is async
   * @public
   */
  isAsyncListener(callback: ActionCallback): boolean {
    // 先檢查快取
    const cachedResult = this.asyncDetectionCache.get(callback)
    if (cachedResult !== undefined) {
      return cachedResult
    }

    // 檢查 type override
    const typeOverride = this.listenerTypeOverrides.get(callback)
    if (typeOverride === 'async') {
      this.cacheResult(callback, true)
      return true
    }
    if (typeOverride === 'sync') {
      this.cacheResult(callback, false)
      return false
    }

    // 主要偵測：constructor name
    let isAsync = callback.constructor.name === 'AsyncFunction'

    // 備用偵測：函數字串表示
    // 處理邊緣情況，例如轉譯代碼或 bound functions
    if (!isAsync) {
      const fnStr = callback.toString()
      // 檢查起始的 async 關鍵字（處理 async arrow functions 和 async function expressions）
      isAsync = /^async\s/.test(fnStr) || fnStr.startsWith('async ')
    }

    // 快取結果
    this.cacheResult(callback, isAsync)

    return isAsync
  }

  /**
   * Check if a listener is effectively async (considering type override).
   *
   * @param callback - The callback to check
   * @returns True if the listener should be treated as async
   */
  isEffectivelyAsync(callback: ActionCallback): boolean {
    const typeOverride = this.listenerTypeOverrides.get(callback)

    if (typeOverride === 'async') {
      return true
    }
    if (typeOverride === 'sync') {
      return false
    }

    // 自動偵測
    return this.isAsyncListener(callback)
  }

  /**
   * Runtime detection for functions that return Promises but aren't declared async.
   *
   * 此方法會實際執行 callback 來檢查是否回傳 Promise，請謹慎使用。
   *
   * @param callback - The callback to check
   * @param testArgs - Arguments to pass to the callback for testing
   * @returns True if the callback returns a Promise
   * @public
   */
  async isAsyncListenerRuntime<TArgs = unknown>(
    callback: ActionCallback<TArgs>,
    testArgs: TArgs
  ): Promise<boolean> {
    try {
      const result = callback(testArgs)
      const isPromise = result instanceof Promise

      // 用運行時結果更新快取
      if (isPromise) {
        this.cacheResult(callback as ActionCallback, true)
        // 等待 promise 結算（避免懸掛的 promise）
        await result.catch(() => {
          // 刻意吞掉錯誤 - 我們只關心 Promise 偵測
        })
      }

      return isPromise
    } catch {
      // 如果 callback 拋出例外，視為 sync（錯誤由正常流程處理）
      return false
    }
  }

  /**
   * Get the size of the async detection cache (for testing/debugging).
   *
   * @returns Number of cached detection results
   */
  getCacheSize(): number {
    return this.asyncDetectionCacheCount
  }

  /**
   * Clear the async detection cache.
   */
  clearCache(): void {
    this.asyncDetectionCache = new WeakMap()
    this.asyncDetectionCacheCount = 0
  }

  /**
   * 快取非同步偵測結果。
   * @internal
   */
  private cacheResult(callback: ActionCallback, isAsync: boolean): void {
    if (!this.asyncDetectionCache.has(callback)) {
      this.asyncDetectionCacheCount++
    }
    this.asyncDetectionCache.set(callback, isAsync)
  }
}
