import type { GravitoContext, PlanetCore } from '@gravito/core'
import { CommerceError } from '../../../Application/Errors/CommerceError'
import type { AdminListOrders } from '../../../Application/UseCases/AdminListOrders'
import type { ConfirmOrder } from '../../../Application/UseCases/ConfirmOrder'
import { OrderStatus } from '../../../Domain/Entities/Order'

/**
 * 更新訂單請求 body
 */
interface UpdateOrderBody {
  status: OrderStatus
}

export class AdminOrderController {
  constructor(private core: PlanetCore) {}

  async index(ctx: GravitoContext) {
    try {
      const useCase = this.core.container.make<AdminListOrders>('commerce.usecase.adminListOrders')
      const orders = await useCase.execute({})
      return ctx.json(orders)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Internal server error'
      return ctx.json({ message }, 500)
    }
  }

  async update(ctx: GravitoContext) {
    try {
      const orderId = ctx.req.param('id') ?? ''
      const body = (await ctx.req.json()) as UpdateOrderBody

      if (!body.status || !Object.values(OrderStatus).includes(body.status)) {
        throw CommerceError.invalidStatusTransition('unknown', body.status ?? 'undefined')
      }

      if (!orderId) {
        throw CommerceError.orderNotFound('')
      }

      // 目前支援確認訂單（PENDING → PAID）
      if (body.status === OrderStatus.PAID) {
        const useCase = this.core.container.make<ConfirmOrder>('commerce.usecase.confirmOrder')
        await useCase.execute({ orderId })
      }

      return ctx.json({ success: true, orderId, status: body.status })
    } catch (error: unknown) {
      if (error instanceof CommerceError) {
        return ctx.json({ message: error.message, code: error.code }, error.statusCode)
      }
      const message = error instanceof Error ? error.message : 'Internal server error'
      return ctx.json({ message }, 500)
    }
  }
}
