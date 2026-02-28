import type { IPromotionRepository } from '../../Contracts/IPromotionRepository'
import type { MarketingAdjustment } from '../Roles/PromotionApplierRole'
import { injectPromotionApplier } from '../Roles/PromotionApplierRole'

/**
 * ApplyPromotionContext
 * 負責應用促銷活動到訂單的流程
 */
export interface ApplyPromotionInput {
  order: any
}

export class ApplyPromotionContext {
  constructor(private promotionRepository: IPromotionRepository) {}

  async execute(input: ApplyPromotionInput): Promise<MarketingAdjustment[]> {
    // 1. 查詢所有活躍的促銷活動
    const promotions = await this.promotionRepository.listActive()

    // 2. 注入應用促銷的角色
    const applier = injectPromotionApplier()

    // 3. 應用促銷活動到訂單
    const adjustments = applier.applyPromotions(promotions, input.order)

    return adjustments
  }
}
