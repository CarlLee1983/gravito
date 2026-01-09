import type { IPromotionRule, MarketingAdjustment } from '../Contracts/IPromotionRule'

export class PercentageDiscountRule implements IPromotionRule {
  name = 'percentage_discount'
  match(_order: any, _config: any): MarketingAdjustment | null {
    return null
  }
}
