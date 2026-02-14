import type { Listener } from '@gravito/core'
import type { OrderPaid } from '../Events'

/**
 * Process Order Payment Listener
 *
 * Example listener that responds to OrderPaid events.
 * Triggers fulfillment, shipment logistics, inventory deduction.
 *
 * @example
 * ```typescript
 * // In a ServiceProvider boot method:
 * core.events.listen(OrderPaid, ProcessOrderPayment, { queue: 'orders' })
 * ```
 */
export class ProcessOrderPayment implements Listener<OrderPaid> {
  async handle(event: OrderPaid): Promise<void> {
    // Example: Trigger order fulfillment pipeline
    // 1. Lock inventory
    // await inventoryService.lock(event.order.items)
    // 2. Create shipment
    // const shipment = await shipmentService.create(event.order)
    // 3. Send notification
    // await notificationService.sendShipmentNotification(shipment)

    console.log(
      `[OrderPaid] Payment confirmed for order #${event.order.order_number} (${event.amount} cents)`
    )
  }
}
