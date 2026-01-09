import type { GravitoContext } from '@gravito/core'
import type { PlaceOrder } from '../../../Application/UseCases/PlaceOrder'

export class CheckoutController {
  /**
   * 結帳下單接口
   * POST /api/commerce/checkout
   */
  async store(c: GravitoContext) {
    const core = c.get('core' as any) as any
    const placeOrder = core.container.make('commerce.place-order') as PlaceOrder

    // 獲取下單數據
    const body = (await c.req.json()) as any

    // 獲取冪等 Key
    const idempotencyKey = c.req.header('X-Idempotency-Key') || body.idempotencyKey

    // 獲取會員 ID (相容 Membership 插件)
    const auth = c.get('auth' as any) as any
    const memberId = auth?.user ? auth.user()?.id : null

    try {
      const result = await placeOrder.execute({
        memberId,
        idempotencyKey,
        items: body.items,
      })

      return c.json(
        {
          success: true,
          message: 'Order placed successfully',
          data: result,
        },
        201
      )
    } catch (error: any) {
      // 處理併發衝突或庫存不足
      const status = error.message.includes('Concurrency') ? 409 : 400
      return c.json(
        {
          success: false,
          error: error.message,
        },
        status
      )
    }
  }
}
