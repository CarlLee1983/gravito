import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IAdRepository } from '../../Domain/Contracts/IAdRepository'
import { AdManagementContext } from '../../Domain/DCI/Contexts/AdManagementContext'
import { AdError } from '../../Domain/Errors/AdError'
import type { AdDTO } from '../DTOs/AdDTO'
import { AdMapper } from '../DTOs/AdMapper'

/**
 * ToggleAdStatusUseCase 輸入
 */
export interface ToggleAdStatusInput {
  adId: string
  action: 'activate' | 'pause'
}

/**
 * ToggleAdStatusUseCase
 *
 * 薄殼 UseCase，委派 AdManagementContext 完成狀態切換。
 * 職責：
 * 1. 委派給 AdManagementContext (action: 'activate' | 'pause')
 * 2. 將返回的 Entity 轉為 DTO
 */
export class ToggleAdStatusUseCase extends UseCase<ToggleAdStatusInput, AdDTO> {
  constructor(
    private readonly core: PlanetCore,
    private readonly adRepository: IAdRepository
  ) {
    super()
  }

  async execute(input: ToggleAdStatusInput): Promise<AdDTO> {
    const context = new AdManagementContext(this.adRepository, this.core)

    const ad = await context.execute({
      adId: input.adId,
      action: input.action,
    })

    if (!ad) {
      throw AdError.adNotFound(input.adId)
    }

    return AdMapper.toDTO(ad)
  }
}
