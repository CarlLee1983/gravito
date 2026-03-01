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
      const updateInput: Parameters<typeof ad.updateDetails>[0] = {}

      if (input.title !== undefined) {
        updateInput.title = input.title
      }
      if (input.imageUrl !== undefined) {
        updateInput.imageUrl = input.imageUrl
      }
      if (input.targetUrl !== undefined) {
        updateInput.targetUrl = input.targetUrl
      }
      if (input.weight !== undefined) {
        updateInput.weight = AdWeight.of(input.weight)
      }

      if (input.startsAt !== undefined || input.endsAt !== undefined) {
        const startsAt = input.startsAt ?? ad.schedule.startsAt
        const endsAt = input.endsAt ?? ad.schedule.endsAt
        updateInput.schedule = AdSchedule.of(startsAt, endsAt)
      }

      ad.updateDetails(updateInput)
    },
  }
}
