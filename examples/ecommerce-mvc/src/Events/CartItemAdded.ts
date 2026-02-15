import { Event } from '@gravito/core'
import type { CartItem } from '../models'

/**
 * Cart Item Added Event
 *
 * Fired when a product is added to cart.
 * Triggers inventory checks, pricing updates, analytics tracking.
 */
export class CartItemAdded extends Event {
  constructor(
    public item: CartItem,
    public cartId: number,
    public productId: number
  ) {
    super()
  }
}
