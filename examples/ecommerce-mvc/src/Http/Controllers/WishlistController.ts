import type { GravitoContext } from '@gravito/core'
import type { InertiaService } from '@gravito/ion'
import { Product } from '../../Models/Product'
import { Wishlist } from '../../Models/Wishlist'

export class WishlistController {
  static async index(ctx: GravitoContext) {
    const inertia = ctx.get('inertia') as InertiaService
    const user = ctx.get('user') as any
    if (!user) return ctx.redirect('/login')

    const wishlists = await Wishlist.where('user_id', user.id).get()

    // In a real app, we would use a join or eager loading
    // For now, simpler optimization: fetch all related products
    const productIds = wishlists.map((w: Wishlist) => w.product_id)
    const products = productIds.length > 0 ? await Product.whereIn('id', productIds).get() : []

    const formattedWishlists = wishlists
      .map((item: Wishlist) => {
        const product = products.find((p: Product) => p.id === item.product_id)
        return {
          id: item.id,
          product: product
            ? {
                ...(product as any)._attributes,
                formatted_price: product.getFormattedPrice(),
              }
            : null,
        }
      })
      .filter((item: any) => item.product) // Filter out items where product no longer exists

    return inertia.render('Account/Wishlist', {
      wishlists: formattedWishlists,
    })
  }

  static async store(ctx: GravitoContext) {
    const user = ctx.get('user') as any
    if (!user) return ctx.redirect('/login')

    const body = await (ctx as any).req.json()
    const productId = body.product_id

    if (!productId) {
      return ctx.json({ error: 'Product ID required' }, 400)
    }

    const existing = await Wishlist.where('user_id', user.id).where('product_id', productId).first()

    if (!existing) {
      const wishlist = new Wishlist()
      wishlist.user_id = user.id
      wishlist.product_id = productId
      wishlist.created_at = new Date()
      await wishlist.save()
    }

    return ctx.redirect('/account/wishlist')
  }

  static async destroy(ctx: GravitoContext) {
    const user = ctx.get('user') as any
    if (!user) return ctx.redirect('/login')

    const id = (ctx as any).req.param('id')
    const wishlist = await Wishlist.find(id)

    if (wishlist && wishlist.user_id === user.id) {
      await wishlist.delete()
    }

    return ctx.redirect('/account/wishlist')
  }
}
