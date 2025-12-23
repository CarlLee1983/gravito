/**
 * @fileoverview Broadcast Event base class
 *
 * Events that can be broadcast to WebSocket channels.
 *
 * @module @gravito/ripple/events
 */

import type { Channel } from '../types'

/**
 * Abstract base class for broadcast events
 *
 * @example
 * ```typescript
 * class OrderShipped extends BroadcastEvent {
 *   constructor(public order: Order) {
 *     super()
 *   }
 *
 *   broadcastOn() {
 *     return new PrivateChannel(`orders.${this.order.userId}`)
 *   }
 *
 *   broadcastAs() {
 *     return 'OrderShipped'
 *   }
 * }
 *
 * // Broadcast
 * broadcast(new OrderShipped(order))
 * ```
 */
export abstract class BroadcastEvent {
  /**
   * The channels to broadcast this event on
   */
  abstract broadcastOn(): Channel | Channel[]

  /**
   * The event name to use when broadcasting
   * Defaults to the class name
   */
  broadcastAs(): string {
    return this.constructor.name
  }

  /**
   * Socket IDs to exclude from the broadcast
   */
  broadcastExcept(): string[] {
    return []
  }

  /**
   * Get the event data payload
   * Override to customize the broadcast payload
   */
  broadcastWith(): Record<string, unknown> {
    // By default, return all public properties
    const data: Record<string, unknown> = {}
    for (const key of Object.keys(this)) {
      data[key] = (this as Record<string, unknown>)[key]
    }
    return data
  }
}
