import { Coupon } from '../../Entities/Coupon'
import type { DiscountType } from '../../ValueObjects'

/**
 * CouponIssuerRole
 * 負責發行與建立新優惠券
 */
export interface CouponIssuer {
  issueCoupon(
    name: string,
    code: string,
    discountType: DiscountType,
    discountAmount: number,
    minPurchase: number,
    startsAt: Date,
    expiresAt: Date,
    usageLimit?: number
  ): Coupon
}

export function injectCouponIssuer(): CouponIssuer {
  return {
    issueCoupon(
      name: string,
      code: string,
      discountType: DiscountType,
      discountAmount: number,
      minPurchase: number,
      startsAt: Date,
      expiresAt: Date,
      usageLimit?: number
    ): Coupon {
      return Coupon.create(
        name,
        code,
        discountType,
        discountAmount,
        minPurchase,
        startsAt,
        expiresAt,
        usageLimit
      )
    },
  }
}
