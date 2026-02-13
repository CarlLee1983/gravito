/**
 * Cart Controller
 *
 * Shopping cart operations.
 */

import type { GravitoContext } from '@gravito/core'
import type { InertiaHelper } from '@gravito/ion'
import type { SessionService } from '@gravito/pulsar'
import type { AuthManager } from '@gravito/sentinel'
import { CartService, RequestProductCache } from '../../Services'

export class CartController {
  /**
   * Get CartService instance with injected RequestScope cache
   *
   * The product cache is automatically scoped to the current HTTP request.
   * Multiple calls within the same request return the same cache instance.
   * Cache is automatically cleaned up when request ends.
   */
  private static getService(ctx: GravitoContext): CartService {
    // Resolve request-scoped product cache
    // First call: creates new RequestProductCache instance
    // Subsequent calls: returns cached instance
    const productCache = ctx.scoped('product:cache', () => new RequestProductCache())

    return new CartService(undefined, undefined, productCache)
  }

  /**
   * Get current cart identifiers
   */
  private static async getCartIdentifiers(ctx: GravitoContext): Promise<{
    userId?: number
    sessionId?: string
  }> {
    const auth = ctx.get('auth') as AuthManager
    const session = ctx.get('session') as SessionService

    let userId: number | undefined
    let sessionId: string | undefined

    if (await auth.check()) {
      const user = await auth.user()
      userId = user?.getAuthIdentifier() as number
    } else {
      sessionId = session.id()
    }

    return { userId, sessionId }
  }

  /**
   * View cart
   */
  static async index(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as unknown as InertiaHelper
    const service = CartController.getService(ctx)
    const { userId, sessionId } = await CartController.getCartIdentifiers(ctx)

    const cart = await service.getOrCreateCart(userId, sessionId)

    return inertia.render('Cart/Index', {
      cart: {
        id: cart.id,
        items:
          cart.items?.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            line_total: item.getLineTotal(),
            product: item.product,
          })) || [],
        item_count: cart.getItemCount(),
        subtotal: cart.getSubtotal(),
      },
    })
  }

  /**
   * Add item to cart
   */
  static async add(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as { product_id: number; quantity?: number }
    const service = CartController.getService(ctx)
    const { userId, sessionId } = await CartController.getCartIdentifiers(ctx)

    try {
      const cart = await service.getOrCreateCart(userId, sessionId)
      await service.addItem(cart.id, body.product_id, body.quantity || 1)

      // Get updated items only (much faster than full cart fetch)
      const items = await service.getCartItems(cart.id)
      cart.items = items

      return ctx.json({
        success: true,
        message: '商品已加入購物車',
        cart: {
          item_count: cart.getItemCount(),
          subtotal: cart.getSubtotal(),
        },
      })
    } catch (error: any) {
      return ctx.json(
        {
          success: false,
          message: error.message || '無法加入購物車',
        },
        400
      )
    }
  }

  /**
   * Update item quantity
   */
  static async update(ctx: GravitoContext) {
    const itemId = parseInt(ctx.req.param('itemId') || '', 10)
    const body = (await ctx.req.json()) as { quantity: number }
    const service = CartController.getService(ctx)
    const { userId, sessionId } = await CartController.getCartIdentifiers(ctx)

    try {
      await service.updateItemQuantity(itemId, body.quantity)

      const cart = await service.getOrCreateCart(userId, sessionId)

      return ctx.json({
        success: true,
        cart: {
          item_count: cart.getItemCount(),
          subtotal: cart.getSubtotal(),
        },
      })
    } catch (error: any) {
      return ctx.json(
        {
          success: false,
          message: error.message || '無法更新數量',
        },
        400
      )
    }
  }

  /**
   * Remove item from cart
   */
  static async remove(ctx: GravitoContext) {
    const itemId = parseInt(ctx.req.param('itemId') || '', 10)
    const service = CartController.getService(ctx)
    const { userId, sessionId } = await CartController.getCartIdentifiers(ctx)

    await service.removeItem(itemId)

    const cart = await service.getOrCreateCart(userId, sessionId)

    return ctx.json({
      success: true,
      cart: {
        item_count: cart.getItemCount(),
        subtotal: cart.getSubtotal(),
      },
    })
  }

  /**
   * Clear cart
   */
  static async clear(ctx: GravitoContext) {
    const service = CartController.getService(ctx)
    const { userId, sessionId } = await CartController.getCartIdentifiers(ctx)

    const cart = await service.getOrCreateCart(userId, sessionId)
    await service.clearCart(cart.id)

    return ctx.json({
      success: true,
      cart: {
        item_count: 0,
        subtotal: 0,
      },
    })
  }

  /**
   * Get cart summary (for header mini-cart)
   */
  static async summary(ctx: GravitoContext) {
    const service = CartController.getService(ctx)
    const { userId, sessionId } = await CartController.getCartIdentifiers(ctx)

    const cart = await service.getOrCreateCart(userId, sessionId)

    return ctx.json({
      item_count: cart.getItemCount(),
      subtotal: cart.getSubtotal(),
      items:
        cart.items?.slice(0, 3).map((item) => ({
          id: item.id,
          product: item.product,
          quantity: item.quantity,
          price: item.price,
        })) || [],
    })
  }
}
