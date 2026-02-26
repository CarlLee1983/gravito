/**
 * Cache Integration Handler
 *
 * 將快取層集成到業務邏輯中：
 * - 商品查詢快取
 * - 庫存查詢快取
 * - 訂單查詢快取
 * - 用戶資料快取
 */

import type { PlanetCore } from '@gravito/core'
import {
  FlashSaleCache,
  InventoryCache,
  OrderCache,
  ProductCache,
  RateLimitCache,
  UserCache,
} from '../cache/cache-service'

/**
 * 設置快取整合
 *
 * 掛載 hooks 到查詢和數據操作，應用快取機制
 */
export function setupCacheIntegration(core: PlanetCore): void {
  const logger = core.logger

  // ==================== 商品查詢 ====================
  core.hooks.addAction('product:query', async (payload: any) => {
    try {
      logger.debug(`[Cache] Loading product: ${payload.productId}`)

      // 嘗試從快取取得
      await ProductCache.getDetail(
        payload.productId,
        async () => {
          logger.debug(`[Cache] Cache miss, loading from DB: ${payload.productId}`)
          // 這裡會調用實際的數據庫查詢
          // return await atlasRepository.products.find(payload.productId)
          return { id: payload.productId, name: 'Sample Product' }
        },
        logger
      )

      logger.info(`[Cache] Product loaded: ${payload.productId}`)
    } catch (error) {
      logger.error('[Cache] Error loading product', error)
    }
  })

  // ==================== 商品更新（失效快取）====================
  core.hooks.addAction('product:updated', async (payload: any) => {
    try {
      logger.info(`[Cache] Product updated, invalidating cache: ${payload.productId}`)
      await ProductCache.invalidate(payload.productId, logger)
    } catch (error) {
      logger.error('[Cache] Error invalidating product cache', error)
    }
  })

  // ==================== 庫存查詢 ====================
  core.hooks.addAction('inventory:query', async (payload: any) => {
    try {
      logger.debug(`[Cache] Loading inventory: ${payload.productId}`)

      // 從快取取得庫存
      const total = await InventoryCache.getTotal(
        payload.productId,
        async () => {
          logger.debug(`[Cache] Inventory cache miss: ${payload.productId}`)
          // return await inventoryService.getTotalQuantity(payload.productId)
          return 100
        },
        logger
      )

      logger.debug(`[Cache] Inventory loaded: ${payload.productId} = ${total}`)
    } catch (error) {
      logger.error('[Cache] Error loading inventory', error)
    }
  })

  // ==================== 庫存更新（失效快取）====================
  core.hooks.addAction('inventory:changed', async (payload: any) => {
    try {
      logger.info(`[Cache] Inventory changed, invalidating cache: ${payload.productId}`)
      await InventoryCache.invalidate(payload.productId, logger)
    } catch (error) {
      logger.error('[Cache] Error invalidating inventory cache', error)
    }
  })

  // ==================== 訂單查詢 ====================
  core.hooks.addAction('order:query', async (payload: any) => {
    try {
      logger.debug(`[Cache] Loading order: ${payload.orderId}`)

      // 從快取取得訂單
      await OrderCache.getOrder(
        payload.orderId,
        async () => {
          logger.debug(`[Cache] Order cache miss: ${payload.orderId}`)
          // return await orderService.getOrder(payload.orderId)
          return { id: payload.orderId, status: 'pending' }
        },
        logger
      )

      logger.info(`[Cache] Order loaded: ${payload.orderId}`)
    } catch (error) {
      logger.error('[Cache] Error loading order', error)
    }
  })

  // ==================== 訂單狀態更新（失效快取）====================
  core.hooks.addAction('order:updated', async (payload: any) => {
    try {
      logger.info(`[Cache] Order updated, invalidating cache: ${payload.orderId}`)
      await OrderCache.invalidate(payload.orderId, payload.userId, logger)
    } catch (error) {
      logger.error('[Cache] Error invalidating order cache', error)
    }
  })

  // ==================== 閃購活動查詢 ====================
  core.hooks.addAction('flash-sale:query-active', async (_payload: any) => {
    try {
      logger.debug('[Cache] Loading active flash sales')

      // 取得活躍的閃購
      const activeSales = await FlashSaleCache.getActive(async () => {
        logger.debug('[Cache] Flash sale cache miss')
        // return await flashSaleService.getActiveSales()
        return []
      }, logger)

      logger.info(`[Cache] Found ${activeSales.length} active flash sales`)
    } catch (error) {
      logger.error('[Cache] Error loading flash sales', error)
    }
  })

  // ==================== 閃購更新（失效快取）====================
  core.hooks.addAction('flash-sale:updated', async (payload: any) => {
    try {
      logger.info(`[Cache] Flash sale updated, invalidating cache: ${payload.saleId}`)
      await FlashSaleCache.invalidate(payload.saleId, logger)
    } catch (error) {
      logger.error('[Cache] Error invalidating flash sale cache', error)
    }
  })

  // ==================== 用戶資料查詢 ====================
  core.hooks.addAction('user:query-profile', async (payload: any) => {
    try {
      logger.debug(`[Cache] Loading user profile: ${payload.userId}`)

      // 從快取取得用戶資料
      await UserCache.getProfile(
        payload.userId,
        async () => {
          logger.debug(`[Cache] User profile cache miss: ${payload.userId}`)
          // return await userService.getProfile(payload.userId)
          return { id: payload.userId, name: 'User' }
        },
        logger
      )

      logger.info(`[Cache] User profile loaded: ${payload.userId}`)
    } catch (error) {
      logger.error('[Cache] Error loading user profile', error)
    }
  })

  // ==================== 用戶資料更新（失效快取）====================
  core.hooks.addAction('user:updated', async (payload: any) => {
    try {
      logger.info(`[Cache] User updated, invalidating cache: ${payload.userId}`)
      await UserCache.invalidate(payload.userId, logger)
    } catch (error) {
      logger.error('[Cache] Error invalidating user cache', error)
    }
  })

  // ==================== 速率限制檢查 ====================
  core.hooks.addFilter('order:create', async (payload: any) => {
    try {
      const key = `order:create:${payload.userId}`
      const maxAttempts = 10
      const decayMinutes = 1

      // 檢查用戶是否超過速率限制（10 次/分鐘）
      const exceeded = await RateLimitCache.tooManyAttempts(key, maxAttempts, decayMinutes, logger)

      if (exceeded) {
        logger.warn(`[RateLimit] User ${payload.userId} exceeded order creation limit`)
        throw new Error('Too many order creation attempts. Please try again later.')
      }

      return payload
    } catch (error) {
      logger.error('[RateLimit] Error checking rate limit', error)
      throw error
    }
  })

  logger.info('[Cache] Integration hooks registered')
  logger.info('[Cache] - Product caching enabled')
  logger.info('[Cache] - Inventory caching enabled')
  logger.info('[Cache] - Order caching enabled')
  logger.info('[Cache] - Flash sale caching enabled')
  logger.info('[Cache] - User profile caching enabled')
  logger.info('[Cache] - Rate limiting enabled')
}
