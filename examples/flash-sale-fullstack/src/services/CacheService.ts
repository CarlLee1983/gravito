/**
 * Cache Service
 *
 * 統一的快取管理服務，基於 Redis
 * 支持多級快取策略與自動失效
 */

import type Redis from 'ioredis'

export interface CacheOptions {
  ttl?: number // 秒，默認 300s (5分鐘)
  namespace?: string // 快取鍵命名空間
}

/**
 * 快取服務
 */
export class CacheService {
  private redis: Redis
  private readonly namespace: string = 'cache'

  constructor(redisClient: Redis, namespace?: string) {
    this.redis = redisClient
    if (namespace) {
      this.namespace = namespace
    }
  }

  /**
   * 生成快取鍵
   */
  private getKey(key: string): string {
    return `${this.namespace}:${key}`
  }

  /**
   * 取得快取值
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(this.getKey(key))
      if (!value) {
        return null
      }
      return JSON.parse(value) as T
    } catch (error) {
      // 快取讀取失敗不應中斷主流程
      console.error(`[CacheService] 快取讀取失敗: ${key}`, error)
      return null
    }
  }

  /**
   * 設置快取值
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl ?? 300 // 默認 5 分鐘
      const cacheKey = this.getKey(key)
      const serialized = JSON.stringify(value)

      if (ttl > 0) {
        await this.redis.setex(cacheKey, ttl, serialized)
      } else {
        // TTL <= 0 表示永不過期
        await this.redis.set(cacheKey, serialized)
      }
    } catch (error) {
      console.error(`[CacheService] 快取設置失敗: ${key}`, error)
    }
  }

  /**
   * 刪除快取
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(key))
    } catch (error) {
      console.error(`[CacheService] 快取刪除失敗: ${key}`, error)
    }
  }

  /**
   * 刪除多個快取
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return
    }
    try {
      const cacheKeys = keys.map((k) => this.getKey(k))
      await this.redis.del(...cacheKeys)
    } catch (error) {
      console.error(`[CacheService] 批量刪除快取失敗`, error)
    }
  }

  /**
   * 刪除指定模式的快取
   *
   * 例如：deletePattern('product:*') 會刪除所有 product 相關快取
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const fullPattern = this.getKey(pattern)
      const keys = await this.redis.keys(fullPattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error(`[CacheService] 模式刪除快取失敗: ${pattern}`, error)
    }
  }

  /**
   * 取得或設置快取（如果不存在則執行 loader）
   */
  async remember<T>(key: string, loader: () => Promise<T>, options?: CacheOptions): Promise<T> {
    // 嘗試從快取中獲取
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // 快取未命中，執行 loader
    const value = await loader()

    // 保存到快取
    await this.set(key, value, options)

    return value
  }

  /**
   * 檢查快取是否存在
   */
  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(this.getKey(key))
      return exists === 1
    } catch (error) {
      console.error(`[CacheService] 檢查快取失敗: ${key}`, error)
      return false
    }
  }

  /**
   * 遞增計數器
   */
  async increment(key: string, delta = 1): Promise<number> {
    try {
      return await this.redis.incrby(this.getKey(key), delta)
    } catch (error) {
      console.error(`[CacheService] 遞增快取失敗: ${key}`, error)
      return 0
    }
  }

  /**
   * 清空所有快取（謹慎使用）
   */
  async flush(): Promise<void> {
    try {
      const pattern = this.getKey('*')
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error(`[CacheService] 清空快取失敗`, error)
    }
  }
}

/**
 * 快取預設配置
 */
export const CACHE_CONFIG = {
  // 商品相關快取
  PRODUCT_LIST: { ttl: 300, namespace: 'products:list' }, // 5 分鐘
  PRODUCT_DETAIL: { ttl: 300, namespace: 'products:detail' }, // 5 分鐘

  // 庫存相關快取（高頻更新）
  INVENTORY: { ttl: 60, namespace: 'inventory' }, // 1 分鐘
  INVENTORY_LOCK: { ttl: 30, namespace: 'inventory:lock' }, // 30 秒

  // 訂單相關快取
  ORDER: { ttl: 300, namespace: 'orders' }, // 5 分鐘
  ORDER_STATUS: { ttl: 60, namespace: 'orders:status' }, // 1 分鐘

  // 用戶會話快取
  USER_SESSION: { ttl: 1800, namespace: 'sessions' }, // 30 分鐘

  // 配置快取（不常變）
  CONFIG: { ttl: 3600, namespace: 'config' }, // 1 小時
}
