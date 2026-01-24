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
   * Define which channel(s) this event should be broadcast on.
   *
   * @returns Single Channel or array of Channels for multi-channel broadcasting
   *
   * @example
   * ```typescript
   * // Broadcast to a single private channel
   * broadcastOn() {
   *   return new PrivateChannel(`orders.${this.order.userId}`)
   * }
   *
   * // Broadcast to multiple channels
   * broadcastOn() {
   *   return [
   *     new PrivateChannel(`user.${this.userId}`),
   *     new PublicChannel('notifications')
   *   ]
   * }
   * ```
   */
  abstract broadcastOn(): Channel | Channel[]

  /**
   * Define the event name for client listeners.
   *
   * @returns The event name (defaults to class name if not overridden)
   *
   * @example
   * ```typescript
   * // Use class name (default behavior)
   * class OrderShipped extends BroadcastEvent {
   *   // Event name will be 'OrderShipped'
   * }
   *
   * // Custom event name
   * broadcastAs() {
   *   return 'order.shipped' // dot notation style
   * }
   * ```
   */
  broadcastAs(): string {
    return this.constructor.name
  }

  /**
   * Exclude specific socket IDs from receiving this broadcast.
   *
   * @returns Array of socket IDs to exclude (empty array by default)
   *
   * @example
   * ```typescript
   * // Exclude the sender
   * class MessageSent extends BroadcastEvent {
   *   constructor(
   *     public message: Message,
   *     public senderSocketId: string
   *   ) { super() }
   *
   *   broadcastExcept() {
   *     return [this.senderSocketId] // Don't send back to sender
   *   }
   * }
   * ```
   */
  broadcastExcept(): string[] {
    return []
  }

  /**
   * Define the event payload data sent to clients.
   *
   * @returns The data object to broadcast (all public properties by default)
   *
   * @example
   * ```typescript
   * // Default: All public properties are included
   * class OrderShipped extends BroadcastEvent {
   *   constructor(public order: Order) { super() }
   *   // Broadcasts: { order: { id, status, ... } }
   * }
   *
   * // Custom payload
   * class OrderShipped extends BroadcastEvent {
   *   constructor(public order: Order) { super() }
   *
   *   broadcastWith() {
   *     return {
   *       orderId: this.order.id,
   *       trackingNumber: this.order.trackingNumber,
   *       // Exclude sensitive data
   *     }
   *   }
   * }
   * ```
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
