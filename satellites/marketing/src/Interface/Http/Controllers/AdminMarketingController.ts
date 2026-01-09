import type { PlanetCore } from '@gravito/core'
import type { AdminListCoupons } from '../../../Application/UseCases/AdminListCoupons'
import type { Coupon } from '../../../Domain/Entities/Coupon'

export class AdminMarketingController {
  constructor(private core: PlanetCore) {}

  async coupons(ctx: any) {
    try {
      const useCase = this.core.container.make<AdminListCoupons>(
        'marketing.usecase.adminListCoupons'
      )
      const coupons = await useCase.execute()
      return ctx.json(
        coupons.map((c: Coupon) => ({
          id: c.id,
          ...c.unpack(),
        }))
      )
    } catch (error: any) {
      return ctx.json({ message: error.message }, 500)
    }
  }
}
