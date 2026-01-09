import { DB } from '@gravito/atlas'
import type { PlanetCore } from '@gravito/core'
import type { IPromotionRule, MarketingAdjustment } from '../../Domain/Contracts/IPromotionRule'
import { BuyXGetYRule } from '../Rules/BuyXGetYRule'
import { CartThresholdRule } from '../Rules/CartThresholdRule'
import { CategoryDiscountRule } from '../Rules/CategoryDiscountRule'
import { FreeShippingRule } from '../Rules/FreeShippingRule'
import { MembershipLevelRule } from '../Rules/MembershipLevelRule'

export class PromotionEngine {
  constructor(private core: PlanetCore) {}

  private ruleFor(type: string): IPromotionRule | null {
    switch (type) {
      case 'cart_threshold':
        return new CartThresholdRule()
      case 'buy_x_get_y':
        return new BuyXGetYRule()
      case 'category_discount':
        return new CategoryDiscountRule()
      case 'free_shipping':
        return new FreeShippingRule()
      case 'membership_level':
        return new MembershipLevelRule()
      default:
        return null
    }
  }

  async applyPromotions(order: any): Promise<MarketingAdjustment[]> {
    this.core.logger.info('[PromotionEngine] Calculating promotions...')
    const applied: MarketingAdjustment[] = []

    const promotions = (await DB.table('promotions')
      .where('is_active', true)
      .orderBy('priority', 'desc')
      .get()) as any[]

    for (const promo of promotions) {
      const rule = this.ruleFor(String(promo.type || '').toLowerCase())
      if (!rule) {
        continue
      }

      const rawConfig = promo.configuration ?? '{}'
      let config = {}
      if (typeof rawConfig === 'string') {
        try {
          config = JSON.parse(rawConfig)
        } catch {
          config = {}
        }
      } else if (rawConfig && typeof rawConfig === 'object') {
        config = rawConfig
      }

      const result = await rule.match(order, config)
      if (result) {
        applied.push(result)
      }
    }

    return applied
  }
}
