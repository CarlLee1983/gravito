import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IAdRepository } from '../../Domain/Contracts/IAdRepository'
import type { AdDeliveryResult } from '../../Domain/DCI/Contexts/AdDeliveryContext'
import { AdDeliveryContext } from '../../Domain/DCI/Contexts/AdDeliveryContext'

/**
 * DeliverAdUseCase 輸入
 */
export interface DeliverAdInput {
  slotSlug: string
  count?: number
}

/**
 * DeliverAdUseCase
 *
 * 薄殼 UseCase，委派 AdDeliveryContext 完成廣告投放。
 * 職責：
 * 1. 委派給 AdDeliveryContext
 * 2. 直接回傳 AdDeliveryResult（已含投放資訊）
 */
export class DeliverAdUseCase extends UseCase<DeliverAdInput, AdDeliveryResult> {
  constructor(
    private readonly core: PlanetCore,
    private readonly adRepository: IAdRepository
  ) {
    super()
  }

  async execute(input: DeliverAdInput): Promise<AdDeliveryResult> {
    const context = new AdDeliveryContext(this.adRepository, this.core)

    return context.execute({
      slotSlug: input.slotSlug,
      count: input.count,
    })
  }
}
