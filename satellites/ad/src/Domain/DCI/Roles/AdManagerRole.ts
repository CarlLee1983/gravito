import type { Advertisement } from '../../Entities/Advertisement'
import { AdSchedule } from '../../ValueObjects/AdSchedule'
import { AdWeight } from '../../ValueObjects/AdWeight'

/**
 * 更新廣告詳細資訊的輸入
 */
export interface UpdateAdDetailsInput {
  title?: string
  imageUrl?: string
  targetUrl?: string
  weight?: number
  startsAt?: Date
  endsAt?: Date
}

/**
 * 廣告管理者角色
 *
 * 提供廣告上下架、編輯的行為契約
 */
export interface AdManagerRole {
  /** 啟用廣告 */
  activate(): void
  /** 暫停廣告 */
  pause(): void
  /** 更新廣告詳細資訊 */
  updateDetails(input: UpdateAdDetailsInput): void
}

/**
 * 將廣告管理者角色注入到 Advertisement 實體中
 */
export function injectAdManagerRole(ad: Advertisement): AdManagerRole {
  return {
    activate(): void {
      ad.activate()
    },

    pause(): void {
      ad.pause()
    },

    updateDetails(input: UpdateAdDetailsInput): void {
      if (input.title !== undefined) {
        ad.updateTitle(input.title)
      }
      if (input.imageUrl !== undefined) {
        ad.updateImageUrl(input.imageUrl)
      }
      if (input.targetUrl !== undefined) {
        ad.updateTargetUrl(input.targetUrl)
      }
      if (input.weight !== undefined) {
        ad.updateWeight(AdWeight.of(input.weight))
      }
      if (input.startsAt !== undefined && input.endsAt !== undefined) {
        ad.updateSchedule(AdSchedule.of(input.startsAt, input.endsAt))
      } else if (input.startsAt !== undefined) {
        ad.updateSchedule(AdSchedule.of(input.startsAt, ad.schedule.endsAt))
      } else if (input.endsAt !== undefined) {
        ad.updateSchedule(AdSchedule.of(ad.schedule.startsAt, input.endsAt))
      }
    },
  }
}
