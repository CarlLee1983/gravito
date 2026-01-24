/**
 * @fileoverview Broadcast manager for Ripple
 *
 * @module @gravito/ripple/events
 */

import type { RippleServer } from '../RippleServer'
import type { BroadcastEvent } from './BroadcastEvent'

/**
 * Modern broadcast manager with dependency injection.
 *
 * BroadcastManager is the recommended way to broadcast events in Ripple applications.
 * It accepts RippleServer explicitly through the constructor (dependency injection),
 * making it testable and avoiding global state.
 *
 * @example
 * ```typescript
 * // Setup with dependency injection
 * const ripple = new RippleServer({ path: '/ws' })
 * const manager = new BroadcastManager(ripple)
 *
 * // Or bind to IoC container
 * container.bind('broadcast').toValue(new BroadcastManager(ripple))
 *
 * // Broadcast BroadcastEvent instances
 * manager.broadcast(new OrderShipped(order))
 *
 * // Fluent API for direct broadcasting
 * manager.to('news').emit('article.published', { id: 123 })
 * manager.toPrivate('orders.456').emit('order.updated', { status: 'shipped' })
 * manager.toPresence('chat.lobby').except('socket-1').emit('message', { text: 'Hi!' })
 * ```
 */
export class BroadcastManager {
  constructor(private readonly server: RippleServer) {}

  /**
   * Broadcast a BroadcastEvent to its designated channels.
   *
   * @param event - The BroadcastEvent instance to broadcast
   *
   * @example
   * ```typescript
   * class OrderShipped extends BroadcastEvent {
   *   constructor(public order: Order) { super() }
   *   broadcastOn() { return new PrivateChannel(`orders.${this.order.userId}`) }
   *   broadcastAs() { return 'OrderShipped' }
   * }
   *
   * manager.broadcast(new OrderShipped(order))
   * ```
   */
  broadcast(event: BroadcastEvent): void {
    const channels = event.broadcastOn()
    const eventName = event.broadcastAs()
    const data = event.broadcastWith()

    const channelList = Array.isArray(channels) ? channels : [channels]

    for (const channel of channelList) {
      this.server.broadcast(channel.fullName, eventName, data)
    }
  }

  /**
   * Broadcast to a public channel.
   *
   * @param channel - The channel name (without prefix)
   * @returns ChannelBroadcaster for chaining
   */
  to(channel: string): ChannelBroadcaster {
    return new ChannelBroadcaster(this.server, channel)
  }

  /**
   * Broadcast to a private channel.
   *
   * @param channel - The channel name (will be prefixed with 'private-')
   * @returns ChannelBroadcaster for chaining
   */
  toPrivate(channel: string): ChannelBroadcaster {
    return new ChannelBroadcaster(this.server, `private-${channel}`)
  }

  /**
   * Broadcast to a presence channel.
   *
   * @param channel - The channel name (will be prefixed with 'presence-')
   * @returns ChannelBroadcaster for chaining
   */
  toPresence(channel: string): ChannelBroadcaster {
    return new ChannelBroadcaster(this.server, `presence-${channel}`)
  }
}

/**
 * Fluent broadcaster for channel-specific operations.
 *
 * Returned by BroadcastManager's `to()`, `toPrivate()`, and `toPresence()` methods.
 * Provides a chainable API for broadcasting with optional exclusions.
 */
export class ChannelBroadcaster {
  private _except: string[] = []

  constructor(
    private readonly server: RippleServer,
    private readonly channel: string
  ) {}

  /**
   * Exclude specific socket IDs from the broadcast.
   *
   * @param socketIds - Single socket ID or array of IDs to exclude
   * @returns this for method chaining
   */
  except(socketIds: string | string[]): this {
    const ids = Array.isArray(socketIds) ? socketIds : [socketIds]
    this._except.push(...ids)
    return this
  }

  /**
   * Emit the event to the channel.
   *
   * @param event - The event name
   * @param data - The event payload (must be JSON-serializable)
   */
  emit(event: string, data: unknown): void {
    this.server.broadcast(this.channel, event, data)
  }
}
