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

export class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private stats = {
    hits: 0,
    misses: 0,
  }
  private readonly DEFAULT_TTL = 300 // 5 分鐘
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(private checkInterval = 60000) {
    // 每分鐘檢查一次過期的快取
    this.startCleanup()
  }

  /**
   * 記住（Remember）查詢結果
   *
   * ✅ 快取命中時返回快取值
   * ✅ 快取未命中時執行回調並快取結果
   */
  async remember<T>(
    key: string,
    callback: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const ttl = options.ttl || this.DEFAULT_TTL

    // 檢查快取
    const cached = this.get<T>(key)
    if (cached !== null) {
      this.stats.hits++
      return cached
    }

    // 快取未命中，執行回調
    this.stats.misses++
    const result = await callback()

    // 快取結果
    this.put(key, result, { ttl })

    return result
  }

  /**
   * 取得快取值
   *
   * ✅ 自動檢查過期時間
   * ✅ 更新存取時間與計數
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) {
      return null
    }

    // 檢查是否過期
    const now = Date.now()
    const age = (now - entry.createdAt) / 1000

    if (age > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    // 更新存取資訊
    entry.accessCount++
    entry.lastAccessedAt = now

    return entry.value
  }

  /**
   * 設定快取值
   */
  put<T>(key: string, value: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.DEFAULT_TTL

    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessedAt: Date.now(),
    })
  }

  /**
   * 刪除快取
   */
  forget(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * 刪除多個快取（使用前綴匹配）
   *
   * @example
   * ```typescript
   * // 刪除所有以 'users:' 開頭的快取
   * cache.forgetByPrefix('users:')
   * ```
   */
  forgetByPrefix(prefix: string): number {
    let count = 0

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  /**
   * 清空所有快取
   */
  flush(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * 取得快取統計資訊
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total === 0 ? 0 : (this.stats.hits / total) * 100

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      totalEntries: this.cache.size,
      hitRate,
    }
  }

  /**
   * 開始自動清理過期快取
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      let _removed = 0

      for (const [key, entry] of this.cache.entries()) {
        const age = (now - entry.createdAt) / 1000
        if (age > entry.ttl) {
          this.cache.delete(key)
          _removed++
        }
      }
    }, this.checkInterval)

    // 設定為 unref，避免應用程式因此 timer 而保持運行
    if (this.cleanupInterval) {
      this.cleanupInterval.unref?.()
    }
  }

  /**
   * 停止清理
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * 析構：清理資源
   */
  destroy(): void {
    this.stopCleanup()
    this.flush()
  }

  /**
   * 取得所有快取鍵
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * 取得快取項目數
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 取得單個快取項目的詳細資訊
   */
  getEntry(key: string): CacheEntry<unknown> | null {
    const entry = this.cache.get(key)
    return entry || null
  }
}

/**
 * 全域快取實例（適合簡單應用）
 */
let globalCache: QueryCache | null = null

export function getGlobalCache(): QueryCache {
  if (!globalCache) {
    globalCache = new QueryCache()
  }
  return globalCache
}

/**
 * 重設全域快取
 */
export function resetGlobalCache(): void {
  if (globalCache) {
    globalCache.destroy()
    globalCache = null
  }
}
