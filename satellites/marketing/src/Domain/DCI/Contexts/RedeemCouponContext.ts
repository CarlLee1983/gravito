import type { ICouponRepository } from '../../Contracts/ICouponRepository'
import { injectCouponRedeemer } from '../Roles/CouponRedeemRole'

/**
 * RedeemCouponContext
 * 負責核銷優惠券的流程（訂單完成後觸發）
 */
export interface RedeemCouponInput {
  couponCode: string
}

export class RedeemCouponContext {
  constructor(private couponRepository: ICouponRepository) {}

  async execute(input: RedeemCouponInput): Promise<void> {
    // 1. 根據代碼查找優惠券
    const coupon = await this.couponRepository.findByCode(input.couponCode)

    if (!coupon) {
      throw new Error('coupon_not_found')
    }

    // 2. 注入核銷者角色
    const redeemer = injectCouponRedeemer()

    // 3. 執行核銷（增加使用次數）
    const redeemedCoupon = redeemer.redeemCoupon(coupon)

    // 4. 檢查是否已過期（自動標記為過期）
    let finalCoupon = redeemedCoupon
    if (finalCoupon.isExpired()) {
      finalCoupon = finalCoupon.markAsExpired()
    }

    // 5. 持久化更新到數據庫
    await this.couponRepository.update(finalCoupon)
  }
}
