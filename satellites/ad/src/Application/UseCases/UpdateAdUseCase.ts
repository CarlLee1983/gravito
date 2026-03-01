import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IAdRepository } from '../../Domain/Contracts/IAdRepository'
import { AdManagementContext } from '../../Domain/DCI/Contexts/AdManagementContext'
import { AdError } from '../../Domain/Errors/AdError'
import type { AdDTO } from '../DTOs/AdDTO'
import { AdMapper } from '../DTOs/AdMapper'

/**
 * UpdateAdUseCase 輸入
 */
export interface UpdateAdInput {
  adId: string
  title?: string
  imageUrl?: string
  targetUrl?: string
  weight?: number
  startsAt?: string
  endsAt?: string
}

/**
 * UpdateAdUseCase
 *
 * 薄殼 UseCase，委派 AdManagementContext 完成更新邏輯。
 * 職責：
 * 1. 將 ISO 8601 日期字串轉為 Date
 * 2. 委派給 AdManagementContext (action: 'update')
 * 3. 將返回的 Entity 轉為 DTO
 */
export class UpdateAdUseCase extends UseCase<UpdateAdInput, AdDTO> {
  constructor(
    private readonly core: PlanetCore,
    private readonly adRepository: IAdRepository
  ) {
    super()
  }

  async execute(input: UpdateAdInput): Promise<AdDTO> {
    const context = new AdManagementContext(this.adRepository, this.core)

    const ad = await context.execute({
      adId: input.adId,
      action: 'update',
      updateData: {
        title: input.title,
        imageUrl: input.imageUrl,
        targetUrl: input.targetUrl,
        weight: input.weight,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
      },
    })

    if (!ad) {
      throw AdError.adNotFound(input.adId)
    }

    return AdMapper.toDTO(ad)
  }
}
