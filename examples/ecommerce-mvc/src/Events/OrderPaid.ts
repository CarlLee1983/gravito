import { Event } from '@gravito/core'
import type { Order } from '../models'

/**
 * Order Paid Event
 *
 * Fired when order payment is confirmed via Stripe.
 * Triggers order processing, fulfillment, shipment notifications.
 */
export class OrderPaid extends Event {
  constructor(
    public order: Order,
    public paymentIntentId: string,
    public amount: number
  ) {
    super()
  }
}
