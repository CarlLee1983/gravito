import { UseCase } from '@gravito/enterprise'
import type { IPromotionRepository } from '../../Domain/Contracts/IPromotionRepository'
import { type PromotionDTO, promotionsToDTO } from '../DTOs/PromotionDTO'

export interface ListPromotionsInput {
  limit?: number
  offset?: number
  activeOnly?: boolean
}

export class ListPromotions extends UseCase<ListPromotionsInput, PromotionDTO[]> {
  constructor(private promotionRepository: IPromotionRepository) {
    super()
  }

  async execute(input: ListPromotionsInput): Promise<PromotionDTO[]> {
    const limit = input.limit ?? 20
    const offset = input.offset ?? 0
    const activeOnly = input.activeOnly ?? false

    const promotions = activeOnly
      ? await this.promotionRepository.listActive(limit, offset)
      : await this.promotionRepository.listAll(limit, offset)

    return promotionsToDTO(promotions)
  }
}
