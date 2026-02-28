/**
 * ProductQueryContext - 商品查詢 Context
 *
 * 負責商品查詢，含快取策略：
 * - 查詢商品（快取優先）
 * - 列出商品列表
 * - 主動失效快取
 */

import type { CacheService } from '@gravito/core'
import type { IProductRepository } from '../../Contracts/IProductRepository'
import type { Product } from '../../Entities/Product'

/** 商品快取鍵前綴 */
const CACHE_PREFIX = 'flash-sale:product:'

/** 商品快取 TTL（秒） */
const CACHE_TTL = 300

/**
 * ProductQueryContext
 *
 * 商品查詢的 DCI Context，整合快取策略
 */
export class ProductQueryContext {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly cache: CacheService
  ) {}

  /**
   * 查詢商品（含快取）
   *
   * 流程：
   * 1. 嘗試從快取取得
   * 2. 若快取未命中，從 repository 查詢
   * 3. 查詢結果存入快取
   *
   * @param productId - 商品 ID
   * @returns 商品或 null
   */
  async getProduct(productId: string): Promise<Product | null> {
    const cacheKey = `${CACHE_PREFIX}${productId}`

    // 1. 嘗試快取
    const cached = await this.cache.get<Product>(cacheKey)
    if (cached) {
      return cached
    }

    // 2. 從 repository 查詢
    const product = await this.productRepo.findById(productId)
    if (!product) {
      return null
    }

    // 3. 存入快取
    await this.cache.set(cacheKey, product, CACHE_TTL)

    return product
  }

  /**
   * 列出商品列表
   *
   * @returns 商品列表
   */
  async listProducts(): Promise<Product[]> {
    return this.productRepo.findAll()
  }

  /**
   * 主動失效快取
   *
   * @param productId - 商品 ID，或 'all' 清空所有快取
   */
  async invalidateCache(productId: string | 'all'): Promise<void> {
    if (productId === 'all') {
      await this.cache.clear()
    } else {
      const cacheKey = `${CACHE_PREFIX}${productId}`
      await this.cache.delete(cacheKey)
    }
  }
}
