/**
 * ListProducts UseCase（薄殼）
 *
 * 委派 ProductQueryContext 查詢商品列表，
 * 使用 ProductMapper 轉換結果為 ProductDTO 陣列。
 */

import type { CacheService } from '@gravito/core'
import type { IProductRepository } from '../../Domain/Contracts/IProductRepository'
import { ProductQueryContext } from '../../Domain/DCI/Contexts/ProductQueryContext'
import type { ProductDTO } from '../DTOs/ProductDTO'
import { ProductMapper } from '../DTOs/ProductDTO'

/**
 * ListProducts UseCase
 *
 * 薄殼：只負責 DTO 轉換 + 委派 ProductQueryContext
 */
export class ListProducts {
  private readonly queryContext: ProductQueryContext

  constructor(productRepo: IProductRepository, cache: CacheService) {
    this.queryContext = new ProductQueryContext(productRepo, cache)
  }

  /**
   * 查詢商品列表
   *
   * @returns ProductDTO 陣列
   */
  async execute(): Promise<ProductDTO[]> {
    // 委派 ProductQueryContext 查詢
    const products = await this.queryContext.listProducts()

    // 轉換為 DTO
    return ProductMapper.toDTOList(products)
  }
}
