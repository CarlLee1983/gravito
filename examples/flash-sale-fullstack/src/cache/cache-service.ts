/**
 * Cache Service
 *
 * 提供業務層面的快取操作
 * 封裝 stasis CacheManager，提供便捷的快取方法
 */

import type { Logger } from '@gravito/core'
import type { CacheManager } from '@gravito/stasis'
import { CACHE_KEYS, CACHE_TTLS } from './stasis-config'

let cacheManager: CacheManager | null = null

/**
 * 初始化快取服務
 */
export function initializeCacheService(cache: CacheManager): void {
  cacheManager = cache
}

/**
 * 取得快取管理器
 */
function getCache(): CacheManager {
  if (!cacheManager) {
    throw new Error('CacheService not initialized. Call initializeCacheService() first.')
  }
  return cacheManager
}

/**
 * 商品快取服務
 */
export const ProductCache = {
  /**
   * 取得商品詳情（帶快取）
   */
  async getDetail<T>(productId: string, loader: () => Promise<T>, logger?: Logger): Promise<T> {
    const cache = getCache()
    const key = CACHE_KEYS.PRODUCT(productId)

    try {
      const cached = await cache.get<T>(key)
      if (cached) {
        logger?.debug(`[Cache] HIT: ${key}`)
        return cached
      }

      logger?.debug(`[Cache] MISS: ${key}`)
      const data = await loader()

      await cache.put(key, data, CACHE_TTLS.PRODUCT_DETAIL)
      return data
    } catch (error) {
      logger?.error(`[Cache] Error getting product ${productId}`, error)
      // 快取失敗時直接查詢數據庫
      return loader()
    }
  },

  /**
   * 清除商品快取
   */
  async invalidate(productId: string, logger?: Logger): Promise<void> {
    const cache = getCache()
    const key = CACHE_KEYS.PRODUCT(productId)

    try {
      await cache.forget(key)
      logger?.info(`[Cache] Invalidated: ${key}`)

      // 同時清除商品列表快取（因為內容可能改變）
      await cache.forget(CACHE_KEYS.PRODUCT_LIST())
      logger?.info(`[Cache] Invalidated: product list`)
    } catch (error) {
      logger?.error(`[Cache] Error invalidating product ${productId}`, error)
    }
  },

  /**
   * 批量清除商品快取
   */
  async invalidateBatch(productIds: string[], logger?: Logger): Promise<void> {
    const cache = getCache()

    try {
      const keys = productIds.map((id) => CACHE_KEYS.PRODUCT(id))
      await Promise.all(keys.map((key) => cache.forget(key)))
      logger?.info(`[Cache] Invalidated ${productIds.length} products`)

      // 清除列表快取
      await cache.forget(CACHE_KEYS.PRODUCT_LIST())
    } catch (error) {
      logger?.error(`[Cache] Error batch invalidating products`, error)
    }
  },
}

/**
 * 庫存快取服務
 */
export const InventoryCache = {
  /**
   * 取得庫存總量
   */
  async getTotal<T>(productId: string, loader: () => Promise<T>, logger?: Logger): Promise<T> {
    const cache = getCache()
    const key = CACHE_KEYS.INVENTORY_TOTAL(productId)

    try {
      const cached = await cache.get<T>(key)
      if (cached !== null && cached !== undefined) {
        logger?.debug(`[Cache] HIT: inventory ${productId}`)
        return cached
      }

      const data = await loader()
      await cache.put(key, data, CACHE_TTLS.INVENTORY_TOTAL)
      return data
    } catch (error) {
      logger?.error(`[Cache] Error getting inventory for ${productId}`, error)
      return loader()
    }
  },

  /**
   * 更新庫存快取（非原子性，用於不需要強一致性的場景）
   */
  async updateTotal(productId: string, total: number, logger?: Logger): Promise<void> {
    const cache = getCache()
    const key = CACHE_KEYS.INVENTORY_TOTAL(productId)

    try {
      await cache.put(key, total, CACHE_TTLS.INVENTORY_TOTAL)
      logger?.debug(`[Cache] Updated inventory ${productId}: ${total}`)
    } catch (error) {
      logger?.error(`[Cache] Error updating inventory cache`, error)
    }
  },

  /**
   * 清除庫存快取
   */
  async invalidate(productId: string, logger?: Logger): Promise<void> {
    const cache = getCache()

    try {
      await Promise.all([
        cache.forget(CACHE_KEYS.INVENTORY_TOTAL(productId)),
        cache.forget(CACHE_KEYS.INVENTORY_AVAILABLE(productId)),
        cache.forget(CACHE_KEYS.INVENTORY_RESERVED(productId)),
      ])
      logger?.info(`[Cache] Invalidated inventory for product ${productId}`)
    } catch (error) {
      logger?.error(`[Cache] Error invalidating inventory`, error)
    }
  },
}

/**
 * 訂單快取服務
 */
export const OrderCache = {
  /**
   * 取得訂單（帶快取）
   */
  async getOrder<T>(orderId: string, loader: () => Promise<T>, logger?: Logger): Promise<T> {
    const cache = getCache()
    const key = CACHE_KEYS.ORDER(orderId)

    try {
      const cached = await cache.get<T>(key)
      if (cached) {
        logger?.debug(`[Cache] HIT: order ${orderId}`)
        return cached
      }

      const data = await loader()
      await cache.put(key, data, CACHE_TTLS.ORDER_HISTORY)
      return data
    } catch (error) {
      logger?.error(`[Cache] Error getting order ${orderId}`, error)
      return loader()
    }
  },

  /**
   * 清除訂單快取
   */
  async invalidate(orderId: string, userId?: string, logger?: Logger): Promise<void> {
    const cache = getCache()

    try {
      await cache.forget(CACHE_KEYS.ORDER(orderId))
      logger?.info(`[Cache] Invalidated order ${orderId}`)

      // 同時清除用戶訂單列表快取
      if (userId) {
        await cache.forget(CACHE_KEYS.ORDER_USER(userId))
        logger?.info(`[Cache] Invalidated user ${userId} order list`)
      }
    } catch (error) {
      logger?.error(`[Cache] Error invalidating order`, error)
    }
  },
}

