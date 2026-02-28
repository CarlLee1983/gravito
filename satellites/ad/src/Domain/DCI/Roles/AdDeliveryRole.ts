import type { Advertisement } from '../../Entities/Advertisement'

/**
 * 廣告投放角色
 *
 * 提供廣告過濾與加權隨機選擇的行為契約
 */
export interface AdDeliveryRole {
  /** 過濾出可投放的廣告（ACTIVE + 排程活躍） */
  filterDeliverable(ads: Advertisement[], now?: Date): Advertisement[]
  /** 以權重為基礎隨機選取一則廣告 */
  selectByWeight(candidates: Advertisement[]): Advertisement | null
}

/**
 * 注入廣告投放角色（無需綁定特定 Entity）
 */
export function injectAdDeliveryRole(): AdDeliveryRole {
  return {
    filterDeliverable(ads: Advertisement[], now?: Date): Advertisement[] {
      return ads.filter((ad) => ad.isDeliverable(now))
    },

    selectByWeight(candidates: Advertisement[]): Advertisement | null {
      if (candidates.length === 0) {
        return null
      }
      if (candidates.length === 1) {
        return candidates[0]
      }

      // 計算權重總和
      const totalWeight = candidates.reduce((sum, ad) => sum + ad.weight.value, 0)

      // 產生隨機數 [0, totalWeight)
      const random = Math.random() * totalWeight

      // 累積權重選取
      let cumulative = 0
      for (const ad of candidates) {
        cumulative += ad.weight.value
        if (random < cumulative) {
          return ad
        }
      }

      // 浮點誤差保護，回傳最後一個
      return candidates[candidates.length - 1]
    },
  }
}
