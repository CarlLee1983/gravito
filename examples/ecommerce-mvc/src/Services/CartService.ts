/**
 * Cart Service
 *
 * Business logic for shopping cart operations.
 * Uses CartRepository for data access.
 */

import type { Cart, CartItem } from '../models'
import { CartRepository } from '../Repositories'

export class CartService {
  constructor(private cartRepository = new CartRepository()) {}

  /**
   * Get or create cart for user/session
   */
  async getOrCreateCart(userId?: number, sessionId?: string): Promise<Cart> {
    return this.cartRepository.getOrCreate(userId, sessionId)
  }

  /**
   * Get cart items
   */
  async getCartItems(cartId: number): Promise<CartItem[]> {
    return this.cartRepository.getCartItems(cartId)
  }

  /**
   * Add item to cart
   */
  async addItem(cartId: number, productId: number, quantity?: number): Promise<CartItem> {
    return this.cartRepository.addItem(cartId, productId, quantity)
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(itemId: number, quantity: number): Promise<void> {
    return this.cartRepository.updateItemQuantity(itemId, quantity)
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: number): Promise<void> {
    return this.cartRepository.removeItem(itemId)
  }

  /**
   * Clear cart
   */
  async clearCart(cartId: number): Promise<void> {
    return this.cartRepository.clearCart(cartId)
  }

  /**
   * Merge guest cart with user cart after login
   */
  async mergeCarts(guestSessionId: string, userId: number): Promise<Cart> {
    return this.cartRepository.mergeCarts(guestSessionId, userId)
  }
}
