import type { Promotion } from '../../Entities/Promotion'

/**
 * PromotionApplierRole
 * 負責應用促銷活動到訂單
 */
export interface MarketingAdjustment {
  label: string
  amount: number
  sourceType: string
  sourceId: string
}

export interface PromotionApplier {
  applyPromotions(promotions: Promotion[], order: any): MarketingAdjustment[]
}

export function injectPromotionApplier(): PromotionApplier {
  return {
    applyPromotions(promotions: Promotion[], order: any): MarketingAdjustment[] {
      const adjustments: MarketingAdjustment[] = []
      const orderAmount = Number(order?.subtotalAmount ?? 0)

      // 按優先級降序排列
      const sorted = [...promotions].sort((a, b) => b.getPriority() - a.getPriority())

      for (const promo of sorted) {
        if (!promo.isActive()) {
          continue
        }

        // 這裡可以根據不同的 promotion type 應用不同的規則
        // 目前簡化為基於配置計算折扣
        const config = promo.getConfiguration()

        let discount = 0
        const type = promo.getType().toLowerCase()

        if (type.includes('threshold') && config.threshold) {
          if (orderAmount >= config.threshold && config.discountAmount) {
            discount = config.discountAmount
          }
        } else if (type.includes('category') && config.categoryId) {
          // 檢查訂單是否包含指定商品類別
          // 簡化實現：假設有 category items 的邏輯
          if (config.discountPercent) {
            discount = orderAmount * (config.discountPercent / 100)
          }
        } else if (type.includes('shipping')) {
          discount = config.shippingDiscount ?? 0
        }

        if (discount > 0) {
          adjustments.push({
            label: promo.getName(),
            amount: -discount,
            sourceType: 'promotion',
            sourceId: promo.id,
          })
        }
      }

      return adjustments
    },
  }
}
