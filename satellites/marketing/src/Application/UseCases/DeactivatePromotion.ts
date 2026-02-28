import { UseCase } from '@gravito/enterprise'
import type { IPromotionRepository } from '../../Domain/Contracts/IPromotionRepository'
import { DeactivatePromotionContext } from '../../Domain/DCI/Contexts/DeactivatePromotionContext'
import { PromotionNotFoundError } from '../Errors/PromotionError'

export class DeactivatePromotion extends UseCase<string, void> {
  constructor(private promotionRepository: IPromotionRepository) {
    super()
  }

  async execute(promotionId: string): Promise<void> {
    const context = new DeactivatePromotionContext(this.promotionRepository)

    try {
      await context.execute({ promotionId })
    } catch (error: any) {
      if (error.message === 'promotion_not_found') {
        throw new PromotionNotFoundError()
      }

      throw error
    }
  }
}
