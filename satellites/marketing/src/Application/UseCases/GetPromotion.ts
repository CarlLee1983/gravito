import { UseCase } from '@gravito/enterprise'
import type { IPromotionRepository } from '../../Domain/Contracts/IPromotionRepository'
import { type PromotionDTO, promotionToDTO } from '../DTOs/PromotionDTO'
import { PromotionNotFoundError } from '../Errors/PromotionError'

export class GetPromotion extends UseCase<string, PromotionDTO> {
  constructor(private promotionRepository: IPromotionRepository) {
    super()
  }

  async execute(promotionId: string): Promise<PromotionDTO> {
    const promotion = await this.promotionRepository.findById(promotionId)

    if (!promotion) {
      throw new PromotionNotFoundError()
    }

    return promotionToDTO(promotion)
  }
}
