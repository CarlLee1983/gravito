import type { PlanetCore } from '@gravito/core'
import { z } from 'zod'
import type {
  GetCoupon,
  IssueCoupon,
  ListCoupons,
  RedeemCoupon,
  ValidateCoupon,
} from '../../../Application/UseCases'

const issueCouponSchema = z.object({
  name: z.string().min(1, '名稱不可為空'),
  code: z.string().min(6, '代碼至少 6 字元').max(20, '代碼最多 20 字元'),
  discountType: z.enum(['FIXED', 'PERCENTAGE']),
  discountAmount: z.number().positive('折扣金額必須大於 0'),
  minPurchase: z.number().nonnegative('最低消費金額不可為負'),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  usageLimit: z.number().positive().optional(),
})

const validateCouponSchema = z.object({
  code: z.string().min(1),
  orderAmount: z.number().nonnegative(),
})

const redeemCouponSchema = z.object({
  couponCode: z.string().min(1),
})

const listCouponsSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
  activeOnly: z.boolean().optional(),
})

export class CouponController {
  constructor(private core: PlanetCore) {}

  async issue(ctx: any) {
    try {
      const body = issueCouponSchema.parse(ctx.req.valid('json'))
      const useCase = this.core.container.make<IssueCoupon>('marketing.usecase.issue-coupon')
      const result = await useCase.execute(body)
      return ctx.json(result, 201)
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return ctx.json({ message: '驗證失敗', errors: error.errors }, 400)
      }

      return ctx.json(
        { message: error.message },
        error.code === 'COUPON_CODE_ALREADY_EXISTS' ? 409 : 500
      )
    }
  }

  async validate(ctx: any) {
    try {
      const body = validateCouponSchema.parse({
        code: ctx.req.param('code'),
        orderAmount: Number(ctx.req.query('orderAmount') || 0),
      })
      const useCase = this.core.container.make<ValidateCoupon>('marketing.usecase.validate-coupon')
      const result = await useCase.execute(body)
      return ctx.json(result)
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return ctx.json({ message: '驗證失敗', errors: error.errors }, 400)
      }

      return ctx.json({ message: error.message }, error.code === 'COUPON_NOT_FOUND' ? 404 : 500)
    }
  }

  async redeem(ctx: any) {
    try {
      const body = redeemCouponSchema.parse({
        couponCode: ctx.req.param('code'),
      })
      const useCase = this.core.container.make<RedeemCoupon>('marketing.usecase.redeem-coupon')
      await useCase.execute(body)
      return ctx.json({ success: true }, 200)
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return ctx.json({ message: '驗證失敗' }, 400)
      }

      return ctx.json({ message: error.message }, error.code === 'COUPON_NOT_FOUND' ? 404 : 500)
    }
  }

  async get(ctx: any) {
    try {
      const couponId = ctx.req.param('id')
      const useCase = this.core.container.make<GetCoupon>('marketing.usecase.get-coupon')
      const result = await useCase.execute(couponId)
      return ctx.json(result)
    } catch (error: any) {
      return ctx.json({ message: error.message }, error.code === 'COUPON_NOT_FOUND' ? 404 : 500)
    }
  }

  async list(ctx: any) {
    try {
      const query = listCouponsSchema.parse({
        limit: ctx.req.query('limit') ? Number(ctx.req.query('limit')) : undefined,
        offset: ctx.req.query('offset') ? Number(ctx.req.query('offset')) : undefined,
        activeOnly: ctx.req.query('activeOnly') === 'true',
      })
      const useCase = this.core.container.make<ListCoupons>('marketing.usecase.list-coupons')
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
