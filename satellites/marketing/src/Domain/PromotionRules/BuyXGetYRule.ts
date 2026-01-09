import type { IPromotionRule, MarketingAdjustment } from '../Contracts/IPromotionRule'

export class BuyXGetYRule implements IPromotionRule {
  name = 'buy_x_get_y'
  match(_order: any, _config: any): MarketingAdjustment | null {
    return null // 預設不匹配
  }
}
