import type { ICouponRepository } from '../../Contracts/ICouponRepository'
import { injectCouponValidator } from '../Roles/CouponValidatorRole'

/**
 * ValidateCouponContext
 * 負責驗證優惠券有效性的流程（用於結帳時）
 */
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

export class ValidateCouponContext {
  constructor(private couponRepository: ICouponRepository) {}

  async execute(input: ValidateCouponInput): Promise<ValidateCouponOutput> {
    // 1. 根據代碼查找優惠券
    const coupon = await this.couponRepository.findByCode(input.code)

    if (!coupon) {
      return {
        valid: false,
        reason: 'coupon_not_found',
      }
    }

    // 2. 注入驗證器角色
    const validator = injectCouponValidator()

    // 3. 驗證優惠券有效性
    const validity = validator.checkValidity(coupon, input.orderAmount)

    if (!validity.valid) {
      return {
        valid: false,
        reason: validity.reason,
      }
    }

    // 4. 計算折扣金額
    const discount = coupon.calculateDiscount(input.orderAmount)
    const remainingUsage = validator.getRemainingUsage(coupon)

    return {
      valid: true,
      couponId: coupon.id,
      discount,
      remainingUsage,
    }
  }
}
