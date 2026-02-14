import { Event } from '@gravito/core'
import type { Order } from '../models'

/**
 * Order Created Event
 *
 * Fired when a new order is created from cart.
 * Triggers downstream operations: payment processing, inventory lock, notifications.
 */
export class OrderCreated extends Event {
  constructor(
    public order: Order,
    public userId: number
  ) {
    super()
  }
}
