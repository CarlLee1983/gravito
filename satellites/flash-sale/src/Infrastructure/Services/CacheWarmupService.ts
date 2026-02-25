/**
 * CacheWarmupService - 智能快取預熱服務
 *
 * 支持三種預熱策略：
 * 1. 啟動時預熱 - 預熱 Top 100 熱門商品
 * 2. 事件驅動預熱 - 熱度突增時觸發
 * 3. 定期再預熱 - 5 分鐘刷新快取 TTL
 */

import type { CacheService } from '@gravito/core'
import type { IProductRepository } from '../../Application/Contracts/IProductRepository'
import type { HotnessTracker } from './HotnessTracker'

interface Logger {
  debug(message: string): void
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

interface MetricsRegistry {
  histogram(config: { name: string; labels?: string[] }): {
    observe(value: number, labels?: Record<string, string>): void
  }
  counter(config: { name: string; labels?: string[] }): {
    inc(labels?: Record<string, string>): void
  }
}

/**
 * CacheWarmupService 類
 *
 * 智能預熱管理器，優化快取命中率
 */
export class CacheWarmupService {
  private readonly batchSize = 10
  private readonly batchDelay = 50 // ms
  private readonly hotnesThreshold = 50 // 訪問次數閾值
  private refreshTimer: NodeJS.Timeout | null = null
  private warmingUp = false

  constructor(
    private hotnessTracker: HotnessTracker,
    private productRepository: IProductRepository,
    private cache: CacheService,
    private logger: Logger,
    private metrics: MetricsRegistry
  ) {}

  /**
   * 啟動時預熱 - 預熱 Top 100 商品
   */
  async warmupOnStartup(): Promise<void> {
    if (this.warmingUp) {
      this.logger.warn('[Warmup] 已在進行預熱，跳過')
      return
    }

    this.warmingUp = true
    const startTime = performance.now()

    try {
      this.logger.info('[Warmup] 開始啟動預熱...')

      // 獲取所有商品
      const result = await this.productRepository.findAll({
        limit: 100,
        page: 1,
      })

      if (!result.items || result.items.length === 0) {
        this.logger.warn('[Warmup] 無可用商品進行預熱')
        return
      }

      // 分批預熱
      let warmedCount = 0
      for (let i = 0; i < result.items.length; i += this.batchSize) {
        const batch = result.items.slice(i, i + this.batchSize)

        // 並行獲取和快取
        const promises = batch.map(async (product) => {
          const cacheKey = `product:detail:${product.id}`
          try {
            await this.cache.set(cacheKey, product, 300) // 5 分鐘 TTL
            warmedCount++
          } catch (error) {
            this.logger.warn(`[Warmup] 預熱商品 ${product.id} 失敗: ${String(error)}`)
          }
        })

        await Promise.all(promises)

        // 批次間延遲（避免 DB 壓力）
        if (i + this.batchSize < result.items.length) {
          await this.sleep(this.batchDelay)
        }
      }

      const duration = performance.now() - startTime
      this.logger.info(`[Warmup] 啟動預熱完成：${warmedCount} 商品，耗時 ${duration.toFixed(0)}ms`)

      // 記錄 metrics
      this.metrics
        .histogram({
          name: 'cache_warmup_duration_seconds',
          labels: ['type'],
        })
        .observe(duration / 1000, { type: 'startup' })

      this.metrics
        .counter({
          name: 'cache_warmup_items_total',
          labels: ['type'],
        })
        .inc({ type: 'startup' })
    } catch (error) {
      this.logger.error(`[Warmup] 啟動預熱失敗: ${String(error)}`)
      this.metrics
        .counter({
          name: 'cache_warmup_errors_total',
          labels: ['type'],
        })
        .inc({ type: 'startup' })
    } finally {
      this.warmingUp = false
    }
  }

