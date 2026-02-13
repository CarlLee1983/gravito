/**
 * Cart Service
 *
 * Business logic for shopping cart operations.
 * Uses CartRepository for data access.
 * Returns DTOs via Presenters for API responses.
 * Dispatches domain events for cart state changes.
 */

import type { EventManager } from '@gravito/core'
import { CartCleared, CartItemAdded } from '../Events'
import type { Cart, CartItem } from '../models'
import {
  CartItemPresenter,
  type CartItemResponseDTO,
  CartPresenter,
  type CartResponseDTO,
} from '../Presenters'
import { CartRepository } from '../Repositories'

export class CartService {
  constructor(
    private cartRepository = new CartRepository(),
    private events?: EventManager
  ) {}

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
    const item = await this.cartRepository.addItem(cartId, productId, quantity)
    // Emit CartItemAdded event for inventory/analytics tracking
    if (this.events) {
      await this.events.dispatch(new CartItemAdded(item, cartId, productId))
    }
    return item
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
    await this.cartRepository.clearCart(cartId)
    // Emit CartCleared event for recovery campaigns
    if (this.events) {
      await this.events.dispatch(new CartCleared(cartId))
    }
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
    const cart = await this.cartRepository.getWithItems(cartId)
    return cart ? CartPresenter.present(cart) : null
  }

  /**
   * Add item and return item DTO
   */
  async addItemAsDTO(
    cartId: number,
    productId: number,
    quantity?: number
  ): Promise<CartItemResponseDTO> {
    const item = await this.addItem(cartId, productId, quantity)
    return CartItemPresenter.present(item)
  }

  /**
   * Get user's cart as DTO
   */
  async getUserCartAsDTO(userId: number): Promise<CartResponseDTO> {
    const cart = await this.cartRepository.getOrCreateForUser(userId)
    // getOrCreateForUser already populates items
    return CartPresenter.present(cart)
  }
}
