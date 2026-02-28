import { UseCase } from '@gravito/enterprise'
import type { IPromotionRepository } from '../../Domain/Contracts/IPromotionRepository'
import { CreatePromotionContext } from '../../Domain/DCI/Contexts/CreatePromotionContext'
import type { PromotionTypeValue } from '../../Domain/ValueObjects'
import { type PromotionDTO, promotionToDTO } from '../DTOs/PromotionDTO'
import {
  PromotionInvalidConfigError,
  PromotionInvalidDateRangeError,
} from '../Errors/PromotionError'

export interface CreatePromotionInput {
  name: string
  type: PromotionTypeValue
  configuration: Record<string, any>
  startsAt: Date
  expiresAt: Date
  priority?: number
  description?: string
}

export class CreatePromotion extends UseCase<CreatePromotionInput, PromotionDTO> {
  constructor(private promotionRepository: IPromotionRepository) {
    super()
  }

  async execute(input: CreatePromotionInput): Promise<PromotionDTO> {
    const context = new CreatePromotionContext(this.promotionRepository)

    try {
      const promotion = await context.execute(input)
      return promotionToDTO(promotion)
    } catch (error: any) {
      if (error.message === 'promotion_invalid_date_range') {
        throw new PromotionInvalidDateRangeError()
      }

      if (error.message === 'promotion_configuration_required') {
        throw new PromotionInvalidConfigError('配置不可為空')
      }

      throw error
    }
  }
}
