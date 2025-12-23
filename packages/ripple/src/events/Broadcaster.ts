/**
 * @fileoverview Broadcaster for sending events to channels
 *
 * @module @gravito/ripple/events
 */

import type { RippleServer } from '../RippleServer'
import type { BroadcastEvent } from './BroadcastEvent'

/**
 * Global Ripple server instance holder
 */
let globalRippleServer: RippleServer | null = null

/**
 * Set the global Ripple server instance
 */
export function setRippleServer(server: RippleServer): void {
  globalRippleServer = server
}

/**
 * Get the global Ripple server instance
 */
export function getRippleServer(): RippleServer | null {
  return globalRippleServer
}

/**
 * Broadcast an event to its channels
 *
 * @example
 * ```typescript
 * class OrderShipped extends BroadcastEvent {
 *   constructor(public order: Order) { super() }
 *   broadcastOn() { return new PrivateChannel(`orders.${this.order.userId}`) }
 * }
 *
 * broadcast(new OrderShipped(order))
 * ```
 */
export function broadcast(event: BroadcastEvent): void {
  if (!globalRippleServer) {
    console.warn('[Ripple] No server configured. Event not broadcast.')
    return
  }

  const channels = event.broadcastOn()
  const eventName = event.broadcastAs()
  const data = event.broadcastWith()
  const except = event.broadcastExcept()

  const channelList = Array.isArray(channels) ? channels : [channels]

  for (const channel of channelList) {
    // For each subscriber in the channel, excluding specified sockets
    globalRippleServer.broadcast(channel.fullName, eventName, data)
  }
}

/**
 * Fluent Broadcaster API for more control
 *
 * @example
 * ```typescript
 * Broadcaster.to('orders.123')
 *   .emit('OrderUpdated', { status: 'shipped' })
 *
 * Broadcaster.toPrivate('orders.123')
 *   .except(socketId)
 *   .emit('OrderUpdated', { status: 'shipped' })
 * ```
 */
export class Broadcaster {
  private _channel: string
  private _except: string[] = []

  private constructor(channel: string) {
    this._channel = channel
  }

  /**
   * Target a public channel
   */
  static to(channel: string): Broadcaster {
    return new Broadcaster(channel)
  }

  /**
   * Target a private channel
   */
  static toPrivate(channel: string): Broadcaster {
    return new Broadcaster(`private-${channel}`)
  }

  /**
   * Target a presence channel
   */
  static toPresence(channel: string): Broadcaster {
    return new Broadcaster(`presence-${channel}`)
  }

  /**
   * Exclude specific socket IDs from broadcast
   */
  except(socketIds: string | string[]): this {
    const ids = Array.isArray(socketIds) ? socketIds : [socketIds]
    this._except.push(...ids)
    return this
  }

  /**
   * Emit an event to the channel
   */
  emit(event: string, data: unknown): void {
    if (!globalRippleServer) {
      console.warn('[Ripple] No server configured. Event not broadcast.')
      return
    }

    globalRippleServer.broadcast(this._channel, event, data)
  }
}
