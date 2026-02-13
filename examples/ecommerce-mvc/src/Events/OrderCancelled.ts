import { Event } from '@gravito/core'
import type { Order } from '../models'

/**
 * Order Cancelled Event
 *
 * Fired when an order is cancelled.
 * Triggers inventory restoration, refund processing, cancellation notifications.
 */
export class OrderCancelled extends Event {
  constructor(
    public order: Order,
    public reason?: string
  ) {
    super()
  }
}
