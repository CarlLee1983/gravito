/**
 * Wishlist Service
 *
 * Manages wishlist operations with request-scoped product caching.
 */

import { Product } from '../models/Product'
import type { Wishlist } from '../models/Wishlist'
import { Wishlist as WishlistModel } from '../models/Wishlist'
import type { RequestProductCache } from './RequestProductCache'

export class WishlistService {
  constructor(private productCache?: RequestProductCache) {}

  /**
   * Get wishlists for a user with cached products
   *
   * @param userId - User ID
   * @returns Wishlist items with product details
   */
  async getUserWishlists(userId: number) {
    const wishlists = await WishlistModel.where('user_id', userId).get()

    // Extract product IDs
    const productIds = wishlists.map((w: Wishlist) => w.product_id)
    if (productIds.length === 0) {
      return []
    }

    // Fetch products using cache (avoids N+1 queries)
    let products: any[] = []
    if (this.productCache) {
      // Use request-scoped cache
      const productMap = await this.productCache.getProducts(productIds)
      products = Array.from(productMap.values())
    } else {
      // Fallback to direct query if cache not available
      products = productIds.length > 0 ? await Product.whereIn('id', productIds).get() : []
    }

    // Format response
    return wishlists
      .map((item: Wishlist) => {
        const product = products.find((p: any) => p.id === item.product_id)
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
      .filter((item: any) => item.product) // Filter out deleted products
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(userId: number, productId: number) {
    const existing = await WishlistModel.where('user_id', userId)
      .where('product_id', productId)
      .first()

    if (!existing) {
      const wishlist = new WishlistModel()
      wishlist.user_id = userId
      wishlist.product_id = productId
      wishlist.created_at = new Date()
      await wishlist.save()
      return wishlist
    }

    return existing
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(wishlistId: number, userId: number) {
    const wishlist = await WishlistModel.find(wishlistId)

    if (wishlist && wishlist.user_id === userId) {
      await wishlist.delete()
      return true
    }

    return false
  }
}
