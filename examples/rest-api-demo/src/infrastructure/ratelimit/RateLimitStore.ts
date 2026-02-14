/**
 * Rate Limit 存儲層
 *
 * 支持 Redis 後端和內存備選實現
 * - Redis：分佈式部署、自動過期、無內存洩漏
 * - 內存：本地部署、自動清理過期條目
 */

export interface RateLimitEntry {
  count: number
  resetTime: number
}

export interface RateLimitStore {
  /**
   * 獲取指定 key 的速率限制計數
   */
  get(key: string): Promise<RateLimitEntry | null>

  /**
   * 設置速率限制計數
   */
  set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void>

  /**
   * 增加計數
   */
  increment(key: string, ttlMs: number): Promise<number>

  /**
   * 刪除 key
   */
  delete(key: string): Promise<void>

  /**
   * 清空所有數據
   */
  flush(): Promise<void>
}

/**
 * Redis Rate Limit 存儲實現
 */
export class RedisRateLimitStore implements RateLimitStore {
  private readonly prefix = 'ratelimit:'

  constructor(private redisClient: any) {}

  async get(key: string): Promise<RateLimitEntry | null> {
    try {
      const data = await this.redisClient.get(this.prefix + key)
      if (!data) {
        return null
      }
      return JSON.parse(data) as RateLimitEntry
    } catch (error) {
      console.error('[RateLimit] Redis get 失敗:', error)
      return null
    }
  }

  async set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void> {
    try {
      const ttlSec = Math.ceil(ttlMs / 1000)
      await this.redisClient.setex(this.prefix + key, ttlSec, JSON.stringify(entry))
    } catch (error) {
      console.error('[RateLimit] Redis set 失敗:', error)
    }
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    try {
      const fullKey = this.prefix + key
      const data = await this.redisClient.get(fullKey)

      if (!data) {
        const entry: RateLimitEntry = {
          count: 1,
          resetTime: Date.now() + ttlMs,
        }
        const ttlSec = Math.ceil(ttlMs / 1000)
        await this.redisClient.setex(fullKey, ttlSec, JSON.stringify(entry))
        return 1
      }

      const entry = JSON.parse(data) as RateLimitEntry
      entry.count++

      const ttlSec = Math.ceil((entry.resetTime - Date.now()) / 1000)
      if (ttlSec > 0) {
        await this.redisClient.setex(fullKey, ttlSec, JSON.stringify(entry))
      }

      return entry.count
    } catch (error) {
      console.error('[RateLimit] Redis increment 失敗:', error)
      return 0
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redisClient.del(this.prefix + key)
    } catch (error) {
      console.error('[RateLimit] Redis delete 失敗:', error)
    }
  }

  async flush(): Promise<void> {
    try {
      const keys = await this.redisClient.keys(this.prefix + '*')
      if (keys.length > 0) {
        await this.redisClient.del(...keys)
      }
    } catch (error) {
      console.error('[RateLimit] Redis flush 失敗:', error)
    }
  }
}

/**
 * 內存 Rate Limit 存儲實現（帶自動清理）
 *
 * 特性：
 * - LRU 緩存：超過最大大小時移除最舊條目
 * - 自動過期清理：每 5 分鐘清理過期條目
 * - 防止內存洩漏：嚴格的 TTL 控制
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map()
  private accessOrder: string[] = [] // 追蹤訪問順序用於 LRU
  private readonly maxSize = 10000 // 最多 10,000 個 key
  private cleanupInterval: NodeJS.Timer | null = null
  private readonly cleanupIntervalMs = 5 * 60 * 1000 // 每 5 分鐘清理一次

  constructor() {
    // 啟動自動清理定時器
    this.startCleanupInterval()
  }

  /**
   * 啟動自動清理定時器
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.cleanupIntervalMs)

    // 設置為守護線程，不阻止程序關閉
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref()
    }
  }

  /**
   * 停止清理定時器
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * 清理過期條目
   */
  private cleanup(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key)
        this.accessOrder = this.accessOrder.filter((k) => k !== key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.debug(`[RateLimit] 清理過期條目: ${cleanedCount}`)
    }
  }

  /**
   * 更新訪問順序（用於 LRU）
   */
  private updateAccessOrder(key: string): void {
    // 移除舊的位置
    this.accessOrder = this.accessOrder.filter((k) => k !== key)
    // 添加到最後（最新訪問）
    this.accessOrder.push(key)
  }

  /**
   * 移除最舊的條目（LRU）
   */
  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift()
      if (oldestKey) {
        this.store.delete(oldestKey)
      }
    }
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key)

    if (!entry) {
      return null
    }

    // 檢查是否過期
    if (entry.resetTime <= Date.now()) {
      this.store.delete(key)
      this.accessOrder = this.accessOrder.filter((k) => k !== key)
      return null
    }

    // 更新訪問順序（LRU）
    this.updateAccessOrder(key)

    return entry
  }

  async set(key: string, entry: RateLimitEntry, _ttlMs: number): Promise<void> {
    // 檢查容量
    if (!this.store.has(key) && this.store.size >= this.maxSize) {
      this.evictLRU()
    }

    this.store.set(key, entry)
    this.updateAccessOrder(key)
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || entry.resetTime <= now) {
      // 新條目或過期
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + ttlMs,
      }

      // 檢查容量
      if (!this.store.has(key) && this.store.size >= this.maxSize) {
        this.evictLRU()
      }

      this.store.set(key, newEntry)
      this.updateAccessOrder(key)
      return 1
    }

    // 增加現有條目
    entry.count++
    this.updateAccessOrder(key)
    return entry.count
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
    this.accessOrder = this.accessOrder.filter((k) => k !== key)
  }

  async flush(): Promise<void> {
    this.store.clear()
    this.accessOrder = []
  }

  /**
   * 獲取存儲統計信息
   */
  getStats(): {
    size: number
    maxSize: number
    utilizationPercent: number
  } {
    return {
      size: this.store.size,
      maxSize: this.maxSize,
      utilizationPercent: Math.round((this.store.size / this.maxSize) * 100),
    }
  }

  /**
   * 優雅關閉
   */
  async shutdown(): Promise<void> {
    this.stopCleanupInterval()
    this.store.clear()
    this.accessOrder = []
  }
}

/**
 * 工廠函數：根據配置創建合適的 Rate Limit 存儲
 */
export function createRateLimitStore(options?: {
  redisClient?: any
  useRedis?: boolean
  forceMemory?: boolean
}): RateLimitStore {
  const { redisClient, useRedis = true, forceMemory = false } = options ?? {}

  // 優先使用 Redis（如果可用）
  if (useRedis && !forceMemory && redisClient) {
    console.log('[RateLimit] 使用 Redis 存儲後端')
    return new RedisRateLimitStore(redisClient)
  }

  console.log('[RateLimit] 使用內存存儲後端（帶自動清理）')
  return new MemoryRateLimitStore()
}
