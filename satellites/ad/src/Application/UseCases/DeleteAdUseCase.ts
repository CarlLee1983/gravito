import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IAdRepository } from '../../Domain/Contracts/IAdRepository'
import { AdManagementContext } from '../../Domain/DCI/Contexts/AdManagementContext'

/**
 * DeleteAdUseCase 輸入
 */
export interface DeleteAdInput {
  adId: string
}

/**
 * DeleteAdUseCase 輸出
 */
export interface DeleteAdOutput {
  id: string
  message: string
}

/**
 * DeleteAdUseCase
 *
 * 薄殼 UseCase，委派 AdManagementContext 完成刪除邏輯。
 * 職責：
 * 1. 委派給 AdManagementContext (action: 'delete')
 * 2. 回傳刪除確認訊息
 */
export class DeleteAdUseCase extends UseCase<DeleteAdInput, DeleteAdOutput> {
  constructor(
    private readonly core: PlanetCore,
    private readonly adRepository: IAdRepository
  ) {
    super()
  }

  async execute(input: DeleteAdInput): Promise<DeleteAdOutput> {
    const context = new AdManagementContext(this.adRepository, this.core)

    const result = await context.execute({
      adId: input.adId,
      action: 'delete',
    })

    return {
      id: result.id,
      message: result.message,
    }
  }
}
