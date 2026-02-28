import { UseCase } from '@gravito/enterprise'
import type { ICouponRepository } from '../../Domain/Contracts/ICouponRepository'
import { ValidateCouponContext } from '../../Domain/DCI/Contexts/ValidateCouponContext'
import { CouponNotFoundError } from '../Errors/CouponError'

export interface ValidateCouponInput {
  code: string
  orderAmount: number
}

export interface ValidateCouponOutput {
  valid: boolean
  reason?: string
  couponId?: string
  discount?: number
  remainingUsage?: number | null
}

export class ValidateCoupon extends UseCase<ValidateCouponInput, ValidateCouponOutput> {
  constructor(private couponRepository: ICouponRepository) {
    super()
  }

  async execute(input: ValidateCouponInput): Promise<ValidateCouponOutput> {
    const context = new ValidateCouponContext(this.couponRepository)

    try {
      return await context.execute(input)
    } catch (error: any) {
      if (error.message === 'coupon_not_found') {
        throw new CouponNotFoundError()
      }

      throw error
    }
  }
}
