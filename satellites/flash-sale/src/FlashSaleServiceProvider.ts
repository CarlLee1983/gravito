/**
 * Flash Sale Service Provider
 *
 * 註冊搶購系統的所有服務與路由
 */

import type { CacheService, Container, PlanetCore } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
import { Redis } from '@gravito/plasma'
import { setupCacheInvalidation } from './Infrastructure/Handlers/CacheInvalidationHandler'
import { MockOrderRepository } from './Infrastructure/Repositories/MockOrderRepository'
import { MockProductRepository } from './Infrastructure/Repositories/MockProductRepository'
import { RedisCacheService } from './Infrastructure/Services/RedisCacheService'
import { AdminController } from './Interface/Http/Controllers/AdminController'
import { OrderController } from './Interface/Http/Controllers/OrderController'
import { ProductController } from './Interface/Http/Controllers/ProductController'

/**
 * FlashSaleServiceProvider
 *
 * 負責在 Gravito 應用中註冊搶購系統的所有組件
 */
export class FlashSaleServiceProvider extends ServiceProvider {
  /**
   * 註冊階段：綁定服務到容器
   *
   * 此階段應只註冊依賴注入的綁定，不應執行任何初始化邏輯
   */
  register(container: Container): void {
    const core = this.core
    if (!core) {
      return
    }

    // 註冊 Mock Repository （用於測試與性能基準測試）
    container.singleton('product.repository', () => {
      return new MockProductRepository(core)
    })

    container.singleton('order.repository', () => {
      return new MockOrderRepository(core)
    })

    // 註冊 CacheService（使用真實 Redis）
    container.singleton('cache.service', () => {
      try {
        // 獲取 Redis 連接（使用 @gravito/plasma 的 Redis 門面）
        const redisConnection = Redis.connection('cache')

        if (redisConnection) {
          return new RedisCacheService(redisConnection, 'flash-sale:')
        }

        // 如果 Redis 未可用，返回 undefined（降級到 Mock）
        core.logger.warn('[Flash-Sale] Redis CacheService 未可用，將使用 Mock Repository')
        return undefined
      } catch (error) {
        core.logger.error(`[Flash-Sale] 初始化 RedisCacheService 失敗: ${String(error)}`)
        return undefined
      }
    })
  }

  /**
   * 啟動階段：初始化服務、註冊路由、監聽事件
   *
   * 此階段應執行所有初始化邏輯
   */
  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    // 記錄啟動訊息
    core.logger.info('🛰️ Satellite Flash-Sale is booting')

    // 取得 CacheService
    const cacheService = core.container.make<CacheService | undefined>('cache.service')

    // 設置快取失效監聽器（如果 CacheService 可用）
    if (cacheService) {
      setupCacheInvalidation(core, cacheService).catch((error) => {
        core.logger.error(`[Flash-Sale] Failed to setup cache invalidation: ${String(error)}`)
      })
    }

    // 註冊路由 - 使用控制器類 + 方法名稱
    core.router.prefix('/api').group((router) => {
      // 商品管理路由
      router.get('/products', [ProductController, 'index'])
      router.get('/products/:id', [ProductController, 'show'])

      // 訂單管理路由
      router.get('/orders', [OrderController, 'list'])
      router.post('/orders', [OrderController, 'store'])
      router.get('/orders/:id', [OrderController, 'show'])

      // 管理員路由
      router.post('/admin/cache/flush', [AdminController, 'flushCache'])
      router.post('/admin/cache/flush/:pattern', [AdminController, 'flushPattern'])
      router.get('/admin/stats', [AdminController, 'stats'])
      router.post('/admin/reset', [AdminController, 'reset'])
    })

    // 驗證 Mock 數據是否已初始化
    const productRepository = core.container.make('product.repository')
    if (productRepository) {
      core.logger.info('[Flash-Sale] ✅ Mock Product Repository 已初始化')
    }

    const orderRepository = core.container.make('order.repository')
    if (orderRepository) {
      core.logger.info('[Flash-Sale] ✅ Mock Order Repository 已初始化')
    }

    if (cacheService) {
      core.logger.info('[Flash-Sale] ✅ CacheService 已初始化')
      core.logger.info('[Flash-Sale] ✅ 快取失效監聽器已設置')
    } else {
      core.logger.warn('[Flash-Sale] ⚠️ CacheService 未初始化，部分快取功能將禁用')
    }

    core.logger.info('✅ Satellite Flash-Sale booted successfully')
  }
}
