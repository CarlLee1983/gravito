/**
 * 商品控制器
 *
 * 處理商品相關的 HTTP 請求
 */

import type { CacheService, GravitoContext, PlanetCore } from '@gravito/core'
import type { IProductRepository } from '../../../Application/Contracts/IProductRepository'
import { GetProduct } from '../../../Application/UseCases/GetProduct'
import { ListProducts } from '../../../Application/UseCases/ListProducts'

/**
 * ProductController
 */
export class ProductController {
  constructor(private core: PlanetCore) {}

  /**
   * GET /api/products
   *
   * 查詢商品列表
   */
  async index(ctx: GravitoContext): Promise<void> {
    try {
      // 取得 query 參數
      const page = parseInt(ctx.req.query('page') || '1', 10)
      const limit = parseInt(ctx.req.query('limit') || '20', 10)
      const status = ctx.req.query('status')

      // 取得 Repository
      const productRepository = this.core.container.make<IProductRepository>('product.repository')

      // 執行 Use Case
      const useCase = new ListProducts(productRepository)
      const result = await useCase.execute({
        page,
        limit,
        status,
      })

      // 回應成功
      ctx.json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          hasMore: result.hasMore,
        },
      })
    } catch (error) {
      this.core.logger.error(`Failed to list products: ${String(error)}`)
      ctx.status(500)
      ctx.json({
        success: false,
        error: 'Failed to list products',
      })
    }
  }

  /**
   * GET /api/products/:id
   *
   * 查詢單一商品（支持快取）
   */
  async show(ctx: GravitoContext): Promise<void> {
    try {
      const id = ctx.req.param('id')

      if (!id) {
        ctx.status(400)
        ctx.json({ success: false, error: 'Product ID is required' })
        return
      }

      const productRepository = this.core.container.make<IProductRepository>('product.repository')
      const cacheService = this.core.container.make<CacheService | undefined>('cache.service')
      const hotnessTracker = this.core.container.make<any>('hotness.tracker')

      // 使用新的 GetProduct Use Case（支持快取和熱度追蹤）
      const useCase = new GetProduct(productRepository, cacheService, hotnessTracker)
      const product = await useCase.execute(id)

      if (!product) {
        ctx.status(404)
        ctx.json({
          success: false,
          error: 'Product not found',
        })
        return
      }

      ctx.json({
        success: true,
        data: product,
      })
    } catch (error) {
      this.core.logger.error(`Failed to get product: ${String(error)}`)
      ctx.status(500)
      ctx.json({
        success: false,
        error: 'Failed to get product',
      })
    }
  }
}
