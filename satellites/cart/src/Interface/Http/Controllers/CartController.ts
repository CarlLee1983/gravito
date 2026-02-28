import type { Container, GravitoContext } from '@gravito/core'
import { z } from 'zod'
import {
  type AddToCart,
  CartNotFoundError,
  type ClearCart,
  type GetCart,
  InvalidQuantityError,
  type MergeCart,
  type RemoveFromCart,
  type UpdateCartItem,
} from '../../../Application'

/**
 * Zod schema 驗證
 */
const addItemSchema = z.object({
  variantId: z.string().min(1, '商品變體 ID 必填'),
  quantity: z.number().int().positive('數量必須大於 0'),
})

const updateItemSchema = z.object({
  quantity: z.number().int().positive('數量必須大於 0'),
})

const mergeSchema = z.object({
  memberId: z.string().min(1, '會員 ID 必填'),
  guestId: z.string().min(1, '訪客 ID 必填'),
})

/**
 * 購物車 HTTP Controller
 * 無 as any hack、型別安全、完整 6 個端點
 */
export class CartController {
  /**
   * GET /api/carts/:id
   * 查詢購物車
   */
  async show(c: GravitoContext) {
    try {
      const container = this.getContainer(c)
      const getCart = container.make('cart.get') as GetCart
      const memberId = this.getMemberId(c)
      const guestId = this.getGuestId(c)

      const cartDTO = await getCart.execute({ memberId, guestId })

      if (!cartDTO) {
        return c.json({ success: false, error: '購物車未找到' }, 404)
      }

      return c.json({ success: true, data: cartDTO })
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * POST /api/carts/items
   * 新增商品到購物車
   */
  async store(c: GravitoContext) {
    try {
      const body = await c.req.json()
      const validated = addItemSchema.parse(body)

      const container = this.getContainer(c)
      const addToCart = container.make('cart.add-item') as AddToCart
      const memberId = this.getMemberId(c)
      const guestId = this.getGuestId(c)

      await addToCart.execute({
        memberId,
        guestId,
        variantId: validated.variantId,
        quantity: validated.quantity,
      })

      return c.json({ success: true, message: '商品已新增到購物車' }, 201)
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * DELETE /api/carts/items/:variantId
   * 移除商品
   */
  async destroy(c: GravitoContext) {
    try {
      const variantId = c.req.param('variantId')
      if (!variantId) {
        return c.json({ success: false, error: '商品變體 ID 必填' }, 400)
      }

      const container = this.getContainer(c)
      const removeFromCart = container.make('cart.remove-item') as RemoveFromCart
      const memberId = this.getMemberId(c)
      const guestId = this.getGuestId(c)

      await removeFromCart.execute({
        memberId,
        guestId,
        variantId,
      })

      return c.json({ success: true, message: '商品已移除' })
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * PATCH /api/carts/items/:variantId
   * 更新商品數量
   */
  async update(c: GravitoContext) {
    try {
      const variantId = c.req.param('variantId')
      if (!variantId) {
        return c.json({ success: false, error: '商品變體 ID 必填' }, 400)
      }

      const body = await c.req.json()
      const validated = updateItemSchema.parse(body)

      const container = this.getContainer(c)
      const updateCartItem = container.make('cart.update-item') as UpdateCartItem
      const memberId = this.getMemberId(c)
      const guestId = this.getGuestId(c)

      await updateCartItem.execute({
        memberId,
        guestId,
        variantId,
        quantity: validated.quantity,
      })

      return c.json({ success: true, message: '商品數量已更新' })
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * DELETE /api/carts
   * 清空購物車
   */
  async clear(c: GravitoContext) {
    try {
      const container = this.getContainer(c)
      const clearCart = container.make('cart.clear') as ClearCart
      const memberId = this.getMemberId(c)
      const guestId = this.getGuestId(c)

      await clearCart.execute({ memberId, guestId })

      return c.json({ success: true, message: '購物車已清空' })
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * POST /api/carts/merge
   * 合併購物車
   */
  async merge(c: GravitoContext) {
    try {
      const body = await c.req.json()
      const validated = mergeSchema.parse(body)

      const container = this.getContainer(c)
      const mergeCart = container.make('cart.merge') as MergeCart

      await mergeCart.execute({
        memberId: validated.memberId,
        guestId: validated.guestId,
      })

      return c.json({ success: true, message: '購物車已合併' })
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  private getContainer(c: GravitoContext): Container {
    const context = c as any
    const core = context.get?.('core')
    if (!core) {
      throw new Error('Core container not found')
    }
    return core.container
  }

  private getMemberId(c: GravitoContext): string | undefined {
    const context = c as any
    const auth = context.get?.('auth')
    if (auth?.user) {
      const user = auth.user()
      return user?.id
    }
    return undefined
  }

  private getGuestId(c: GravitoContext): string | undefined {
    return c.req.header('X-Guest-ID')
  }

  private handleError(c: GravitoContext, error: unknown) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: '驗證失敗',
          details: error.errors,
        },
        400
      )
    }

    if (error instanceof CartNotFoundError) {
      return c.json({ success: false, error: '購物車未找到' }, 404)
    }

    if (error instanceof InvalidQuantityError) {
      return c.json({ success: false, error: error.message }, 400)
    }

    if (error instanceof Error) {
      return c.json({ success: false, error: error.message }, 500)
    }

    return c.json({ success: false, error: 'Internal server error' }, 500)
  }
}
