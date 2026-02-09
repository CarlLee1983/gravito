/**
 * Flash Sale Service Provider
 *
 * 註冊搶購系統的所有服務與路由
 */

import type { CacheService, Container } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
import { Redis } from '@gravito/plasma'
import { type ShardingConfig, ShardingManager } from './Infrastructure/Database/ShardingManager'
import { setupCacheInvalidation } from './Infrastructure/Handlers/CacheInvalidationHandler'
import { MockOrderRepository } from './Infrastructure/Repositories/MockOrderRepository'
import { MockProductRepository } from './Infrastructure/Repositories/MockProductRepository'
import { ShardedOrderRepository } from './Infrastructure/Repositories/ShardedOrderRepository'
import { CacheWarmupService } from './Infrastructure/Services/CacheWarmupService'
import { HotnessTracker } from './Infrastructure/Services/HotnessTracker'
import { RedisCacheService } from './Infrastructure/Services/RedisCacheService'
import { TieredCacheService } from './Infrastructure/Services/TieredCacheService'
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

    // 註冊 ShardingManager（如果啟用分片）
    const shardingEnabled = core.config.get('flash-sale.sharding.enabled', false)
    if (shardingEnabled) {
      container.singleton('sharding.manager', () => {
        try {
          const shardingConfig = core.config.get('sharding') as ShardingConfig
          if (!shardingConfig) {
            core.logger.warn('[Flash-Sale] Sharding config not found, will use mock repository')
            return undefined
          }

          const manager = new ShardingManager(shardingConfig, core.logger)
          core.logger.info('[Flash-Sale] ✅ ShardingManager 已初始化，共 8 個分片')
          return manager
        } catch (error) {
          core.logger.error(`[Flash-Sale] ShardingManager 初始化失敗: ${String(error)}`)
          return undefined
        }
      })
    }

    // 註冊 Order Repository
    container.singleton('order.repository', () => {
      const shardingEnabled = core.config.get('flash-sale.sharding.enabled', false)

      if (shardingEnabled) {
        const shardingManager = container.make<ShardingManager | undefined>('sharding.manager')
        if (shardingManager) {
          core.logger.debug('[Flash-Sale] Using ShardedOrderRepository')
          return new ShardedOrderRepository(shardingManager, core.logger)
        }
      }

      // 回退到 MockOrderRepository
      return new MockOrderRepository(core)
    })

    // 註冊 CacheService（使用分層快取 = L1 Memory + L2 Redis）
    container.singleton('cache.service', () => {
      try {
        // 配置 Redis（從應用配置中獲取）
        const redisConfig = core.config.get('redis') as any
        core.logger.debug(`[Flash-Sale] Redis config available: ${!!redisConfig}`)

        if (redisConfig) {
          core.logger.debug(
            `[Flash-Sale] Configuring Redis with connections: ${Object.keys(redisConfig.connections || {}).join(', ')}`
          )
          Redis.configure(redisConfig)
        } else {
          core.logger.warn('[Flash-Sale] No Redis configuration found in core.config.get("redis")')
          return undefined
        }

        // 獲取 Redis 連接（使用 @gravito/plasma 的 Redis 門面）
        const redisConnection = Redis.connection('cache')

        if (redisConnection) {
          // 創建 L2 Redis 快取
          const l2Cache = new RedisCacheService(redisConnection, 'flash-sale:')

          // 創建分層快取（L1 Memory + L2 Redis）
          const metricsRegistry = (core.container.make('metrics.registry') as any) || {
            histogram: () => ({ observe: () => {} }),
            counter: () => ({ inc: () => {} }),
            gauge: () => ({ set: () => {} }),
          }
          const tieredCache = new TieredCacheService(l2Cache, metricsRegistry, core.logger)

          core.logger.info('[Flash-Sale] ✅ TieredCacheService 已初始化（L1 Memory + L2 Redis）')
          return tieredCache
        }

        // 如果 Redis 未可用，返回 undefined（降級到 Mock）
        core.logger.warn('[Flash-Sale] Redis CacheService 未可用，將使用 Mock Repository')
        return undefined
      } catch (error) {
        core.logger.error(`[Flash-Sale] 初始化 TieredCacheService 失敗: ${String(error)}`)
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

    // 註冊 HotnessTracker（熱度追蹤）
    try {
      const redisConnection = Redis.connection('cache')
      if (redisConnection) {
        const hotnessTracker = new HotnessTracker(redisConnection, core.logger)
        core.container.singleton('hotness.tracker', () => hotnessTracker)
        core.logger.debug('[Flash-Sale] ✅ HotnessTracker 已初始化')
      }
    } catch (error) {
      core.logger.warn(`[Flash-Sale] HotnessTracker 初始化失敗: ${String(error)}`)
    }

    // 註冊並啟動 CacheWarmupService（快取預熱）
    if (cacheService) {
      try {
        const productRepository = core.container.make('product.repository') as any
        const hotnessTracker = core.container.make<HotnessTracker | undefined>('hotness.tracker')
        const metricsRegistry = core.container.make('metrics.registry') as any

        if (productRepository && hotnessTracker) {
          // 創建 Dummy Metrics 如果不可用
          const metrics = metricsRegistry || {
            histogram: () => ({ observe: () => {} }),
            counter: () => ({ inc: () => {} }),
          }

          const warmupService = new CacheWarmupService(
            hotnessTracker,
            productRepository,
            cacheService,
            core.logger,
            metrics
          )

          core.container.singleton('cache.warmup', () => warmupService)

          // 非阻塞方式啟動預熱
          warmupService.warmupOnStartup().catch((error) => {
            core.logger.error(`[Flash-Sale] 啟動預熱失敗: ${String(error)}`)
          })

          // 啟動定期刷新（每 5 分鐘）
          warmupService.startPeriodicRefresh(300)

          core.logger.debug('[Flash-Sale] ✅ CacheWarmupService 已初始化並啟動')
        }
      } catch (error) {
        core.logger.warn(`[Flash-Sale] CacheWarmupService 初始化失敗: ${String(error)}`)
      }
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
