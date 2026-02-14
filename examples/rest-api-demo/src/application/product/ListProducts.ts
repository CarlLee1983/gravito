/**
 * ListProducts Use Case - Phase 8 性能優化版
 *
 * 優化策略：
 * 1. 多層快取（L1: 內存, L2: Redis）
 * 2. Eager Loading（預加載分類信息）
 * 3. 查詢優化（複合索引、遊標分頁）
 * 4. 連接池管理
 */

import type { Product } from '@domain/product/Product'
import type { LayeredCacheService } from '@infrastructure/cache/LayeredCacheService'
import { QueryOptimizer } from '@infrastructure/query/QueryOptimizer'
import type { ProductRepository } from '@infrastructure/repositories/ProductRepository'

export interface ListProductsRequest {
  page?: number
  limit?: number
  cursor?: string // 遊標分頁
  categoryId?: string
}

export interface ListProductsResponse {
  data: Product[]
  total?: number
  page?: number
  limit?: number
  nextCursor?: string // 遊標分頁結果
  hasMore?: boolean
}

export class ListProductsUseCase {
  private cacheKeyPrefix = 'products:list'

  constructor(
    private productRepository: ProductRepository,
    private cacheService?: LayeredCacheService
  ) {}

  async execute(request: ListProductsRequest): Promise<ListProductsResponse> {
    // =========================================================================
    // 1. 驗證輸入
    // =========================================================================
    const limit = Math.min(request.limit ?? 20, 100)

    // =========================================================================
    // 2. 嘗試從快取獲取
    // =========================================================================
    if (request.cursor) {
      // 遊標分頁不快取（因為結果是動態的）
      return this.executeCursorPagination(request)
    }

    const page = Math.max(request.page ?? 1, 1)
    const cacheKey = `${this.cacheKeyPrefix}:page_${page}:limit_${limit}${
      request.categoryId ? `:category_${request.categoryId}` : ''
    }`

    if (this.cacheService) {
      const cached = await this.cacheService.get<ListProductsResponse>(cacheKey)
      if (cached) {
        console.log(`[Cache] 命中: ${cacheKey}`)
        return cached
      }
    }

    // =========================================================================
    // 3. 執行數據庫查詢（包含 Eager Loading）
    // =========================================================================
    let result: ListProductsResponse

    if (request.categoryId) {
      result = await this.productRepository.findByCategory(request.categoryId, page, limit)
    } else {
      result = await this.productRepository.findAll(page, limit)
    }

    // =========================================================================
    // 4. 存儲到快取
    // =========================================================================
    if (this.cacheService) {
      // 产品列表快取 5 分鐘
      await this.cacheService.set(cacheKey, result, 5 * 60 * 1000)
    }

    return result
  }

  /**
   * 遊標分頁執行
   */
  private async executeCursorPagination(
    request: ListProductsRequest
  ): Promise<ListProductsResponse> {
    console.log('[Products] 使用遊標分頁')

    const limit = Math.min(request.limit ?? 20, 100)

    // 使用 QueryOptimizer 構建遊標分頁查詢
    const paginationResponse = await QueryOptimizer.buildCursorPaginationQuery(
      this.productRepository,
      {
        cursor: request.cursor,
        limit,
        direction: 'next',
      },
      'id', // 按 ID 排序
      'asc'
    )

    return {
      data: paginationResponse.data as Product[],
      nextCursor: paginationResponse.nextCursor,
      hasMore: paginationResponse.hasMore,
      limit: paginationResponse.limit,
    }
  }

  /**
   * 獲取快取統計
   */
  getCacheStats(): any {
    if (this.cacheService) {
      return this.cacheService.getStats()
    }
    return null
  }

  /**
   * 清空快取
   */
  async clearCache(): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.deletePattern(`${this.cacheKeyPrefix}:*`)
      console.log('[Cache] 已清空產品列表快取')
    }
  }
}
