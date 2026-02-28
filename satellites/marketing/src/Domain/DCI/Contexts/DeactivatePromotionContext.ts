import type { IPromotionRepository } from '../../Contracts/IPromotionRepository'

/**
 * DeactivatePromotionContext
 * 負責停用促銷活動的流程
 */
export interface DeactivatePromotionInput {
  promotionId: string
}

export class DeactivatePromotionContext {
  constructor(private promotionRepository: IPromotionRepository) {}

  async execute(input: DeactivatePromotionInput): Promise<void> {
    // 1. 根據 ID 查找促銷活動
    const promotion = await this.promotionRepository.findById(input.promotionId)

    if (!promotion) {
      throw new Error('promotion_not_found')
    }

    // 2. 停用促銷活動（狀態改為 INACTIVE）
    const deactivated = promotion.deactivate()

    // 3. 持久化更新
    await this.promotionRepository.update(deactivated)
  }
}
