import type { ICouponRepository } from '../../Contracts/ICouponRepository'
import type { Coupon } from '../../Entities/Coupon'
import type { DiscountType } from '../../ValueObjects'
import { injectCouponIssuer } from '../Roles/CouponIssuerRole'

/**
 * IssueCouponContext
 * 負責發行新優惠券的完整流程
 */
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

export class IssueCouponContext {
  constructor(private couponRepository: ICouponRepository) {}

  async execute(input: IssueCouponInput): Promise<Coupon> {
    // 1. 驗證代碼唯一性
    const existingCoupon = await this.couponRepository.findByCode(input.code)
    if (existingCoupon) {
      throw new Error('coupon_code_already_exists')
    }

    // 2. 注入 CouponIssuer 角色
    const issuer = injectCouponIssuer()

    // 3. 使用 issuer 建立新優惠券
    const coupon = issuer.issueCoupon(
      input.name,
      input.code,
      input.discountType,
      input.discountAmount,
      input.minPurchase,
      input.startsAt,
      input.expiresAt,
      input.usageLimit
    )

    // 4. 持久化到數據庫
    const saved = await this.couponRepository.create(coupon)

    return saved
  }
}
