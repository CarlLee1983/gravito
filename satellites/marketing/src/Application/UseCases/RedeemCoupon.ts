import { UseCase } from '@gravito/enterprise'
import type { ICouponRepository } from '../../Domain/Contracts/ICouponRepository'
import { RedeemCouponContext } from '../../Domain/DCI/Contexts/RedeemCouponContext'
import { CouponNotFoundError } from '../Errors/CouponError'

export interface RedeemCouponInput {
  couponCode: string
}

export class RedeemCoupon extends UseCase<RedeemCouponInput, void> {
  constructor(private couponRepository: ICouponRepository) {
    super()
  }

  async execute(input: RedeemCouponInput): Promise<void> {
    const context = new RedeemCouponContext(this.couponRepository)

    try {
      await context.execute(input)
    } catch (error: any) {
      if (error.message === 'coupon_not_found') {
        throw new CouponNotFoundError()
      }

      throw error
    }
  }
}
