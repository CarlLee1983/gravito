import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IAdRepository } from '../../Domain/Contracts/IAdRepository'
import { AdCreationContext } from '../../Domain/DCI/Contexts/AdCreationContext'
import type { AdDTO } from '../DTOs/AdDTO'
import { AdMapper } from '../DTOs/AdMapper'

/**
 * CreateAdUseCase 輸入
 */
export interface CreateAdInput {
  slotSlug: string
  title: string
  imageUrl: string
  targetUrl: string
  weight: number
  startsAt: string
  endsAt: string
  activateImmediately?: boolean
  metadata?: Record<string, unknown>
}

/**
 * CreateAdUseCase
 *
 * 薄殼 UseCase，委派 AdCreationContext 完成核心邏輯。
 * 職責：
 * 1. 將 ISO 8601 字串轉為 Date
 * 2. 委派給 AdCreationContext
 * 3. 將返回的 Entity 轉為 DTO
 */
export class CreateAdUseCase extends UseCase<CreateAdInput, AdDTO> {
  constructor(
    private readonly core: PlanetCore,
    private readonly adRepository: IAdRepository
  ) {
    super()
  }

  async execute(input: CreateAdInput): Promise<AdDTO> {
    const context = new AdCreationContext(this.adRepository, this.core)

    const ad = await context.execute({
      slotSlug: input.slotSlug,
      title: input.title,
      imageUrl: input.imageUrl,
      targetUrl: input.targetUrl,
      weight: input.weight,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      activateImmediately: input.activateImmediately,
      metadata: input.metadata,
    })

    return AdMapper.toDTO(ad)
  }
}
