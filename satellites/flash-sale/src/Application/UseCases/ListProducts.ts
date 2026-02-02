/**
 * 查詢商品列表 Use Case
 *
 * 支持 Redis 快取（5 分鐘 TTL）
 */

import type { Product } from '../../Domain/Models'
import type { CacheService } from '../../Infrastructure/Services/CacheService'
import type { IProductRepository } from '../Contracts/IProductRepository'

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
 * 查詢結果在 5 分鐘內快取
 */
export class ListProducts {
  constructor(
    private repository: IProductRepository,
    private cache?: CacheService
  ) {}

  /**
   * 生成快取鍵
   */
  private getCacheKey(request: ListProductsRequest): string {
    const page = Math.max(request.page || 1, 1)
    const limit = Math.min(request.limit || 20, 100)
    const status = request.status || 'active'
    return `product:list:${page}:${limit}:${status}`
  }

  /**
   * 執行 Use Case
   */
  async execute(request: ListProductsRequest): Promise<ListProductsResponse> {
    // 驗證請求
    const page = Math.max(request.page || 1, 1)
    const limit = Math.min(request.limit || 20, 100) // 最多 100 個

    // 嘗試從快取讀取
    if (this.cache) {
      const cacheKey = this.getCacheKey(request)
      const cached = await this.cache.get<ListProductsResponse>(cacheKey)
      if (cached) {
        return cached
      }
    }

    // 快取未命中，查詢數據庫
    const result = await this.repository.findAll({
      page,
      limit,
      status: request.status,
    })

    // 計算是否有更多項目
    const hasMore = (page - 1) * limit + result.items.length < result.total

    const response: ListProductsResponse = {
      items: result.items,
      total: result.total,
      page,
      limit,
      hasMore,
    }

    // 保存到快取（5 分鐘）
    if (this.cache) {
      const cacheKey = this.getCacheKey(request)
      await this.cache.set(cacheKey, response, { ttl: 300 })
    }

    return response
  }
}
