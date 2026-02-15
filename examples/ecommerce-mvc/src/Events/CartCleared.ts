import { Event } from '@gravito/core'

/**
 * Cart Cleared Event
 *
 * Fired when a cart is emptied.
 * Triggers recovery campaigns, inventory restoration.
 */
export class CartCleared extends Event {
  constructor(public cartId: number) {
    super()
  }
}
