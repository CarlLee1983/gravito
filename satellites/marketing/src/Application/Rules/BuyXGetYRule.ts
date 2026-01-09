import type { IPromotionRule, MarketingAdjustment } from '../../Domain/Contracts/IPromotionRule'

export class BuyXGetYRule implements IPromotionRule {
  /**
   * config: { target_sku: 'IPHONE', x: 2, y: 1 }
   * 意即：買 2 個 IPHONE 送 1 個 (折抵 1 個的價格)
   */
  match(order: any, config: any): MarketingAdjustment | null {
    if (!order.items || !Array.isArray(order.items)) {
      return null
    }

    // 尋找目標商品
    const targetItems = order.items.filter((item: any) => item.props.sku === config.target_sku)

    if (targetItems.length === 0) {
      return null
    }

    // 累計總數量與單價快照
    const totalQty = targetItems.reduce((sum: number, item: any) => sum + item.props.quantity, 0)
    const unitPrice = targetItems[0].props.unitPrice

    // 計算符合幾組 (Buy X Get Y)
    // 這裡我們實作最經典的：買 X 個，其中 Y 個免費
    const sets = Math.floor(totalQty / config.x)
    const freeQuantity = sets * config.y

    if (freeQuantity > 0) {
      return {
        label: `Promotion: Buy ${config.x} Get ${config.y} Free (${config.target_sku})`,
        amount: -(unitPrice * freeQuantity),
        sourceType: 'promotion',
        sourceId: 'buy_x_get_y',
      }
    }

    return null
  }
}