  /**
   * 事件驅動預熱 - 當熱度突增時觸發
   */
  async warmupOnHotness(productId: string): Promise<void> {
    try {
      const hotness = await this.hotnessTracker.getHotness(productId)

      // 如果熱度超過閾值，觸發預熱
      if (hotness >= this.hotnesThreshold) {
        const startTime = performance.now()

        const product = await this.productRepository.findById(productId)
        if (product) {
          const cacheKey = `product:detail:${productId}`
          await this.cache.set(cacheKey, product, 300)

          const duration = performance.now() - startTime
          this.logger.debug(`[Warmup] 事件驅動預熱: ${productId}, 耗時 ${duration.toFixed(0)}ms`)

          this.metrics
            .histogram({
              name: 'cache_warmup_duration_seconds',
              labels: ['type'],
            })
            .observe(duration / 1000, { type: 'event_driven' })
        }
      }
    } catch (error) {
      this.logger.warn(`[Warmup] 事件驅動預熱失敗: ${String(error)}`)
    }
  }

  /**
   * 定期刷新 - 5 分鐘檢查一次 TTL，刷新即將過期的快取
   */
  async refreshWarmup(): Promise<void> {
    if (this.warmingUp) {
      return
    }

    this.warmingUp = true
    const startTime = performance.now()

    try {
      this.logger.debug('[Warmup] 開始定期刷新快取...')

      // 獲取 Top 50 熱門商品
      const topProducts = await this.hotnessTracker.getTopHot(50)

      if (!topProducts || topProducts.length === 0) {
        return
      }

      // 分批檢查和刷新
      let refreshedCount = 0
      for (let i = 0; i < topProducts.length; i += this.batchSize) {
        const batch = topProducts.slice(i, i + this.batchSize)

        const promises = batch.map(async (productId) => {
          const cacheKey = `product:detail:${productId}`

          try {
            // 簡化版本：直接重新快取熱點商品
            const product = await this.productRepository.findById(productId)
            if (product) {
              await this.cache.set(cacheKey, product, 300)
              refreshedCount++
            }
          } catch (error) {
            this.logger.warn(`[Warmup] 刷新商品 ${productId} 失敗: ${String(error)}`)
          }
        })

        await Promise.all(promises)

        if (i + this.batchSize < topProducts.length) {
          await this.sleep(this.batchDelay)
        }
      }

      const duration = performance.now() - startTime
      this.logger.debug(
        `[Warmup] 定期刷新完成：${refreshedCount} 商品被刷新，耗時 ${duration.toFixed(0)}ms`
      )

      // 記錄 metrics
      this.metrics
        .histogram({
          name: 'cache_warmup_duration_seconds',
          labels: ['type'],
        })
        .observe(duration / 1000, { type: 'periodic_refresh' })
    } catch (error) {
      this.logger.warn(`[Warmup] 定期刷新失敗: ${String(error)}`)
    } finally {
      this.warmingUp = false
    }
  }

  /**
   * 啟動定期刷新定時器
   */
  startPeriodicRefresh(intervalSeconds = 300): void {
    if (this.refreshTimer) {
      return
    }

    this.logger.info(`[Warmup] 啟動定期刷新定時器（間隔 ${intervalSeconds}s）`)

    this.refreshTimer = setInterval(() => {
      this.refreshWarmup().catch((error) => {
        this.logger.error(`[Warmup] 定期刷新錯誤: ${String(error)}`)
      })
    }, intervalSeconds * 1000)
  }

  /**
   * 停止定期刷新定時器
   */
  stopPeriodicRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
      this.logger.info('[Warmup] 定期刷新定時器已停止')
    }
  }

  /**
   * 手動觸發完整預熱
   */
  async fullWarmup(): Promise<void> {
    await this.warmupOnStartup()
  }

  /**
   * 輔助方法：延遲
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 獲取預熱統計
   */
  async getStats(): Promise<{
    isWarmingUp: boolean
    timerRunning: boolean
  }> {
    return {
      isWarmingUp: this.warmingUp,
      timerRunning: this.refreshTimer !== null,
    }
  }
}
