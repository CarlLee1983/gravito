import type { PlanetCore } from '@gravito/core'
import type { AdminListOrders } from '../../../Application/UseCases/AdminListOrders'

export class AdminOrderController {
  constructor(private core: PlanetCore) {}

  async index(ctx: any) {
    try {
      const useCase = this.core.container.make<AdminListOrders>('commerce.usecase.adminListOrders')
      const orders = await useCase.execute()
      return ctx.json(orders)
    } catch (error: any) {
      return ctx.json({ message: error.message }, 500)
    }
  }

  async update(ctx: any) {
    // 變更訂單狀態邏輯
    return ctx.json({ success: true })
  }
}
