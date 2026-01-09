import type { IPromotionRule, MarketingAdjustment } from '../../Domain/Contracts/IPromotionRule'

export class CategoryDiscountRule implements IPromotionRule {
  /**
   * config: { category_id: 'electronics', discount_percent: 20 }
   */
  match(order: any, config: any): MarketingAdjustment | null {
    if (!order.items || !Array.isArray(order.items)) {
      return null
    }

    // 遍歷所有品項，尋找屬於該分類 (或其子分類) 的商品
    // 注意：這裡假設 Order Item 中已經快照了商品的 categoryPath (由 Catalog 提供)
    const eligibleItems = order.items.filter((item: any) => {
      const path = item.props.options?.categoryPath || ''
      return path.includes(`/${config.category_id}/`)
    })

    if (eligibleItems.length === 0) {
      return null
    }

    const eligibleTotal = eligibleItems.reduce(
      (sum: number, item: any) => sum + item.props.totalPrice,
      0
    )
    const discount = eligibleTotal * (config.discount_percent / 100)

    if (discount > 0) {
      return {
        label: `Category Sale: ${config.category_id.toUpperCase()} Items ${config.discount_percent}% Off`,
        amount: -discount,
        sourceType: 'promotion',
        sourceId: 'category_discount',
      }
    }

    return null
  }
}