/**
 * 閃購快取服務
 */
export const FlashSaleCache = {
  /**
   * 取得活躍的閃購信息
   */
  async getActive<T>(loader: () => Promise<T>, logger?: Logger): Promise<T> {
    const cache = getCache()
    const key = CACHE_KEYS.FLASH_SALE_ACTIVE()

    try {
      const cached = await cache.get<T>(key)
      if (cached) {
        logger?.debug(`[Cache] HIT: active flash sales`)
        return cached
      }

      const data = await loader()
      // 實時數據，1 分鐘更新一次
      await cache.put(key, data, CACHE_TTLS.FLASH_SALE_ACTIVE)
      return data
    } catch (error) {
      logger?.error(`[Cache] Error getting active flash sales`, error)
      return loader()
    }
  },

  /**
   * 清除閃購快取
   */
  async invalidate(saleId?: string, logger?: Logger): Promise<void> {
    const cache = getCache()

    try {
      // 清除主快取
      await cache.forget(CACHE_KEYS.FLASH_SALE_ACTIVE())

      // 如果指定了 saleId，清除特定快購的快取
      if (saleId) {
        await Promise.all([
          cache.forget(CACHE_KEYS.FLASH_SALE_DETAIL(saleId)),
          cache.forget(CACHE_KEYS.FLASH_SALE_PRODUCTS(saleId)),
        ])
      }

      logger?.info(`[Cache] Invalidated flash sale cache`)
    } catch (error) {
      logger?.error(`[Cache] Error invalidating flash sale cache`, error)
    }
  },
}

/**
 * 用戶快取服務
 */
export const UserCache = {
  /**
   * 取得用戶資料（帶快取）
   */
  async getProfile<T>(userId: string, loader: () => Promise<T>, logger?: Logger): Promise<T> {
    const cache = getCache()
    const key = CACHE_KEYS.USER_PROFILE(userId)

    try {
      const cached = await cache.get<T>(key)
      if (cached) {
        logger?.debug(`[Cache] HIT: user profile ${userId}`)
        return cached
      }

      const data = await loader()
      await cache.put(key, data, CACHE_TTLS.USER_PROFILE)
      return data
    } catch (error) {
      logger?.error(`[Cache] Error getting user profile ${userId}`, error)
      return loader()
    }
  },

  /**
   * 清除用戶快取
   */
  async invalidate(userId: string, logger?: Logger): Promise<void> {
    const cache = getCache()

    try {
      await Promise.all([
        cache.forget(CACHE_KEYS.USER_PROFILE(userId)),
        cache.forget(CACHE_KEYS.USER_CART(userId)),
        cache.forget(CACHE_KEYS.USER_SETTINGS(userId)),
      ])
      logger?.info(`[Cache] Invalidated user ${userId} caches`)
    } catch (error) {
      logger?.error(`[Cache] Error invalidating user cache`, error)
    }
  },
}

/**
 * 速率限制快取服務
 */
export const RateLimitCache = {
  /**
   * 檢查是否超過速率限制
   */
  async tooManyAttempts(
    key: string,
    maxAttempts: number,
    decaySeconds = 60,
    logger?: Logger
  ): Promise<boolean> {
    const cache = getCache()
    const limiter = cache.limiter()

    try {
      const response = await limiter.attempt(key, maxAttempts, decaySeconds)
      if (!response.allowed) {
        logger?.warn(`[RateLimit] Too many attempts for key: ${key}`)
      }
      return !response.allowed
    } catch (error) {
      logger?.error(`[RateLimit] Error checking rate limit for ${key}`, error)
      return false // 失敗時允許請求通過
    }
  },

  /**
   * 清除速率限制計數
   */
  async resetAttempts(key: string, logger?: Logger): Promise<void> {
    const cache = getCache()

    try {
      const cacheKey = CACHE_KEYS.RATE_LIMIT(key)
      await cache.forget(cacheKey)
      logger?.info(`[RateLimit] Reset attempts for key: ${key}`)
    } catch (error) {
      logger?.error(`[RateLimit] Error resetting attempts`, error)
    }
  },
}

/**
 * 快取統計服務
 */
export const CacheStats = {
  /**
   * 獲取快取統計信息
   */
  async getStats(logger?: Logger): Promise<{
    hits: number
    misses: number
    hitRate: number
    store: string
  }> {
    try {
      // 統計信息需要從底層實現中獲取
      // 這裡是示例，實際實現取決於 stasis 版本
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        store: 'tiered',
      }
    } catch (error) {
      logger?.error(`[Cache] Error getting stats`, error)
      return { hits: 0, misses: 0, hitRate: 0, store: 'unknown' }
    }
  },

  /**
   * 清空所有快取
   */
  async flush(logger?: Logger): Promise<void> {
    try {
      const cache = getCache()
      await cache.flush()
      logger?.info(`[Cache] All caches flushed`)
    } catch (error) {
      logger?.error(`[Cache] Error flushing caches`, error)
    }
  },
}
