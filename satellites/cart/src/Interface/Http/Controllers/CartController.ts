import type { GravitoContext } from '@gravito/core'
import type { AddToCart } from '../../../Application/UseCases/AddToCart'
import type { ICartRepository } from '../../../Domain/Contracts/ICartRepository'

export class CartController {
  /**
   * 獲取當前購物車
   * GET /api/cart
   */
  async index(c: GravitoContext) {
    const core = c.get('core' as any) as any
    const repo = core.container.make('cart.repository') as ICartRepository

    // 獲取身分
    const auth = c.get('auth' as any) as any
    const memberId = auth?.user ? auth.user()?.id : null
    const guestId = c.req.header('X-Guest-ID')

    const cart = await repo.find({ memberId, guestId })

    return c.json({
      success: true,
      data: cart || { items: [] },
    })
  }

  /**
   * 加入購物車
   * POST /api/cart/items
   */
  async store(c: GravitoContext) {
    const core = c.get('core' as any) as any
    const addToCart = core.container.make('cart.add-item') as AddToCart

    const body = (await c.req.json()) as any
    const auth = c.get('auth' as any) as any
    const memberId = auth?.user ? auth.user()?.id : null
    const guestId = c.req.header('X-Guest-ID')

    await addToCart.execute({
      memberId,
      guestId,
      variantId: body.variantId,
      quantity: body.quantity || 1,
    })

    return c.json(
      {
        success: true,
        message: 'Item added to cart',
      },
      201
    )
  }
}
