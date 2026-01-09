import { DB } from '@gravito/atlas'
import type { IPromotionRule, MarketingAdjustment } from '../../Domain/Contracts/IPromotionRule'

export class MembershipLevelRule implements IPromotionRule {
  /**
   * config: { target_level: 'gold', discount_percent: 10 }
   */
  async match(order: any, config: any): Promise<MarketingAdjustment | null> {
    if (!order.memberId) {
      return null
    }

    // 從 Membership 表中查詢該會員的等級 (跨衛星數據讀取)
    const member = (await DB.table('members').where('id', order.memberId).first()) as any

    if (member && member.level === config.target_level) {
      const discount = Number(order.subtotalAmount) * (config.discount_percent / 100)
      return {
        label: `VIP Discount: ${config.target_level.toUpperCase()} Member ${config.discount_percent}% Off`,
        amount: -discount,
        sourceType: 'promotion',
        sourceId: 'membership_level',
      }
    }

    return null
  }
}
