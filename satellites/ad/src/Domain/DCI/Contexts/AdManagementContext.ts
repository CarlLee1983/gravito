import type { PlanetCore } from '@gravito/core'
import type { IAdRepository } from '../../Contracts/IAdRepository'
import type { Advertisement } from '../../Entities/Advertisement'
import { AdError } from '../../Errors/AdError'
import { injectAdManagerRole } from '../Roles/AdManagerRole'

/**
 * 廣告管理輸入
 */
export interface AdManagementInput {
  adId: string
  action: 'activate' | 'pause' | 'update' | 'delete'
  updateData?: {
    title?: string
    imageUrl?: string
    targetUrl?: string
    weight?: number
    startsAt?: Date
    endsAt?: Date
  }
}

/**
 * 廣告管理上下文協調器
 *
 * 協調廣告編輯、上下架、刪除等操作。
 * 步驟：
 * 1. 查詢廣告（不存在則拋出 AD_NOT_FOUND）
 * 2. 注入 AdManagerRole 執行對應操作
 * 3. 持久化（或刪除）
 * 4. 觸發 Hook
 */
export class AdManagementContext {
  constructor(
    private readonly adRepository: IAdRepository,
    private readonly core: PlanetCore
  ) {}

  async execute(input: AdManagementInput): Promise<Advertisement | null> {
    // 1. 查詢廣告
    const ad = await this.adRepository.findById(input.adId)
    if (!ad) {
      throw AdError.adNotFound(input.adId)
    }

    // 2. 根據 action 執行操作
    switch (input.action) {
      case 'activate': {
        const manager = injectAdManagerRole(ad)
        manager.activate()
        await this.adRepository.save(ad)
        await this.core.hooks.doAction('ad:activated', { adId: ad.id })
        return ad
      }

      case 'pause': {
        const manager = injectAdManagerRole(ad)
        manager.pause()
        await this.adRepository.save(ad)
        await this.core.hooks.doAction('ad:paused', { adId: ad.id })
        return ad
      }

      case 'update': {
        if (input.updateData) {
          const manager = injectAdManagerRole(ad)
          manager.updateDetails(input.updateData)
        }
        await this.adRepository.save(ad)
        await this.core.hooks.doAction('ad:updated', { adId: ad.id })
        return ad
      }

      case 'delete': {
        await this.adRepository.delete(ad.id)
        await this.core.hooks.doAction('ad:deleted', { adId: ad.id })
        return null
      }

      default: {
        const _exhaustive: never = input.action
        throw new Error(`未知的操作: ${_exhaustive}`)
      }
    }
  }
}
