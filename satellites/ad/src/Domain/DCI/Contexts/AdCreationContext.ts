import type { PlanetCore } from '@gravito/core'
import type { IAdRepository } from '../../Contracts/IAdRepository'
import { Advertisement } from '../../Entities/Advertisement'
import { AdSchedule } from '../../ValueObjects/AdSchedule'
import { AdWeight } from '../../ValueObjects/AdWeight'
import { SlotSlug } from '../../ValueObjects/SlotSlug'
import { injectAdManagerRole } from '../Roles/AdManagerRole'

/**
 * 廣告建立輸入
 */
export interface AdCreationInput {
  slotSlug: string
  title: string
  imageUrl: string
  targetUrl: string
  weight: number
  startsAt: Date
  endsAt: Date
  activateImmediately?: boolean
  metadata?: Record<string, unknown>
}

/**
 * 廣告建立輸出
 */
export interface AdCreationOutput {
  id: string
  status: string
  title: string
  createdAt: string
}

/**
 * 廣告建立上下文協調器
 *
 * 統整廣告建立的完整流程，使用 DCI 角色注入。
 * 步驟：
 * 1. 驗證並建立 ValueObject
 * 2. 建立 Advertisement 聚合根
 * 3. 如需立即啟用，注入 AdManagerRole 執行
 * 4. 持久化到 Repository
 * 5. 觸發 Hook
 */
export class AdCreationContext {
  constructor(
    private readonly adRepository: IAdRepository,
    private readonly core: PlanetCore
  ) {}

  async execute(input: AdCreationInput): Promise<AdCreationOutput> {
    // 1. 建立 ValueObject（會自動驗證）
    const slotSlug = SlotSlug.of(input.slotSlug)
    const weight = AdWeight.of(input.weight)
    const schedule = AdSchedule.of(input.startsAt, input.endsAt)

    // 2. 建立聚合根
    const id = crypto.randomUUID()
    const ad = Advertisement.create(
      id,
      slotSlug,
      input.title,
      input.imageUrl,
      input.targetUrl,
      weight,
      schedule
    )

    // 3. 立即啟用（可選）
    if (input.activateImmediately) {
      const manager = injectAdManagerRole(ad)
      manager.activate()
    }

    // 4. 持久化
    await this.adRepository.save(ad)

    // 5. 觸發 Hook
    await this.core.hooks.doAction('ad:created', {
      adId: ad.id,
      title: ad.title,
      slotSlug: ad.slotSlug.value,
    })

    if (input.activateImmediately) {
      await this.core.hooks.doAction('ad:activated', {
        adId: ad.id,
      })
    }

    return {
      id: ad.id,
      status: ad.status,
      title: ad.title,
      createdAt: ad.createdAt.toISOString(),
    }
  }
}
