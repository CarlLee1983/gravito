import type { Coupon } from '../../Entities/Coupon'

/**
 * CouponRedeemRole
 * 負責核銷優惠券（訂單完成後增加使用次數）
 */
export interface CouponRedeemer {
  redeemCoupon(coupon: Coupon): Coupon
}

export function injectCouponRedeemer(): CouponRedeemer {
  return {
    redeemCoupon(coupon: Coupon): Coupon {
      return coupon.use()
    },
  }
}
