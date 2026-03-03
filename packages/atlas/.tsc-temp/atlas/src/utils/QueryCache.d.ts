/**
 * QueryCache - 查詢結果快取工具
 *
 * 提供 TTL 型快取機制，用於快取查詢結果並減少資料庫負載。
 *
 * @example
 * ```typescript
 * const cache = new QueryCache()
 *
 * // 使用快取執行查詢
 * const users = await cache.remember(
 *   'users:all',
 *   async () => {
 *     return await db.table('users').get()
 *   },
 *   { ttl: 3600 } // 1 小時
 * )
 *
 * // 手動清除
 * await cache.forget('users:all')
 * ```
 */
export interface CacheOptions {
  /** 快取時間（秒） */
  ttl?: number
  /** 自訂序列化函數 */
  serialize?: (value: unknown) => string
  /** 自訂反序列化函數 */
  deserialize?: (value: string) => unknown
}
export interface CacheStats {
  hits: number
  misses: number
  totalEntries: number
  hitRate: number
}
export interface CacheEntry<T> {
  value: T
  createdAt: number
  ttl: number
  accessCount: number
  lastAccessedAt: number
}
export declare class QueryCache {
  private checkInterval
  private cache
  private stats
  private readonly DEFAULT_TTL
  private cleanupInterval
  constructor(checkInterval?: number)
  /**
   * 記住（Remember）查詢結果
   *
   * ✅ 快取命中時返回快取值
   * ✅ 快取未命中時執行回調並快取結果
   */
  remember<T>(key: string, callback: () => Promise<T>, options?: CacheOptions): Promise<T>
  /**
   * 取得快取值
   *
   * ✅ 自動檢查過期時間
   * ✅ 更新存取時間與計數
   */
  get<T>(key: string): T | null
  /**
   * 設定快取值
   */
  put<T>(key: string, value: T, options?: CacheOptions): void
  /**
   * 刪除快取
   */
  forget(key: string): boolean
  /**
   * 刪除多個快取（使用前綴匹配）
   *
   * @example
   * ```typescript
   * // 刪除所有以 'users:' 開頭的快取
   * cache.forgetByPrefix('users:')
   * ```
   */
  forgetByPrefix(prefix: string): number
  /**
   * 清空所有快取
   */
  flush(): void
  /**
   * 取得快取統計資訊
   */
  getStats(): CacheStats
  /**
   * 開始自動清理過期快取
   */
  private startCleanup
  /**
   * 停止清理
   */
  stopCleanup(): void
  /**
   * 析構：清理資源
   */
  destroy(): void
  /**
   * 取得所有快取鍵
   */
  keys(): string[]
  /**
   * 取得快取項目數
   */
  size(): number
  /**
   * 取得單個快取項目的詳細資訊
   */
  getEntry(key: string): CacheEntry<unknown> | null
}
export declare function getGlobalCache(): QueryCache
/**
 * 重設全域快取
 */
export declare function resetGlobalCache(): void
