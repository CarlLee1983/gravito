/**
 * 商品控制器
 *
 * 處理商品相關的 HTTP 請求。
 * 使用 DCI Context（透過 UseCase 薄殼）處理業務邏輯。
 * 使用 FlashSaleError.httpStatus 進行統一錯誤回應。
 */

import type { CacheService, GravitoContext, PlanetCore } from '@gravito/core'
import { FlashSaleError } from '../../../Application/Errors/FlashSaleError'
import { GetProduct } from '../../../Application/UseCases/GetProduct'
import { ListProducts } from '../../../Application/UseCases/ListProducts'
import type { IProductRepository } from '../../../Domain/Contracts/IProductRepository'

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
      const productRepo = this.core.container.make<IProductRepository>('product.repository')
      const cacheService = this.core.container.make<CacheService>('cache.service')

      const useCase = new ListProducts(productRepo, cacheService)
      const result = await useCase.execute()

      ctx.json({
        success: true,
        data: result,
      })
    } catch (error) {
      this.handleError(ctx, error, 'Failed to list products')
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

      const productRepo = this.core.container.make<IProductRepository>('product.repository')
      const cacheService = this.core.container.make<CacheService>('cache.service')

      const useCase = new GetProduct(productRepo, cacheService)
      const product = await useCase.execute(id)

      if (!product) {
        ctx.status(404)
        ctx.json({ success: false, error: 'Product not found' })
        return
      }

      ctx.json({
        success: true,
        data: product,
      })
    } catch (error) {
      this.handleError(ctx, error, 'Failed to get product')
    }
  }

  /**
   * 統一錯誤處理
   *
   * 使用 FlashSaleError.httpStatus 決定 HTTP 狀態碼
   */
  private handleError(ctx: GravitoContext, error: unknown, defaultMessage: string): void {
    if (error instanceof FlashSaleError) {
      this.core.logger.error(`${defaultMessage}: ${error.message}`)
      ctx.status(error.httpStatus)
      ctx.json({
        success: false,
        error: error.message,
        code: error.code,
      })
    } else {
      this.core.logger.error(`${defaultMessage}: ${String(error)}`)
      ctx.status(500)
      ctx.json({
        success: false,
        error: defaultMessage,
      })
    }
  }
}
