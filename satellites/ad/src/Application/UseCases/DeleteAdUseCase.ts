import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IAdRepository } from '../../Domain/Contracts/IAdRepository'
import { AdManagementContext } from '../../Domain/DCI/Contexts/AdManagementContext'
import { AdError } from '../../Domain/Errors/AdError'

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
 * 1. 驗證廣告存在
 * 2. 委派給 AdManagementContext (action: 'delete')
 * 3. 回傳刪除確認訊息
 */
export class DeleteAdUseCase extends UseCase<DeleteAdInput, DeleteAdOutput> {
  constructor(
    private readonly core: PlanetCore,
    private readonly adRepository: IAdRepository
  ) {
    super()
  }

  async execute(input: DeleteAdInput): Promise<DeleteAdOutput> {
    // 先驗證廣告存在，以取得 ID
    const ad = await this.adRepository.findById(input.adId)
    if (!ad) {
      throw AdError.adNotFound(input.adId)
    }

    const context = new AdManagementContext(this.adRepository, this.core)

    await context.execute({
      adId: input.adId,
      action: 'delete',
    })

    return {
      id: ad.id,
      message: `廣告 ${ad.id} 已刪除`,
    }
  }
}
