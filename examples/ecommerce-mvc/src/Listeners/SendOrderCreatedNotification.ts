import type { Listener } from '@gravito/core'
import type { OrderCreated } from '../Events'

/**
 * Send Order Created Notification Listener
 *
 * Example listener that responds to OrderCreated events.
 * In a real application, this would send confirmation emails or webhooks.
 *
 * @example
 * ```typescript
 * // In a ServiceProvider boot method:
 * core.events.listen(OrderCreated, SendOrderCreatedNotification)
 * ```
 */
export class SendOrderCreatedNotification implements Listener<OrderCreated> {
  async handle(event: OrderCreated): Promise<void> {
    // Example: Send email confirmation to user
    // await emailService.send({
    //   to: event.order.user?.email,
    //   subject: 'Order Confirmed',
    //   template: 'order-created',
    //   data: { order: event.order }
    // })

    console.log(
      `[OrderCreated] Order #${event.order.order_number} created for user ${event.userId}`
    )
  }
}
