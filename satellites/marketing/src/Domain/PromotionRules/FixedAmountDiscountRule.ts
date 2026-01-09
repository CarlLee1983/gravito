import type { IPromotionRule, MarketingAdjustment } from '../Contracts/IPromotionRule'

export class FixedAmountDiscountRule implements IPromotionRule {
  name = 'fixed_discount'
  match(_order: any, _config: any): MarketingAdjustment | null {
    return null
  }
}
