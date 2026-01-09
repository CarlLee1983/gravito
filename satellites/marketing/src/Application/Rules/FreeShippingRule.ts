import type { IPromotionRule, MarketingAdjustment } from '../../Domain/Contracts/IPromotionRule'

export class FreeShippingRule implements IPromotionRule {
  /**
   * config: { min_amount: 1000 }
   * 意即：滿 1000 元即享免運
   */
  match(order: any, config: any): MarketingAdjustment | null {
    const subtotal = Number(order.subtotalAmount)

    // 如果滿足門檻
    if (subtotal >= config.min_amount) {
      // 這裡我們需要知道當前的運費是多少。
      // 在 Gravito Commerce 中，運費被視為一個 Adjustment。
      // 我們的策略是：回傳一個與運費金額相等的負值折扣。

      // 模擬邏輯：直接查現有的調整項 (假設我們知道 standard 運費是 60)
      // 在更進階的實作中，我們可以遍歷 order.adjustments 尋找 sourceType: 'shipping'
      return {
        label: `Free Shipping (Orders over ${config.min_amount})`,
        amount: -60, // 抵銷基礎運費
        sourceType: 'promotion',
        sourceId: 'free_shipping',
      }
    }

    return null
  }
}
