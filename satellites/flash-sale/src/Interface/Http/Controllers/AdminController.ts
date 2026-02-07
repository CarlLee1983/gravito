/**
 * 管理員控制器
 *
 * 處理管理員相關的 HTTP 請求
 * 包括快取管理、系統監控等功能
 */

import type { CacheService, GravitoContext, PlanetCore } from '@gravito/core'
import {
  flushAllCache,
  flushCachePattern,
} from '../../../Infrastructure/Handlers/CacheInvalidationHandler'
import { MockOrderRepository } from '../../../Infrastructure/Repositories/MockOrderRepository'
import { MockProductRepository } from '../../../Infrastructure/Repositories/MockProductRepository'

/**
 * AdminController
 */
export class AdminController {
  constructor(private core: PlanetCore) {}

  /**
   * POST /api/admin/cache/flush
   *
   * 清除所有快取
   */
  async flushCache(ctx: GravitoContext): Promise<void> {
    try {
      const cacheService = this.core.container.make<CacheService | undefined>('cache.service')

      if (!cacheService) {
        ctx.status(400)
        ctx.json({
          success: false,
          error: 'CacheService not available',
        })
        return
      }

      await flushAllCache(cacheService, this.core)

      ctx.json({
        success: true,
        message: 'All cache flushed successfully',
      })
    } catch (error) {
      this.core.logger.error(`Failed to flush cache: ${String(error)}`)
      ctx.status(500)
      ctx.json({
        success: false,
        error: 'Failed to flush cache',
      })
    }
  }

  /**
   * POST /api/admin/cache/flush/:pattern
   *
   * 根據模式清除快取
   * pattern: product:* | order:* | user:orders:*
   */
  async flushPattern(ctx: GravitoContext): Promise<void> {
    try {
      const pattern = ctx.req.param('pattern')

      if (!pattern) {
        ctx.status(400)
        ctx.json({
          success: false,
          error: 'Cache pattern is required',
        })
        return
      }

      const cacheService = this.core.container.make<CacheService | undefined>('cache.service')

      if (!cacheService) {
        ctx.status(400)
        ctx.json({
          success: false,
          error: 'CacheService not available',
        })
        return
      }

      await flushCachePattern(cacheService, this.core, pattern)

      ctx.json({
        success: true,
        message: `Cache pattern '${pattern}' flushed successfully`,
      })
    } catch (error) {
      this.core.logger.error(`Failed to flush cache pattern: ${String(error)}`)
      ctx.status(500)
      ctx.json({
        success: false,
        error: 'Failed to flush cache pattern',
      })
    }
  }

  /**
   * GET /api/admin/stats
   *
   * 取得系統統計資訊
   */
  async stats(ctx: GravitoContext): Promise<void> {
    try {
      const productRepository = this.core.container.make<any>('product.repository')
      const orderRepository = this.core.container.make<any>('order.repository')

      let productStats = null
      let orderStats = null

      if (productRepository && productRepository instanceof MockProductRepository) {
        productStats = productRepository.getStats()
      }

      if (orderRepository && orderRepository instanceof MockOrderRepository) {
        orderStats = orderRepository.getStats()
      }

      ctx.json({
        success: true,
        data: {
          products: productStats,
          orders: orderStats,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      this.core.logger.error(`Failed to get stats: ${String(error)}`)
      ctx.status(500)
      ctx.json({
        success: false,
        error: 'Failed to get stats',
      })
    }
  }

  /**
   * POST /api/admin/reset
   *
   * 重置所有 Mock 數據（用於測試）
   */
  async reset(ctx: GravitoContext): Promise<void> {
    try {
      const productRepository = this.core.container.make<any>('product.repository')
      const orderRepository = this.core.container.make<any>('order.repository')
      const cacheService = this.core.container.make<CacheService | undefined>('cache.service')

      // 重置數據
      if (productRepository && productRepository instanceof MockProductRepository) {
        await productRepository.reset()
      }

      if (orderRepository && orderRepository instanceof MockOrderRepository) {
        await orderRepository.reset()
      }

      // 清除快取
      if (cacheService) {
        await cacheService.clear()
      }

      ctx.json({
        success: true,
        message: 'System reset successfully',
      })
    } catch (error) {
      this.core.logger.error(`Failed to reset system: ${String(error)}`)
      ctx.status(500)
      ctx.json({
        success: false,
        error: 'Failed to reset system',
      })
    }
  }
}
