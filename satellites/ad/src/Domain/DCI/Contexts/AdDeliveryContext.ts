import type { PlanetCore } from '@gravito/core'
import type { IAdRepository } from '../../Contracts/IAdRepository'
import { AdError } from '../../Errors/AdError'
import { SlotSlug } from '../../ValueObjects/SlotSlug'
import { injectAdDeliveryRole } from '../Roles/AdDeliveryRole'

/** 最大請求數量 */
const MAX_COUNT = 10

/**
 * 廣告投放輸入
 */
export interface AdDeliveryInput {
  slotSlug: string
  count?: number
  now?: Date
}

/**
 * 廣告投放結果中的廣告資訊
 */
export interface DeliveredAd {
  id: string
  title: string
  imageUrl: string
  targetUrl: string
  slotSlug: string
  weight: number
}

/**
 * 廣告投放結果
 */
export interface AdDeliveryResult {
  ads: DeliveredAd[]
  totalAvailable: number
}

/**
 * 廣告投放上下文協調器
 *
 * 協調廣告投放邏輯：
 * 1. 驗證輸入（版位、數量）
 * 2. 查詢該版位所有廣告
 * 3. 注入 AdDeliveryRole 過濾可投放廣告
 * 4. 加權隨機選取指定數量（不重複）
 * 5. 觸發 Hook
 */
export class AdDeliveryContext {
  constructor(
    private readonly adRepository: IAdRepository,
    private readonly core: PlanetCore
  ) {}

  async execute(input: AdDeliveryInput): Promise<AdDeliveryResult> {
    // 1. 驗證輸入
    const slotSlug = SlotSlug.of(input.slotSlug)
    const count = input.count ?? 1

    // 驗證 count 是整數
    if (!Number.isInteger(count)) {
      throw AdError.invalidDeliveryCount(count, MAX_COUNT)
    }

    if (count <= 0 || count > MAX_COUNT) {
      throw AdError.invalidDeliveryCount(count, MAX_COUNT)
    }

    // 2. 查詢版位所有廣告
    const allAds = await this.adRepository.findBySlot(slotSlug.value)

    // 3. 過濾可投放廣告
    const delivery = injectAdDeliveryRole()
    const deliverable = delivery.filterDeliverable(allAds, input.now)
    const totalAvailable = deliverable.length

    // 4. 加權隨機選取（不重複）
    const selected: DeliveredAd[] = []
    const remaining = [...deliverable]

    const targetCount = Math.min(count, remaining.length)
    for (let i = 0; i < targetCount; i++) {
      const picked = delivery.selectByWeight(remaining)
      if (!picked) break

      selected.push({
        id: picked.id,
        title: picked.title,
        imageUrl: picked.imageUrl,
        targetUrl: picked.targetUrl,
        slotSlug: picked.slotSlug.value,
        weight: picked.weight.value,
      })

      // 從候選中移除已選的
      const idx = remaining.findIndex((a) => a.id === picked.id)
      if (idx !== -1) {
        remaining.splice(idx, 1)
      }
    }

    // 5. 觸發 Hook
    await this.core.hooks.doAction('ad:delivered', {
      slotSlug: slotSlug.value,
      count: selected.length,
      totalAvailable,
    })

    return {
      ads: selected,
      totalAvailable,
    }
  }
}
