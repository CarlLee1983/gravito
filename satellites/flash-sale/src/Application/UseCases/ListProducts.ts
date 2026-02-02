/**
 * 查詢商品列表 Use Case
 */

import type { IProductRepository } from '../Contracts/IProductRepository'
import type { Product } from '../../Domain/Models'

/**
 * 查詢商品列表的請求與回應
 */
export interface ListProductsRequest {
  page?: number
  limit?: number
  status?: string
}

export interface ListProductsResponse {
  items: Product[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

/**
 * ListProducts Use Case
 *
 * 查詢商品列表，支援分頁與篩選
 */
export class ListProducts {
  constructor(private repository: IProductRepository) {}

  /**
   * 執行 Use Case
   */
  async execute(request: ListProductsRequest): Promise<ListProductsResponse> {
    // 驗證請求
    const page = Math.max(request.page || 1, 1)
    const limit = Math.min(request.limit || 20, 100) // 最多 100 個

    // 查詢商品
    const result = await this.repository.findAll({
      page,
      limit,
      status: request.status,
    })

    // 計算是否有更多項目
    const hasMore = (page - 1) * limit + result.items.length < result.total

    return {
      items: result.items,
      total: result.total,
      page,
      limit,
      hasMore,
    }
  }
}
