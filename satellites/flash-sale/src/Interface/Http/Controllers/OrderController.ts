/**
 * 訂單控制器
 *
 * 處理訂單相關的 HTTP 請求
 */

import type { GravitoContext, PlanetCore } from '@gravito/core'
import type { IOrderRepository } from '../../../Application/Contracts/IOrderRepository'
import type { IProductRepository } from '../../../Application/Contracts/IProductRepository'
import { CreateOrder } from '../../../Application/UseCases/CreateOrder'
import { GetOrder } from '../../../Application/UseCases/GetOrder'
import { CreateOrderRequest } from '../../../Domain/Models'

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
      // 解析請求體
      const body = await ctx.req.json()
      const { userId, productId, quantity } = body

      // 建立請求對象
      const request = new CreateOrderRequest(userId, productId, quantity)

      // 取得 Repositories
      const productRepository = this.core.container.make<IProductRepository>('product.repository')
      const orderRepository = this.core.container.make<IOrderRepository>('order.repository')

      // 執行 Use Case
      const useCase = new CreateOrder(productRepository, orderRepository)
      const result = await useCase.execute(request)

      // 回應成功
      ctx.status(201)
      ctx.json({
        success: true,
        data: result.order,
        message: result.message,
      })
    } catch (error: any) {
      this.core.logger.error(`Failed to create order: ${error.message}`)

      // 根據錯誤類型回應
      if (error.message.includes('Validation failed')) {
        ctx.status(400)
        ctx.json({
          success: false,
          error: error.message,
        })
      } else if (error.message.includes('Product not found')) {
        ctx.status(404)
        ctx.json({
          success: false,
          error: 'Product not found',
        })
      } else if (error.message.includes('Insufficient stock')) {
        ctx.status(409)
        ctx.json({
          success: false,
          error: error.message,
        })
      } else {
        ctx.status(500)
        ctx.json({
          success: false,
          error: 'Failed to create order',
        })
      }
    }
  }

  /**
   * GET /api/orders/:id
   *
   * 查詢訂單詳情
   */
  async show(ctx: GravitoContext): Promise<void> {
    try {
      const { id } = ctx.req.param()

      const orderRepository = this.core.container.make<IOrderRepository>('order.repository')

      const useCase = new GetOrder(orderRepository)
      const order = await useCase.execute(id)

      if (!order) {
        ctx.status(404)
        ctx.json({
          success: false,
          error: 'Order not found',
        })
        return
      }

      ctx.json({
        success: true,
        data: order,
      })
    } catch (error) {
      this.core.logger.error(`Failed to get order: ${String(error)}`)
      ctx.status(500)
      ctx.json({
        success: false,
        error: 'Failed to get order',
      })
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
      const page = parseInt(ctx.req.query('page') || '1', 10)
      const limit = parseInt(ctx.req.query('limit') || '10', 10)

      if (!userId) {
        ctx.status(400)
        ctx.json({
          success: false,
          error: 'userId query parameter is required',
        })
        return
      }

      const orderRepository = this.core.container.make<IOrderRepository>('order.repository')

      const result = await orderRepository.findByUserId(userId, {
        page,
        limit,
      })

      ctx.json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      })
    } catch (error) {
      this.core.logger.error(`Failed to list orders: ${String(error)}`)
      ctx.status(500)
      ctx.json({
        success: false,
        error: 'Failed to list orders',
      })
    }
  }
}
