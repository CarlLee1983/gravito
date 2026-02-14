/**
 * GetProduct Use Case - Phase 8 性能優化版
 *
 * 優化策略：
 * 1. 多層快取（L1: 內存, L2: Redis）
 * 2. Eager Loading（預加載分類和庫存信息）
 * 3. 連接池性能監控
 */

import type { Product } from '@domain/product/Product'
import type { LayeredCacheService } from '@infrastructure/cache/LayeredCacheService'
import type { ProductRepository } from '@infrastructure/repositories/ProductRepository'

export interface GetProductRequest {
  productId: string
  bypassCache?: boolean // 是否跳過快取
}

export class GetProductUseCase {
  private cacheKeyPrefix = 'product'

  constructor(
    private productRepository: ProductRepository,
    private cacheService?: LayeredCacheService
  ) {}

  async execute(request: GetProductRequest): Promise<Product> {
    if (!request.productId) {
      throw new Error('Product ID is required')
    }

    // =========================================================================
    // 1. 嘗試從快取獲取
    // =========================================================================
    const cacheKey = `${this.cacheKeyPrefix}:${request.productId}`

    if (!request.bypassCache && this.cacheService) {
      const cached = await this.cacheService.get<Product>(cacheKey)
      if (cached) {
        console.log(`[Cache] 命中: ${cacheKey}`)
        return cached
      }
    }

    // =========================================================================
    // 2. 執行數據庫查詢（包含 Eager Loading）
    // =========================================================================
    const product = await this.productRepository.findById(request.productId)

    if (!product) {
      throw new Error('Product not found')
    }

    // =========================================================================
    // 3. 存儲到快取
    // =========================================================================
    if (this.cacheService) {
      // 單個產品快取 5 分鐘
      await this.cacheService.set(cacheKey, product, 5 * 60 * 1000)
      console.log(`[Cache] 已快取: ${cacheKey}`)
    }

    return product
  }

  /**
   * 刪除快取（例如在產品更新後）
   */
  async invalidateCache(productId: string): Promise<void> {
    if (this.cacheService) {
      const cacheKey = `${this.cacheKeyPrefix}:${productId}`
      await this.cacheService.delete(cacheKey)
      console.log(`[Cache] 已失效: ${cacheKey}`)
    }
  }
}
