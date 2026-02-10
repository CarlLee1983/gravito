/**
 * 本地二級快取管理器 (L1 Cache)
 *
 * 三層快取架構：
 * L1: 本地記憶體 (微秒級)
 * L2: Redis (毫秒級)
 * L3: 資料庫 (秒級)
 */

export interface CacheEntry<T> {
  value: T
  expiresAt: number
  hits: number
}

export interface L1CacheStats {
  l1Hits: number
  l2Hits: number
  l3Hits: number
  totalHits: number
  l1HitRate: number
  l2HitRate: number
  currentSize: number
  maxSize: number
}

export class L1CacheManager<T = any> {
  private cache = new Map<string, CacheEntry<T>>()
  private maxSize: number // 最大記憶體大小（字節）
  private maxEntries: number // 最大條目數
  private stats = {
    l1Hits: 0,
    l2Hits: 0,
    l3Hits: 0,
    totalHits: 0,
  }
  private currentSize = 0

  constructor(maxSize: number = 100 * 1024 * 1024, maxEntries = 10000) {
    this.maxSize = maxSize
    this.maxEntries = maxEntries
  }

  /**
   * 分層快取讀取
   */
  async get(key: string, l2Cache?: any, l3Loader?: () => Promise<T>): Promise<T | null> {
    // L1：本地快取
    const l1Entry = this.cache.get(key)
    if (l1Entry && !this.isExpired(l1Entry)) {
      l1Entry.hits++
      this.stats.l1Hits++
      this.stats.totalHits++
      return l1Entry.value
    }

    // L2：Redis 快取
    if (l2Cache) {
      try {
        const l2Value = await l2Cache.get(key)
        if (l2Value) {
          this.stats.l2Hits++
          this.stats.totalHits++
          // 回源到 L1
          this.set(key, l2Value, 300)
          return l2Value
        }
      } catch (error) {
        console.error(`[L1Cache] L2 讀取失敗 (${key}):`, error)
      }
    }

    // L3：資料庫
    if (l3Loader) {
      try {
        const l3Value = await l3Loader()
        if (l3Value) {
          this.stats.l3Hits++
          this.stats.totalHits++
          // 回源到 L1 和 L2
          this.set(key, l3Value, 300)
          if (l2Cache) {
            await l2Cache.set(key, l3Value, 300)
          }
          return l3Value
        }
      } catch (error) {
        console.error(`[L1Cache] L3 加載失敗 (${key}):`, error)
      }
    }

    return null
  }

  /**
   * 設置快取條目
   */
  set(key: string, value: T, ttlSeconds = 300): void {
    // 計算大小
    const size = this.estimateSize(value)

    // 檢查是否需要驅逐
    if (this.cache.size >= this.maxEntries || this.currentSize + size > this.maxSize) {
      this.evictLRU()
    }

    // 刪除舊條目
    const oldEntry = this.cache.get(key)
    if (oldEntry) {
      this.currentSize -= this.estimateSize(oldEntry.value)
    }

    // 設置新條目
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      hits: 0,
    }

    this.cache.set(key, entry)
    this.currentSize += size
  }

  /**
   * 刪除快取條目
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentSize -= this.estimateSize(entry.value)
      this.cache.delete(key)
      return true
    }
    return false
  }

  /**
   * 按模式刪除
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp(pattern)
    let deleted = 0

    for (const [key, entry] of this.cache.entries()) {
      if (regex.test(key)) {
        this.currentSize -= this.estimateSize(entry.value)
        this.cache.delete(key)
        deleted++
      }
    }

    return deleted
  }

  /**
   * 清空快取
   */
  clear(): void {
    this.cache.clear()
    this.currentSize = 0
  }

  /**
   * 同步失效 L1 和 L2
   */
  async invalidateWithL2(key: string, l2Cache?: any): Promise<void> {
    this.delete(key)
    if (l2Cache) {
      try {
        await l2Cache.delete(key)
      } catch (error) {
        console.error(`[L1Cache] L2 失效失敗 (${key}):`, error)
      }
    }
  }

  /**
   * 取得快取統計
   */
  getStats(): L1CacheStats {
    const totalHits = this.stats.totalHits || 1 // 避免除以零
    return {
      l1Hits: this.stats.l1Hits,
      l2Hits: this.stats.l2Hits,
      l3Hits: this.stats.l3Hits,
      totalHits: this.stats.totalHits,
      l1HitRate: (this.stats.l1Hits / totalHits) * 100,
      l2HitRate: ((this.stats.l1Hits + this.stats.l2Hits) / totalHits) * 100,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
    }
  }

  /**
   * 重置統計
   */
  resetStats(): void {
    this.stats = { l1Hits: 0, l2Hits: 0, l3Hits: 0, totalHits: 0 }
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() > entry.expiresAt
  }

  /**
   * LRU 驅逐
   */
  private evictLRU(): void {
    let minHits = Infinity
    let lruKey: string | null = null

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits
        lruKey = key
      }
    }

    if (lruKey) {
      this.delete(lruKey)
    }
  }

  /**
   * 估計對象大小（字節）
   */
  private estimateSize(value: any): number {
    // 簡化估算
    const str = JSON.stringify(value)
    return new Blob([str]).size
  }
}
