import { Coupon } from '../../Entities/Coupon'
import type { DiscountType } from '../../ValueObjects'

/**
 * CouponIssuerRole
 * 負責發行與建立新優惠券
 */
export interface CouponIssuer {
  issueCoupon(input: {
    code: string
    name: string
    type: DiscountType
    value: number
    minPurchase: number
    startsAt: Date
    expiresAt: Date
    status?: string
    usageLimit?: number
  }): Coupon
}

export function injectCouponIssuer(): CouponIssuer {
  return {
    issueCoupon(input): Coupon {
      return Coupon.create({
        code: input.code,
        name: input.name,
        type: input.type,
        value: input.value,
        minPurchase: input.minPurchase,
        startsAt: input.startsAt,
        expiresAt: input.expiresAt,
        status: input.status ?? 'ACTIVE',
        usageLimit: input.usageLimit,
      })
    },
  }
}
