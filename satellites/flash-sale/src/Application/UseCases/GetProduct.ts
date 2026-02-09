/**
 * 查詢單一商品 Use Case
 *
 * 支持 Redis 快取（5 分鐘 TTL）
 * 使用 remember 模式防止快取穿透
 * 集成熱度追蹤以支援智能快取預熱
 */

import type { Product } from '../../Domain/Models'
import type { CacheService } from '../../Infrastructure/Services/CacheService'
import type { IProductRepository } from '../Contracts/IProductRepository'

interface HotnessTracker {
  recordAccess(productId: string): Promise<void>
}

/**
 * GetProduct Use Case
 *
 * 查詢單一商品，支援快取
 * 快取命中率影響性能最大
 */
export class GetProduct {
  constructor(
    private repository: IProductRepository,
    private cache?: CacheService,
    private hotnessTracker?: HotnessTracker
  ) {}

  /**
   * 生成快取鍵
   */
  private getCacheKey(productId: string): string {
    return `product:detail:${productId}`
  }

  /**
   * 執行 Use Case
   */
  async execute(productId: string): Promise<Product | null> {
    // 參數驗證
    if (!productId || !productId.trim()) {
      throw new Error('Product ID is required')
    }

    // 記錄訪問熱度（異步，不阻塞主流程）
    if (this.hotnessTracker) {
      this.hotnessTracker.recordAccess(productId).catch(() => {
        // 靜默失敗，不影響主流程
      })
    }

    // 嘗試從快取讀取
    if (this.cache) {
      const cacheKey = this.getCacheKey(productId)
      const cached = await this.cache.get<Product>(cacheKey)

      if (cached) {
        return cached
      }
    }

    // 快取未命中，查詢數據庫
    const product = await this.repository.findById(productId)

    // 保存到快取（5 分鐘）
    // 即使 product 為 null，也會快取 null 值以防止快取穿透（TTL 短一些）
    if (this.cache) {
      const cacheKey = this.getCacheKey(productId)
      const ttl = product ? 300 : 30 // 成功 5 分鐘，失敗 30 秒
      await this.cache.set(cacheKey, product, ttl)
    }

    return product
  }
}
