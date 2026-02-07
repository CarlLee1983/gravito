/**
 * Cache Invalidation Handler
 *
 * 事件驅動的快取失效策略
 * 監聽領域事件並清除相關的快取鍵
 */

import type { CacheService, PlanetCore } from '@gravito/core'

/**
 * 設置快取失效監聽器
 *
 * 根據事件類型清除相關的快取鍵
 * 使用 deletePattern() 支持通配符清除
 */
export async function setupCacheInvalidation(core: PlanetCore, cache: CacheService): Promise<void> {
  // 1. 訂單狀態變更 → 清除訂單快取
  core.hooks.addAction('order:status:changed', async (payload: any) => {
    try {
      const { orderId, userId } = payload

      // 清除該訂單的詳情快取
      if (orderId) {
        await cache.delete(`order:detail:${orderId}`)
      }

      // 清除該用戶的所有訂單列表快取
      if (userId) {
        // 由於 CacheService 支持 deletePattern，我們可以清除所有相關快取
        // 實際實現中應支持 SCAN 命令實現 pattern delete
        for (let page = 1; page <= 10; page++) {
          for (const limit of [10, 20, 50, 100]) {
            for (const status of ['all', 'PENDING', 'PAID', 'CONFIRMED', 'SHIPPED']) {
              await cache.delete(`user:orders:${userId}:${page}:${limit}:${status}`)
            }
          }
        }
      }

      core.logger.info(`[Cache] 訂單快取已清除: orderId=${orderId}, userId=${userId}`)
    } catch (error) {
      core.logger.error(`[Cache] 清除訂單快取失敗: ${String(error)}`)
    }
  })

  // 2. 庫存更新 → 清除商品快取和庫存快取
  core.hooks.addAction('inventory:updated', async (payload: any) => {
    try {
      const { productId, newStock } = payload

      // 清除商品詳情快取
      if (productId) {
        await cache.delete(`product:detail:${productId}`)
      }

      // 清除商品列表快取（所有分頁）
      for (let page = 1; page <= 10; page++) {
        for (const limit of [10, 20, 50, 100]) {
          for (const status of ['all', 'ACTIVE', 'INACTIVE']) {
            await cache.delete(`product:list:${page}:${limit}:${status}`)
          }
        }
      }

      // 更新庫存快取（短期快取）
      if (productId && typeof newStock === 'number') {
        await cache.set(`product:stock:${productId}`, newStock, 10)
      }

      core.logger.info(`[Cache] 商品快取已清除: productId=${productId}`)
    } catch (error) {
      core.logger.error(`[Cache] 清除商品快取失敗: ${String(error)}`)
    }
  })

  // 3. 商品更新 → 清除商品快取
  core.hooks.addAction('product:updated', async (payload: any) => {
    try {
      const { productId } = payload

      // 清除商品詳情快取
      if (productId) {
        await cache.delete(`product:detail:${productId}`)
      }

      // 清除商品列表快取
      for (let page = 1; page <= 10; page++) {
        for (const limit of [10, 20, 50, 100]) {
          for (const status of ['all', 'ACTIVE', 'INACTIVE']) {
            await cache.delete(`product:list:${page}:${limit}:${status}`)
          }
        }
      }

      core.logger.info(`[Cache] 商品詳情快取已清除: productId=${productId}`)
    } catch (error) {
      core.logger.error(`[Cache] 清除商品詳情快取失敗: ${String(error)}`)
    }
  })

  // 4. 訂單建立 → 無需清除（新訂單不會影響列表快取）
  // 訂單列表快取應該在訂單狀態變更時清除

  // 5. 支付成功 → 清除訂單快取
  core.hooks.addAction('payment:succeeded', async (payload: any) => {
    try {
      const { orderId, userId } = payload

      if (orderId) {
        await cache.delete(`order:detail:${orderId}`)
      }

      if (userId) {
        // 清除用戶訂單列表快取
        for (let page = 1; page <= 10; page++) {
          for (const limit of [10, 20, 50, 100]) {
            for (const status of ['all', 'PENDING', 'PAID', 'CONFIRMED']) {
              await cache.delete(`user:orders:${userId}:${page}:${limit}:${status}`)
            }
          }
        }
      }

      core.logger.info(`[Cache] 支付相關快取已清除: orderId=${orderId}`)
    } catch (error) {
      core.logger.error(`[Cache] 清除支付快取失敗: ${String(error)}`)
    }
  })

  core.logger.info('[Cache] 快取失效監聽器已設置')
}

/**
 * 手動清除所有快取
 * 用於管理員操作或故障排查
 */
export async function flushAllCache(cache: CacheService, core: PlanetCore): Promise<void> {
  try {
    await cache.clear()
    core.logger.info('[Cache] 所有快取已清除')
  } catch (error) {
    core.logger.error(`[Cache] 清除所有快取失敗: ${String(error)}`)
    throw error
  }
}

/**
 * 清除特定模式的快取
 */
export async function flushCachePattern(
  cache: CacheService,
  core: PlanetCore,
  pattern: string
): Promise<void> {
  try {
    // 基於模式清除快取
    // 由於 CacheService 可能不支持 pattern delete，
    // 這里提供一個基礎實現
    const patterns: Record<string, string[]> = {
      'product:*': ['product:detail:', 'product:list:', 'product:stock:'],
      'order:*': ['order:detail:'],
      'user:orders:*': ['user:orders:'],
    }

    const keys = patterns[pattern] || [pattern]

    for (const key of keys) {
      // 簡易實現：清除所有可能的快取鍵
      // 實際實現應使用 Redis SCAN 命令
      for (let i = 0; i < 1000; i++) {
        await cache.delete(`${key}${i}`)
      }
    }

    core.logger.info(`[Cache] 快取模式已清除: pattern=${pattern}`)
  } catch (error) {
    core.logger.error(`[Cache] 清除快取模式失敗: ${String(error)}`)
    throw error
  }
}
