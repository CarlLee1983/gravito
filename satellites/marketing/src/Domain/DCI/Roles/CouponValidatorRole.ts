import type { Coupon } from '../../Entities/Coupon'

/**
 * CouponValidatorRole
 * 負責驗證優惠券的有效性
 */
export interface CouponValidator {
  canUse(coupon: Coupon, orderAmount: number): boolean
  checkValidity(coupon: Coupon, orderAmount: number): { valid: boolean; reason?: string }
  getRemainingUsage(coupon: Coupon): number | null
}

export function injectCouponValidator(): CouponValidator {
  return {
    canUse(coupon: Coupon, orderAmount: number): boolean {
      const { canUse } = coupon.canUse(orderAmount)
      return canUse
    },

    checkValidity(coupon: Coupon, orderAmount: number): { valid: boolean; reason?: string } {
      const result = coupon.canUse(orderAmount)
      return {
        valid: result.canUse,
        reason: result.reason,
      }
    },

    getRemainingUsage(coupon: Coupon): number | null {
      return coupon.getRemainingUsage()
    },
  }
}
