/**
 * GetProduct UseCase（薄殼）
 *
 * 接收 productId，委派 ProductQueryContext 查詢，
 * 使用 ProductMapper 轉換結果為 ProductDTO。
 */

import type { CacheService } from '@gravito/core'
import type { IProductRepository } from '../../Domain/Contracts/IProductRepository'
import { ProductQueryContext } from '../../Domain/DCI/Contexts/ProductQueryContext'
import type { ProductDTO } from '../DTOs/ProductDTO'
import { ProductMapper } from '../DTOs/ProductDTO'

/**
 * GetProduct UseCase
 *
 * 薄殼：只負責 DTO 轉換 + 委派 ProductQueryContext
 */
export class GetProduct {
  private readonly queryContext: ProductQueryContext

  constructor(productRepo: IProductRepository, cache: CacheService) {
    this.queryContext = new ProductQueryContext(productRepo, cache)
  }

  /**
   * 查詢單一商品
   *
   * @param productId - 商品 ID
   * @returns ProductDTO 或 null
   */
  async execute(productId: string): Promise<ProductDTO | null> {
    // 委派 ProductQueryContext 查詢（含快取）
    const product = await this.queryContext.getProduct(productId)

    if (!product) {
      return null
    }

    // 轉換為 DTO
    return ProductMapper.toDTO(product)
  }
}
