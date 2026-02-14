/**
 * 性能優化服務提供者
 * 註冊連接池管理、多層快取等性能優化組件
 */

import { type Container, ServiceProvider } from '@gravito/core'
import { LayeredCacheService } from '../infrastructure/cache/LayeredCacheService'
import { ConnectionPoolManager } from '../infrastructure/pool/ConnectionPoolManager'

export class PerformanceServiceProvider extends ServiceProvider {
  /**
   * 註冊性能優化服務
   */
  register(container: Container): void {
    // 註冊分層快取服務
    container.singleton('cache.layered', () => {
      // 獲取 Redis 快取服務
      const redisCache = container.make('cache.redis') || container.make('CacheService')

      return new LayeredCacheService(redisCache, {
        l1Ttl: 60000, // 內存快取 1 分鐘
        l2Ttl: 300000, // Redis 快取 5 分鐘
        l1MaxSize: 1000, // 最多快取 1000 個項目
      })
    })

    // 註冊連接池管理器
    container.singleton('pool.manager', () => {
      const connection = container.make('connection') || container.make('db')

      return new ConnectionPoolManager(connection, {
        minSize: 5,
        maxSize: 20,
        idleTimeout: 30000,
        maxWaitTime: 5000,
        healthCheckInterval: 60000,
        warningThreshold: 75, // 連接利用率超過 75% 時警告
      })
    })
  }

  /**
   * 啟動性能優化系統
   */
  async boot(): Promise<void> {
    // 獲取連接池管理器
    const poolManager = this.core?.container.make<ConnectionPoolManager>('pool.manager') as
      | ConnectionPoolManager
      | undefined

    if (poolManager) {
      try {
        // 預熱連接池
        await poolManager.warmup()

        // 啟動健康檢查
        poolManager.startHealthCheck()

        // 定期自適應調整池大小
        setInterval(async () => {
          await poolManager.adaptPoolSize()
        }, 30000) // 每 30 秒檢查一次

        console.log('[Performance] ✅ 性能優化系統已初始化')
        console.log('[Performance] - 連接池已預熱')
        console.log('[Performance] - 多層快取已啟用')
        console.log('[Performance] - 自適應池管理已啟動')
      } catch (error) {
        console.error('[Performance] 初始化失敗:', error)
      }
    }
  }
}
