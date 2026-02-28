import type { GravitoContext, PlanetCore } from '@gravito/core'
import type { PlaceOrder } from '../../../Application/UseCases/PlaceOrder'

/**
 * Checkout 請求 body 結構
 */
interface CheckoutBody {
  idempotencyKey?: string
  items: {
    productId: string
    variantId: string
    sku: string
    name: string
    unitPrice: number
    quantity: number
    options?: Record<string, string>
  }[]
  currency?: string
}

/**
 * Auth 物件結構（由 Membership Satellite 注入）
 */
interface AuthVariable {
  user?: () => { id: string } | null | undefined
}

export class CheckoutController {
  /**
   * 結帳下單接口
   * POST /api/commerce/checkout
   */
  async store(c: GravitoContext) {
    const core = c.get('core') as PlanetCore
    const placeOrder = core.container.make<PlaceOrder>('commerce.usecase.placeOrder')

    // 獲取下單數據
    const body = (await c.req.json()) as CheckoutBody

    // 獲取冪等 Key
    const idempotencyKey = c.req.header('X-Idempotency-Key') || body.idempotencyKey

    // 獲取會員 ID (相容 Membership 插件)
    const auth = c.get('auth' as keyof typeof c) as AuthVariable | undefined
    const memberId = auth?.user ? (auth.user()?.id ?? null) : null

    try {
      const result = await placeOrder.execute({
        userId: memberId,
        idempotencyKey,
        items: body.items,
        currency: body.currency,
      })

      return c.json(
        {
          success: true,
          message: 'Order placed successfully',
          data: result,
        },
        201
      )
    } catch (error: unknown) {
      // 處理併發衝突或庫存不足
      const message = error instanceof Error ? error.message : 'Unknown error'
      const status = message.includes('Concurrency') ? 409 : 400
      return c.json(
        {
          success: false,
          error: message,
        },
        status
      )
    }
  }
}
