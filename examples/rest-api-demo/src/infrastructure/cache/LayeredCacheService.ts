/**
 * 分層快取服務
 * L1: 內存快取（本地 Map）
 * L2: Redis 快取（分佈式）
 *
 * 優化策略：
 * - L1 命中率目標：70%（熱數據）
 * - L2 命中率目標：90%+（冷數據）
 * - 總命中率目標：> 80%
 */

export interface CacheEntry<T> {
  value: T
  expiresAt: number
}

export interface LayeredCacheConfig {
  l1Ttl: number // 內存快取 TTL（毫秒）
  l2Ttl: number // Redis 快取 TTL（毫秒）
  l1MaxSize: number // 內存快取最大條目數
}

export class LayeredCacheService {
  private l1Cache: Map<string, CacheEntry<any>> = new Map()
  private hits = { l1: 0, l2: 0, miss: 0 }
  private config: LayeredCacheConfig

  constructor(
    private l2Service: any, // Redis CacheService
    config?: Partial<LayeredCacheConfig>
  ) {
    this.config = {
      l1Ttl: config?.l1Ttl ?? 60000, // 1 分鐘
      l2Ttl: config?.l2Ttl ?? 300000, // 5 分鐘
      l1MaxSize: config?.l1MaxSize ?? 1000,
    }
  }

  /**
   * 從多層快取獲取值
   */
  async get<T>(key: string): Promise<T | null> {
    // =========================================================================
    // 1. 檢查 L1 快取（內存）
    // =========================================================================
    const l1Entry = this.l1Cache.get(key)
    if (l1Entry && l1Entry.expiresAt > Date.now()) {
      this.hits.l1++
      return l1Entry.value as T
    }

    // 過期的 L1 條目刪除
    if (l1Entry) {
      this.l1Cache.delete(key)
    }

    // =========================================================================
    // 2. 檢查 L2 快取（Redis）
    // =========================================================================
    try {
      const l2Value = await this.l2Service.get(key)
      if (l2Value !== null) {
        this.hits.l2++

        // 將 L2 結果回寫到 L1
        this.setL1(key, l2Value)
        return l2Value as T
      }
    } catch (error) {
      // L2 快取失敗，繼續執行
      console.warn(`[Cache] L2 獲取失敗: ${key}`, error)
    }

    // =========================================================================
    // 3. 快取未命中
    // =========================================================================
    this.hits.miss++
    return null
  }

  /**
   * 設置多層快取
   */
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const ttl = ttlMs ?? this.config.l2Ttl

    // 設置 L1 快取
    this.setL1(key, value, ttl)

    // 設置 L2 快取
    try {
      await this.l2Service.set(key, value, ttl)
    } catch (error) {
      console.warn(`[Cache] L2 設置失敗: ${key}`, error)
    }
  }

  /**
   * 刪除多層快取
   */
  async delete(key: string): Promise<void> {
    // 刪除 L1
    this.l1Cache.delete(key)

    // 刪除 L2
    try {
      await this.l2Service.delete(key)
    } catch (error) {
      console.warn(`[Cache] L2 刪除失敗: ${key}`, error)
    }
  }

  /**
   * 通過模式刪除多層快取
   */
  async deletePattern(pattern: string): Promise<void> {
    // 刪除 L1 中匹配的鍵
    for (const key of this.l1Cache.keys()) {
      if (this.matchPattern(key, pattern)) {
        this.l1Cache.delete(key)
      }
    }

    // 刪除 L2 中匹配的鍵
    try {
      await this.l2Service.deletePattern(pattern)
    } catch (error) {
      console.warn(`[Cache] L2 模式刪除失敗: ${pattern}`, error)
    }
  }

  /**
   * 設置 L1 快取（內存）
   */
  private setL1<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.config.l1Ttl

    // 檢查 L1 容量
    if (this.l1Cache.size >= this.config.l1MaxSize) {
      // 移除最舊的條目
      const firstKey = this.l1Cache.keys().next().value
      if (firstKey) {
        this.l1Cache.delete(firstKey)
      }
    }

    this.l1Cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    })
  }

  /**
   * 模式匹配
   */
  private matchPattern(key: string, pattern: string): boolean {
    // 簡單的通配符匹配
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 轉義特殊字符
      .replace(/\*/g, '.*') // * 變成 .*

    return new RegExp(`^${regexPattern}$`).test(key)
  }

  /**
   * 獲取快取統計
   */
  getStats(): {
    l1HitRate: number
    l2HitRate: number
    totalHitRate: number
    l1Size: number
    totalRequests: number
  } {
    const total = this.hits.l1 + this.hits.l2 + this.hits.miss
    const l1HitRate = total > 0 ? (this.hits.l1 / total) * 100 : 0
    const l2HitRate = total > 0 ? (this.hits.l2 / (this.hits.l2 + this.hits.miss)) * 100 : 0
    const totalHitRate = total > 0 ? ((this.hits.l1 + this.hits.l2) / total) * 100 : 0

    return {
      l1HitRate: Math.round(l1HitRate * 100) / 100,
      l2HitRate: Math.round(l2HitRate * 100) / 100,
      totalHitRate: Math.round(totalHitRate * 100) / 100,
      l1Size: this.l1Cache.size,
      totalRequests: total,
    }
  }

  /**
   * 清空所有快取
   */
  async flush(): Promise<void> {
    this.l1Cache.clear()
    try {
      await this.l2Service.flush()
    } catch (error) {
      console.warn('[Cache] 清空快取失敗', error)
    }
  }
}
