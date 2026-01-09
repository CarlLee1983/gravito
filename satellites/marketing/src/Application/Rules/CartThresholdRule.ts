import type { IPromotionRule, MarketingAdjustment } from '../../Domain/Contracts/IPromotionRule'

export class CartThresholdRule implements IPromotionRule {
  /**
   * config: { min_amount: 2000, discount: 200 }
   */
  match(order: any, config: any): MarketingAdjustment | null {
    const subtotal = Number(order.subtotalAmount)

    if (subtotal >= config.min_amount) {
      return {
        label: `Promotion: Spend ${config.min_amount} Get ${config.discount} Off`,
        amount: -config.discount, // 負數代表折扣
        sourceType: 'promotion',
        sourceId: 'cart_threshold',
      }
    }

    return null
  }
}
