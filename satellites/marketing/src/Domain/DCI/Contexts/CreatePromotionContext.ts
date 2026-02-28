import type { IPromotionRepository } from '../../Contracts/IPromotionRepository'
import { Promotion } from '../../Entities/Promotion'
import type { PromotionTypeValue } from '../../ValueObjects'

/**
 * CreatePromotionContext
 * 負責建立新促銷活動的流程
 */
export interface CreatePromotionInput {
  name: string
  type: PromotionTypeValue
  configuration: Record<string, any>
  startsAt: Date
  expiresAt: Date
  priority?: number
  description?: string
}

export class CreatePromotionContext {
  constructor(private promotionRepository: IPromotionRepository) {}

  async execute(input: CreatePromotionInput): Promise<Promotion> {
    // 1. 驗證時間範圍
    if (input.startsAt >= input.expiresAt) {
      throw new Error('promotion_invalid_date_range')
    }

    // 2. 驗證配置不為空
    if (!input.configuration || Object.keys(input.configuration).length === 0) {
      throw new Error('promotion_configuration_required')
    }

    // 3. 建立新促銷活動實體
    const promotion = Promotion.create(
      input.name,
      input.type,
      input.configuration,
      input.startsAt,
      input.expiresAt,
      input.priority,
      input.description
    )

    // 4. 持久化到數據庫
    const saved = await this.promotionRepository.create(promotion)

    return saved
  }
}
