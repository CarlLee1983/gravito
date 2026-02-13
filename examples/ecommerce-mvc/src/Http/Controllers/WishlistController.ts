import type { GravitoContext } from '@gravito/core'
import type { InertiaHelper } from '@gravito/ion'
import type { AuthManager } from '@gravito/sentinel'
import type { User } from '../../models/User'
import { RequestProductCache, WishlistService } from '../../Services'

export class WishlistController {
  /**
   * Get WishlistService instance with injected RequestScope cache
   *
   * The product cache is automatically scoped to the current HTTP request.
   * Multiple calls within the same request return the same cache instance.
   * Cache is automatically cleaned up when request ends.
   */
  private static getService(ctx: GravitoContext): WishlistService {
    const productCache = ctx.scoped('product:cache', () => new RequestProductCache())
    return new WishlistService(productCache)
  }

  static async index(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as unknown as InertiaHelper
    const auth = ctx.get('auth') as AuthManager
    const user = (await auth.user()) as User | null
    if (!user) {
      return ctx.redirect('/login')
    }

    const service = WishlistController.getService(ctx)
    const wishlists = await service.getUserWishlists(user.id)

    return inertia.render('Account/Wishlist', {
      wishlists,
    })
  }

  static async store(ctx: GravitoContext) {
    const auth = ctx.get('auth') as AuthManager
    const user = (await auth.user()) as User | null
    if (!user) {
      return ctx.redirect('/login')
    }

    const body = await (ctx as any).req.json()
    const productId = body.product_id

    if (!productId) {
      return ctx.json({ error: 'Product ID required' }, 400)
    }

    const service = WishlistController.getService(ctx)
    await service.addToWishlist(user.id, productId)

    return ctx.redirect('/account/wishlist')
  }

  static async destroy(ctx: GravitoContext) {
    const auth = ctx.get('auth') as AuthManager
    const user = (await auth.user()) as User | null
    if (!user) {
      return ctx.redirect('/login')
    }

    const id = (ctx as any).req.param('id')
    const service = WishlistController.getService(ctx)
    await service.removeFromWishlist(id, user.id)

    return ctx.redirect('/account/wishlist')
  }
}
