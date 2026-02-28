import type { PlanetCore } from '@gravito/core'
import { z } from 'zod'
import type {
  CreatePromotion,
  DeactivatePromotion,
  GetPromotion,
  ListPromotions,
} from '../../../Application/UseCases'

const createPromotionSchema = z.object({
  name: z.string().min(1, '名稱不可為空'),
  type: z.enum([
    'CART_THRESHOLD',
    'BUY_X_GET_Y',
    'CATEGORY_DISCOUNT',
    'FREE_SHIPPING',
    'MEMBERSHIP_LEVEL',
  ]),
  configuration: z.record(z.any()),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  priority: z.number().int().min(1).max(100).optional(),
  description: z.string().optional(),
})

const listPromotionsSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
  activeOnly: z.boolean().optional(),
})

export class PromotionController {
  constructor(private core: PlanetCore) {}

  async create(ctx: any) {
    try {
      const body = createPromotionSchema.parse(ctx.req.valid('json'))
      const useCase = this.core.container.make<CreatePromotion>(
        'marketing.usecase.create-promotion'
      )
      const result = await useCase.execute(body)
      return ctx.json(result, 201)
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return ctx.json({ message: '驗證失敗', errors: error.errors }, 400)
      }

      return ctx.json({ message: error.message }, 500)
    }
  }

  async deactivate(ctx: any) {
    try {
      const promotionId = ctx.req.param('id')
      const useCase = this.core.container.make<DeactivatePromotion>(
        'marketing.usecase.deactivate-promotion'
      )
      await useCase.execute(promotionId)
      return ctx.json({ success: true }, 200)
    } catch (error: any) {
      return ctx.json({ message: error.message }, error.code === 'PROMOTION_NOT_FOUND' ? 404 : 500)
    }
  }

  async get(ctx: any) {
    try {
      const promotionId = ctx.req.param('id')
      const useCase = this.core.container.make<GetPromotion>('marketing.usecase.get-promotion')
      const result = await useCase.execute(promotionId)
      return ctx.json(result)
    } catch (error: any) {
      return ctx.json({ message: error.message }, error.code === 'PROMOTION_NOT_FOUND' ? 404 : 500)
    }
  }

  async list(ctx: any) {
    try {
      const query = listPromotionsSchema.parse({
        limit: ctx.req.query('limit') ? Number(ctx.req.query('limit')) : undefined,
        offset: ctx.req.query('offset') ? Number(ctx.req.query('offset')) : undefined,
        activeOnly: ctx.req.query('activeOnly') === 'true',
      })
      const useCase = this.core.container.make<ListPromotions>('marketing.usecase.list-promotions')
      const result = await useCase.execute(query)
      return ctx.json(result)
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return ctx.json({ message: '驗證失敗' }, 400)
      }

      return ctx.json({ message: error.message }, 500)
    }
  }
}
