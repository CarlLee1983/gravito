import { UseCase } from '@gravito/enterprise'
import type { ICouponRepository } from '../../Domain/Contracts/ICouponRepository'
import { IssueCouponContext } from '../../Domain/DCI/Contexts/IssueCouponContext'
import type { DiscountType } from '../../Domain/ValueObjects'
import { type CouponDTO, couponToDTO } from '../DTOs/CouponDTO'
import { CouponCodeAlreadyExistsError } from '../Errors/CouponError'

export interface IssueCouponInput {
  name: string
  code: string
  discountType: DiscountType
  discountAmount: number
  minPurchase: number
  startsAt: Date
  expiresAt: Date
  usageLimit?: number
}

export class IssueCoupon extends UseCase<IssueCouponInput, CouponDTO> {
  constructor(private couponRepository: ICouponRepository) {
    super()
  }

  async execute(input: IssueCouponInput): Promise<CouponDTO> {
    const context = new IssueCouponContext(this.couponRepository)

    try {
      const coupon = await context.execute(input)
      return couponToDTO(coupon)
    } catch (error: any) {
      if (error.message === 'coupon_code_already_exists') {
        throw new CouponCodeAlreadyExistsError(input.code)
      }

      throw error
    }
  }
}
