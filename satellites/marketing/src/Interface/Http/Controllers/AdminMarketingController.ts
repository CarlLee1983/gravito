import type { PlanetCore } from '@gravito/core'
import { couponsToDTO } from '../../../Application/DTOs'
import type { AdminListCoupons } from '../../../Application/UseCases/AdminListCoupons'

export class AdminMarketingController {
  constructor(private core: PlanetCore) {}

  async coupons(ctx: any) {
    try {
      const useCase = this.core.container.make<AdminListCoupons>(
        'marketing.usecase.admin-list-coupons'
      )
      const coupons = await useCase.execute()
      return ctx.json(couponsToDTO(coupons))
    } catch (error: any) {
      return ctx.json({ message: error.message }, 500)
    }
  }
}
