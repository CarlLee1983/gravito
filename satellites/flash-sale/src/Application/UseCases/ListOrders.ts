/**
 * 查詢用戶訂單列表 Use Case
 *
 * 支持 Redis 快取（60 秒 TTL，因為訂單變化頻繁）
 */

import type { Order, OrderStatus } from '../../Domain/Models'
import type { CacheService } from '../../Infrastructure/Services/CacheService'
import type { IOrderRepository } from '../Contracts/IOrderRepository'

/**
 * ListOrders Use Case 請求
 */
export interface ListOrdersRequest {
  userId: string
  page?: number
  limit?: number
  status?: OrderStatus
}

/**
 * ListOrders Use Case 回應
 */
export interface ListOrdersResponse {
  items: Order[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

/**
 * ListOrders Use Case
 *
 * 查詢用戶的訂單列表，支援分頁與狀態篩選
 * 訂單列表變化頻繁，使用短 TTL 快取（60 秒）
 */
export class ListOrders {
  constructor(
    private repository: IOrderRepository,
    private cache?: CacheService
  ) {}

  /**
   * 生成快取鍵
   */
  private getCacheKey(request: ListOrdersRequest): string {
    const page = Math.max(request.page || 1, 1)
    const limit = Math.min(request.limit || 10, 100)
    const status = request.status || 'all'
    return `user:orders:${request.userId}:${page}:${limit}:${status}`
  }

  /**
   * 執行 Use Case
   */
  async execute(request: ListOrdersRequest): Promise<ListOrdersResponse> {
    // 參數驗證
    if (!request.userId || !request.userId.trim()) {
      throw new Error('User ID is required')
    }

    const page = Math.max(request.page || 1, 1)
    const limit = Math.min(request.limit || 10, 100)

    // 嘗試從快取讀取
    if (this.cache) {
      const cacheKey = this.getCacheKey(request)
      const cached = await this.cache.get<ListOrdersResponse>(cacheKey)

      if (cached) {
        return cached
      }
    }

    // 快取未命中，查詢數據庫
    const result = await this.repository.findByUserId(request.userId, {
      status: request.status,
      page,
      limit,
    })

    // 計算是否有更多項目
    const hasMore = (page - 1) * limit + result.items.length < result.total

    const response: ListOrdersResponse = {
      items: result.items,
      total: result.total,
      page,
      limit,
      hasMore,
    }

    // 保存到快取（60 秒，訂單變化頻繁）
    if (this.cache) {
      const cacheKey = this.getCacheKey(request)
      await this.cache.set(cacheKey, response, 60)
    }

    return response
  }
}
