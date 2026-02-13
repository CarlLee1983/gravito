/**
 * Cart Service
 *
 * Business logic for shopping cart operations.
 * Uses CartRepository for data access.
 * Returns DTOs via Presenters for API responses.
 */

import type { Cart, CartItem } from '../models'
import {
  CartItemPresenter,
  type CartItemResponseDTO,
  CartPresenter,
  type CartResponseDTO,
} from '../Presenters'
import { CartRepository } from '../Repositories'

export class CartService {
  constructor(private cartRepository = new CartRepository()) {}

  // ─────────────────────────────────────────────────────────────
  // Internal Methods (return raw models)
  // ─────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────
  // Presenter Methods (return DTOs for API responses)
  // ─────────────────────────────────────────────────────────────

  /**
   * Get cart as DTO (for API responses)
   */
  async getCartAsDTO(cartId: number): Promise<CartResponseDTO | null> {
    const cart = await this.cartRepository.find(cartId)
    if (!cart) return null
    const withItems = await this.cartRepository.getWithItems(cartId)
    return withItems ? CartPresenter.present(withItems) : null
  }

  /**
   * Add item and return item DTO
   */
  async addItemAsDTO(
    cartId: number,
    productId: number,
    quantity?: number
  ): Promise<CartItemResponseDTO> {
    const item = await this.cartRepository.addItem(cartId, productId, quantity)
    return CartItemPresenter.present(item)
  }

  /**
   * Get user's cart as DTO
   */
  async getUserCartAsDTO(userId: number): Promise<CartResponseDTO> {
    const cart = await this.cartRepository.getOrCreateForUser(userId)
    const withItems = await this.cartRepository.getWithItems(cart.id)
    if (!withItems) {
      throw new Error('Failed to load cart with items')
    }
    return CartPresenter.present(withItems)
  }
}
