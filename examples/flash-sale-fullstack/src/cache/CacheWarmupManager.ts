/**
 * 快取預熱管理器
 *
 * 實現三層預熱策略：
 * 1. 啟動時預熱 - 預加載熱銷商品
 * 2. 熱度驅動預熱 - 當商品熱度增加時自動預熱
 * 3. 定期再預熱 - 保持快取新鮮度
 */

import type { HeatMetrics, HotProductTracker } from './HotProductTracker'

export interface WarmupConfig {
  topProductsCount: number // 啟動時預熱的商品數量
  heatThreshold: number // 觸發預熱的熱度閾值
  ttl: number // 快取 TTL（秒）
  periodicInterval: number // 定期預熱間隔（秒）
  relatedProductsCount: number // 預熱的相關商品數量
}

export interface WarmupMetrics {
  totalWarmed: number
  lastWarmupTime: number
  avgWarmupDuration: number
  cacheHitRate: number
}

export class CacheWarmupManager {
  private readonly heatTracker: HotProductTracker
  private readonly cacheService: any
  private readonly db: any
  private readonly config: WarmupConfig
  private readonly metrics: WarmupMetrics
  private periodicTimer: NodeJS.Timeout | null = null

  constructor(
    heatTracker: HotProductTracker,
    cacheService: any,
    db: any,
    config: Partial<WarmupConfig> = {}
  ) {
    this.heatTracker = heatTracker
    this.cacheService = cacheService
    this.db = db

    this.config = {
      topProductsCount: 100,
      heatThreshold: 100,
      ttl: 300, // 5 分鐘
      periodicInterval: 600, // 10 分鐘
      relatedProductsCount: 10,
      ...config,
    }

    this.metrics = {
      totalWarmed: 0,
      lastWarmupTime: 0,
      avgWarmupDuration: 0,
      cacheHitRate: 0,
    }
  }

  /**
   * 啟動時預熱熱銷商品
   */
  async warmupOnStartup(): Promise<void> {
    const startTime = Date.now()

    try {
      // 取得前 N 個最熱銷商品
      const topProducts = await this.heatTracker.getTopProducts(this.config.topProductsCount)

      // 批量預熱
      const promises = topProducts.map((item) => this.warmupProduct(item.productId))

      await Promise.all(promises)

      const duration = Date.now() - startTime
      this.updateMetrics(topProducts.length, duration)

      console.log(`[CacheWarmup] 啟動預熱完成：${topProducts.length} 個商品，耗時 ${duration}ms`)
    } catch (error) {
      console.error('[CacheWarmup] 啟動預熱失敗:', error)
    }
  }

  /**
   * 記錄商品訪問時檢查是否需要預熱
   */
  async onProductViewed(productId: string): Promise<void> {
    // 記錄訪問
    await this.heatTracker.recordView(productId)

    // 檢查是否達到預熱閾值
    const shouldWarmup = await this.heatTracker.shouldWarmup(productId, this.config.heatThreshold)

    if (shouldWarmup) {
      // 預熱相關商品
      await this.preloadRelatedProducts(productId)
    }
  }

  /**
   * 定期再預熱保持快取新鮮
   */
  async startPeriodicWarmup(): Promise<void> {
    if (this.periodicTimer) {
      return
    }

    this.periodicTimer = setInterval(async () => {
      try {
        await this.periodicWarmup()
      } catch (error) {
        console.error('[CacheWarmup] 定期預熱錯誤:', error)
      }
    }, this.config.periodicInterval * 1000)

    console.log('[CacheWarmup] 定期預熱已啟動')
  }

  /**
   * 停止定期預熱
   */
  stopPeriodicWarmup(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer)
      this.periodicTimer = null
      console.log('[CacheWarmup] 定期預熱已停止')
    }
  }

  /**
   * 預熱單個商品
   */
  private async warmupProduct(productId: string): Promise<void> {
    try {
      // 從快取取得
      let product = await this.cacheService.get(`product:${productId}`)

      // 快取未命中，從 DB 取得
      if (!product) {
        product = await this.db.query('SELECT * FROM products WHERE id = $1', [productId])

        // 寫入快取
        if (product) {
          await this.cacheService.set(`product:${productId}`, product, this.config.ttl)
        }
      }
    } catch (error) {
      console.error(`[CacheWarmup] 預熱商品 ${productId} 失敗:`, error)
    }
  }

  /**
   * 預熱相關商品（交叉銷售）
   */
  private async preloadRelatedProducts(productId: string): Promise<void> {
    try {
      // 查詢相關商品
      const relatedProducts = await this.db.query(
        `
        SELECT p.* FROM products p
        WHERE p.id IN (
          SELECT related_product_id 
          FROM product_relations 
          WHERE product_id = $1
          LIMIT $2
        )
      `,
        [productId, this.config.relatedProductsCount]
      )

      // 批量預熱
      const promises = relatedProducts.map((p: any) =>
        this.cacheService.set(`product:${p.id}`, p, this.config.ttl)
      )

      await Promise.all(promises)

      console.log(`[CacheWarmup] 預熱了 ${relatedProducts.length} 個相關商品`)
    } catch (error) {
      console.error('[CacheWarmup] 預熱相關商品失敗:', error)
    }
  }

  /**
   * 定期再預熱
   */
  private async periodicWarmup(): Promise<void> {
    try {
      const topProducts = await this.heatTracker.getTopProducts(this.config.topProductsCount)

      const promises = topProducts.map((item) =>
        this.cacheService.refresh(`product:${item.productId}`, this.config.ttl)
      )

      await Promise.all(promises)

      console.log(`[CacheWarmup] 定期預熱完成：${topProducts.length} 個商品`)
    } catch (error) {
      console.error('[CacheWarmup] 定期預熱失敗:', error)
    }
  }

  /**
   * 更新統計指標
   */
  private updateMetrics(warmedCount: number, duration: number): void {
    this.metrics.totalWarmed += warmedCount
    this.metrics.lastWarmupTime = Date.now()
    this.metrics.avgWarmupDuration =
      (this.metrics.avgWarmupDuration * (this.metrics.totalWarmed - warmedCount) + duration) /
      this.metrics.totalWarmed
  }

  /**
   * 取得預熱統計
   */
  getMetrics(): WarmupMetrics {
    return { ...this.metrics }
  }
}
