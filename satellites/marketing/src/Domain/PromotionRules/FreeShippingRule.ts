import type { IPromotionRule, MarketingAdjustment } from '../Contracts/IPromotionRule'

export class FreeShippingRule implements IPromotionRule {
  name = 'free_shipping'
  match(_order: any, _config: any): MarketingAdjustment | null {
    return null
  }
}
