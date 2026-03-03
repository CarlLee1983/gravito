import type { ActionCallback } from './types'
/**
 * 負責偵測 callback 函數是否為非同步（async）。
 *
 * 提供靜態偵測（透過函數簽名）和運行時偵測（透過執行函數）兩種方式，
 * 並包含快取機制以提升重複偵測的性能。
 *
 * @internal
 */
export declare class AsyncDetector {
  /**
   * 快取非同步偵測結果（WeakMap 以自動垃圾回收）。
   */
  private asyncDetectionCache
  /**
   * 快取中的項目計數（供測試/偵錯使用）。
   */
  private asyncDetectionCacheCount
  /**
   * 儲存 listener type override（callback -> type）。
   */
  private listenerTypeOverrides
  /**
   * 設定 listener 的 type override。
   *
   * @param callback - 目標 callback
   * @param type - Type override 值
   */
  setTypeOverride(callback: ActionCallback, type: 'sync' | 'async' | 'auto'): void
  /**
   * 取得 listener 的 type override。
   *
   * @param callback - 目標 callback
   * @returns Type override 或 undefined
   */
  getTypeOverride(callback: ActionCallback): 'sync' | 'async' | 'auto' | undefined
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
  isAsyncListener(callback: ActionCallback): boolean
  /**
   * Check if a listener is effectively async (considering type override).
   *
   * @param callback - The callback to check
   * @returns True if the listener should be treated as async
   */
  isEffectivelyAsync(callback: ActionCallback): boolean
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
  isAsyncListenerRuntime<TArgs = unknown>(
    callback: ActionCallback<TArgs>,
    testArgs: TArgs
  ): Promise<boolean>
  /**
   * Get the size of the async detection cache (for testing/debugging).
   *
   * @returns Number of cached detection results
   */
  getCacheSize(): number
  /**
   * Clear the async detection cache.
   */
  clearCache(): void
  /**
   * 快取非同步偵測結果。
   * @internal
   */
  private cacheResult
}
