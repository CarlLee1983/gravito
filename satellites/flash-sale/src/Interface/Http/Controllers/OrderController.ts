/**
 * 訂單控制器
 *
 * 處理訂單相關的 HTTP 請求。
 * 使用 DCI Context（透過 UseCase 薄殼）處理業務邏輯。
 * 使用 FlashSaleError.httpStatus 進行統一錯誤回應。
 */

import type { GravitoContext, PlanetCore } from '@gravito/core'
import { FlashSaleError } from '../../../Application/Errors/FlashSaleError'
import { ConfirmOrder } from '../../../Application/UseCases/ConfirmOrder'
import { CreateBulkOrder } from '../../../Application/UseCases/CreateBulkOrder'
import { CreateOrder } from '../../../Application/UseCases/CreateOrder'
import { GetOrder } from '../../../Application/UseCases/GetOrder'
import { ListOrders } from '../../../Application/UseCases/ListOrders'
import type { IOrderRepository } from '../../../Domain/Contracts/IOrderRepository'
import type { IProductRepository } from '../../../Domain/Contracts/IProductRepository'

/**
 * OrderController
 */
export class OrderController {
  constructor(private core: PlanetCore) {}

  /**
   * POST /api/orders
   *
   * 建立訂單（搶購核心流程）
   */
  async store(ctx: GravitoContext): Promise<void> {
    try {
      const body = (await ctx.req.json()) as {
        userId: string
        productId: string
        quantity: number
      }

      const productRepo = this.core.container.make<IProductRepository>('product.repository')
      const orderRepo = this.core.container.make<IOrderRepository>('order.repository')

      const useCase = new CreateOrder(productRepo, orderRepo)
      const result = await useCase.execute({
        userId: body.userId,
        productId: body.productId,
        quantity: body.quantity,
      })

      ctx.status(201)
      ctx.json({
        success: true,
        data: result,
      })
    } catch (error) {
      this.handleError(ctx, error, 'Failed to create order')
    }
  }

  /**
   * POST /api/orders/bulk
   *
   * 建立多商品訂單（批量搶購）
   */
  async storeBulk(ctx: GravitoContext): Promise<void> {
    try {
      const body = (await ctx.req.json()) as {
        userId: string
        items: Array<{
          productId: string
          quantity: number
        }>
      }

      const productRepo = this.core.container.make<IProductRepository>('product.repository')
      const orderRepo = this.core.container.make<IOrderRepository>('order.repository')

      const useCase = new CreateBulkOrder(productRepo, orderRepo)
      const result = await useCase.execute({
        userId: body.userId,
        items: body.items,
      })

      ctx.status(201)
      ctx.json({
        success: true,
        data: result,
      })
    } catch (error) {
      this.handleError(ctx, error, 'Failed to create bulk order')
    }
  }

  /**
   * PUT /api/orders/:id/confirm
   *
   * 確認訂單
   */
  async confirm(ctx: GravitoContext): Promise<void> {
    try {
      const id = ctx.req.param('id')
      if (!id) {
        ctx.status(400)
        ctx.json({ success: false, error: 'Order ID is required' })
        return
      }

      const orderRepo = this.core.container.make<IOrderRepository>('order.repository')
      const useCase = new ConfirmOrder(orderRepo)
      const result = await useCase.execute(id)

      ctx.json({
        success: true,
        data: result,
      })
    } catch (error) {
      this.handleError(ctx, error, 'Failed to confirm order')
    }
  }

  /**
   * GET /api/orders/:id
   *
   * 查詢訂單詳情
   */
  async show(ctx: GravitoContext): Promise<void> {
    try {
      const id = ctx.req.param('id')
      if (!id) {
        ctx.status(400)
        ctx.json({ success: false, error: 'Order ID is required' })
        return
      }

      const orderRepo = this.core.container.make<IOrderRepository>('order.repository')
      const useCase = new GetOrder(orderRepo)
      const order = await useCase.execute(id)

      if (!order) {
        ctx.status(404)
        ctx.json({ success: false, error: 'Order not found' })
        return
      }

      ctx.json({
        success: true,
        data: order,
      })
    } catch (error) {
      this.handleError(ctx, error, 'Failed to get order')
    }
  }

  /**
   * GET /api/orders
   *
   * 查詢用戶的訂單列表
   */
  async list(ctx: GravitoContext): Promise<void> {
    try {
      const userId = ctx.req.query('userId')
      if (!userId) {
        ctx.status(400)
        ctx.json({
          success: false,
          error: 'userId query parameter is required',
        })
        return
      }

      const orderRepo = this.core.container.make<IOrderRepository>('order.repository')
      const useCase = new ListOrders(orderRepo)
      const result = await useCase.execute(userId)

      ctx.json({
        success: true,
        data: result,
      })
    } catch (error) {
      this.handleError(ctx, error, 'Failed to list orders')
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
