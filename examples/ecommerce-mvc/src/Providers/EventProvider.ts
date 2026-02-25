/**
 * Event Provider
 *
 * Registers domain event listeners for the application.
 *
 * @example
 * ```typescript
 * // In bootstrap.ts
 * core.register(new EventProvider())
 * ```
 */

import { type PlanetCore, ServiceProvider } from '@gravito/core'
import { CartItemAdded, OrderCreated, OrderPaid } from '../Events'
import {
  ProcessOrderPayment,
  SendOrderCreatedNotification,
  TrackCartInteraction,
} from '../Listeners'

export class EventProvider extends ServiceProvider {
  /**
   * Register phase: services are registered in container
   */
  register() {
    // Event listeners can be registered here if needed
  }

  /**
   * Boot phase: register event listeners
   */
  boot(core: PlanetCore) {
    // ─────────────────────────────────────────────────────────────
    // Order Events
    // ─────────────────────────────────────────────────────────────

    /**
     * Send order confirmation email
     * Runs synchronously immediately after order creation
     */
    core.events.listen(OrderCreated as any, SendOrderCreatedNotification)

    /**
     * Process payment and trigger fulfillment
     * Runs asynchronously on queue for heavy operations
     * (uncomment queue option when using queue system)
     */
    core.events.listen(OrderPaid as any, ProcessOrderPayment)
    // core.events.listen(OrderPaid, ProcessOrderPayment, { queue: 'orders', delay: 5 })

    /**
     * Handle order cancellation and refunds
     * (implement listener when refund system is ready)
     */
    // core.events.listen(OrderCancelled, ProcessOrderRefund, { queue: 'refunds' })

    // ─────────────────────────────────────────────────────────────
    // Cart Events
    // ─────────────────────────────────────────────────────────────

    /**
     * Track cart interactions for analytics and inventory monitoring
     */
    core.events.listen(CartItemAdded as any, TrackCartInteraction)

    /**
     * Handle abandoned cart recovery
     * (implement listener when marketing system is ready)
     */
    // core.events.listen(CartCleared, TriggerAbandonedCartRecovery)

    core.logger.info('[EventProvider] Event listeners registered')
  }
}
