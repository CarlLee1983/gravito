/**
 * @fileoverview Broadcaster for sending events to channels
 *
 * @module @gravito/ripple/events
 */

import type { RippleServer } from '../RippleServer'
import type { BroadcastEvent } from './BroadcastEvent'
import { BroadcastManager } from './BroadcastManager'

let globalRippleServer: RippleServer | null = null

/**
 * Set the global RippleServer instance.
 *
 * **⚠️ DEPRECATED**: This function is deprecated and will be removed in v4.0.
 * Use dependency injection with `BroadcastManager` instead.
 *
 * @deprecated Use BroadcastManager with dependency injection instead. Will be removed in v4.0.
 * @param server - The RippleServer instance to use globally
 *
 * @example
 * ```typescript
 * // ❌ Old way (deprecated)
 * import { setRippleServer } from '@gravito/ripple'
 * const ripple = new RippleServer({ path: '/ws' })
 * setRippleServer(ripple)
 *
 * // ✅ New way (recommended)
 * import { BroadcastManager } from '@gravito/ripple'
 * const ripple = new RippleServer({ path: '/ws' })
 * const manager = new BroadcastManager(ripple)
 * // Or with dependency injection:
 * container.bind('broadcast').toValue(new BroadcastManager(ripple))
 * ```
 *
 * @see {@link BroadcastManager} - Recommended replacement
 */
export function setRippleServer(server: RippleServer): void {
  globalRippleServer = server
}

/**
 * Get the global RippleServer instance.
 *
 * **⚠️ DEPRECATED**: This function is deprecated and will be removed in v4.0.
 * Use dependency injection with `BroadcastManager` instead.
 *
 * @deprecated Use BroadcastManager with dependency injection instead. Will be removed in v4.0.
 * @returns The globally configured RippleServer instance, or null if not configured
 *
 * @example
 * ```typescript
 * // ❌ Old way (deprecated)
 * import { getRippleServer } from '@gravito/ripple'
 * const ripple = getRippleServer()
 * if (ripple) {
 *   ripple.broadcast('news', 'article.published', data)
 * }
 *
 * // ✅ New way (recommended)
 * import { BroadcastManager } from '@gravito/ripple'
 * const manager = container.make<BroadcastManager>('broadcast')
 * manager.to('news').emit('article.published', data)
 * ```
 *
 * @see {@link BroadcastManager} - Recommended replacement
 */
export function getRippleServer(): RippleServer | null {
  return globalRippleServer
}

/**
 * Broadcast a BroadcastEvent to its designated channels.
 *
 * **⚠️ DEPRECATED**: This function is deprecated and will be removed in v4.0.
 * Use `BroadcastManager.broadcast()` with dependency injection instead.
 *
 * This function uses a global RippleServer instance. In modern applications,
 * prefer dependency injection with BroadcastManager for better testability
 * and cleaner architecture.
 *
 * @deprecated Use BroadcastManager.broadcast() instead. Will be removed in v4.0.
 * @param event - The BroadcastEvent to send (determines channels via broadcastOn())
 *
 * @example
 * ```typescript
 * // ❌ Old way (deprecated)
 * import { broadcast } from '@gravito/ripple'
 *
 * class OrderShipped extends BroadcastEvent {
 *   constructor(public order: Order) { super() }
 *   broadcastOn() { return new PrivateChannel(`orders.${this.order.userId}`) }
 *   broadcastAs() { return 'OrderShipped' }
 * }
 *
 * broadcast(new OrderShipped(order))
 *
 * // ✅ New way (recommended)
 * import { BroadcastManager } from '@gravito/ripple'
 *
 * class OrderShipped extends BroadcastEvent {
 *   constructor(public order: Order) { super() }
 *   broadcastOn() { return new PrivateChannel(`orders.${this.order.userId}`) }
 *   broadcastAs() { return 'OrderShipped' }
 * }
 *
 * const manager = container.make<BroadcastManager>('broadcast')
 * manager.broadcast(new OrderShipped(order))
 * ```
 *
 * @see {@link BroadcastManager.broadcast} - Recommended replacement
 * @see {@link BroadcastEvent} - For creating broadcast events
 */
export function broadcast(event: BroadcastEvent): void {
  if (!globalRippleServer) {
    console.warn('[Ripple] No server configured. Use BroadcastManager instead.')
    return
  }

  const manager = new BroadcastManager(globalRippleServer)
  manager.broadcast(event)
}

/**
 * Fluent API for broadcasting events to channels.
 *
 * **⚠️ DEPRECATED**: This class is deprecated and will be removed in v4.0.
 * Use `BroadcastManager` with dependency injection for a cleaner, more testable approach.
 *
 * The Broadcaster class uses a global RippleServer instance, which makes testing difficult
 * and creates hidden dependencies. BroadcastManager accepts the server explicitly through
 * dependency injection.
 *
 * @deprecated Use BroadcastManager instead. Will be removed in v4.0.
 *
 * @example
 * ```typescript
 * // ❌ Old way (deprecated)
 * import { Broadcaster } from '@gravito/ripple'
 *
 * Broadcaster.to('news').emit('article.published', { id: 123 })
 * Broadcaster.toPrivate('orders.456').emit('order.shipped', data)
 * Broadcaster.toPresence('chat.lobby')
 *   .except(['socket-id-1', 'socket-id-2'])
 *   .emit('message', { text: 'Hello!' })
 *
 * // ✅ New way (recommended)
 * import { BroadcastManager } from '@gravito/ripple'
 *
 * const manager = container.make<BroadcastManager>('broadcast')
 * manager.to('news').emit('article.published', { id: 123 })
 * manager.to('private-orders.456').emit('order.shipped', data)
 * manager.to('presence-chat.lobby')
 *   .except(['socket-id-1', 'socket-id-2'])
 *   .emit('message', { text: 'Hello!' })
 * ```
 *
 * @see {@link BroadcastManager} - Recommended replacement with dependency injection
 */
export class Broadcaster {
  private _channel: string
  private _except: string[] = []

  private constructor(channel: string) {
    this._channel = channel
  }

  /**
   * Create a broadcaster for a public channel.
   *
   * **⚠️ DEPRECATED**: Use `BroadcastManager.to()` instead.
   *
   * @deprecated Use BroadcastManager.to() instead. Will be removed in v4.0.
   * @param channel - The public channel name (without prefix)
   * @returns A Broadcaster instance for the channel
   *
   * @example
   * ```typescript
   * // ❌ Deprecated
   * Broadcaster.to('news').emit('article.published', data)
   *
   * // ✅ Recommended
   * manager.to('news').emit('article.published', data)
   * ```
   */
  static to(channel: string): Broadcaster {
    return new Broadcaster(channel)
  }

  /**
   * Create a broadcaster for a private channel.
   *
   * Automatically prefixes the channel name with 'private-'.
   *
   * **⚠️ DEPRECATED**: Use `BroadcastManager.to()` with manual prefix instead.
   *
   * @deprecated Use BroadcastManager.to() instead. Will be removed in v4.0.
   * @param channel - The channel name (will be prefixed with 'private-')
   * @returns A Broadcaster instance for the private channel
   *
   * @example
   * ```typescript
   * // ❌ Deprecated
   * Broadcaster.toPrivate('orders.123').emit('order.shipped', data)
   *
   * // ✅ Recommended
   * manager.to('private-orders.123').emit('order.shipped', data)
   * ```
   */
  static toPrivate(channel: string): Broadcaster {
    return new Broadcaster(`private-${channel}`)
  }

  /**
   * Create a broadcaster for a presence channel.
   *
   * Automatically prefixes the channel name with 'presence-'.
   *
   * **⚠️ DEPRECATED**: Use `BroadcastManager.to()` with manual prefix instead.
   *
   * @deprecated Use BroadcastManager.to() instead. Will be removed in v4.0.
   * @param channel - The channel name (will be prefixed with 'presence-')
   * @returns A Broadcaster instance for the presence channel
   *
   * @example
   * ```typescript
   * // ❌ Deprecated
   * Broadcaster.toPresence('chat.lobby').emit('message', { text: 'Hello!' })
   *
   * // ✅ Recommended
   * manager.to('presence-chat.lobby').emit('message', { text: 'Hello!' })
   * ```
   */
  static toPresence(channel: string): Broadcaster {
    return new Broadcaster(`presence-${channel}`)
  }

  /**
   * Exclude specific socket IDs from receiving the broadcast.
   *
   * Useful for preventing the sender from receiving their own message
   * or excluding specific users from a broadcast.
   *
   * **⚠️ DEPRECATED**: Use `BroadcastManager.to().except()` instead.
   *
   * @deprecated Use BroadcastManager instead. Will be removed in v4.0.
   * @param socketIds - Single socket ID or array of socket IDs to exclude
   * @returns The Broadcaster instance for method chaining
   *
   * @example
   * ```typescript
   * // ❌ Deprecated
   * Broadcaster.to('chat.room1')
   *   .except('socket-id-sender')
   *   .emit('message', { text: 'Hello!' })
   *
   * Broadcaster.to('chat.room1')
   *   .except(['socket-id-1', 'socket-id-2'])
   *   .emit('notification', { type: 'info' })
   *
   * // ✅ Recommended
   * manager.to('chat.room1')
   *   .except('socket-id-sender')
   *   .emit('message', { text: 'Hello!' })
   * ```
   */
  except(socketIds: string | string[]): this {
    const ids = Array.isArray(socketIds) ? socketIds : [socketIds]
    this._except.push(...ids)
    return this
  }

  /**
   * Emit an event to the configured channel.
   *
   * Sends the event to all subscribers of the channel, excluding any socket IDs
   * specified via the `except()` method.
   *
   * **⚠️ DEPRECATED**: Use `BroadcastManager.to().emit()` instead.
   *
   * @deprecated Use BroadcastManager instead. Will be removed in v4.0.
   * @param event - The event name that clients will listen for
   * @param data - The event payload (must be JSON-serializable)
   *
   * @example
   * ```typescript
   * // ❌ Deprecated
   * Broadcaster.to('news').emit('article.published', {
   *   id: 123,
   *   title: 'Breaking News'
   * })
   *
   * // ✅ Recommended
   * manager.to('news').emit('article.published', {
   *   id: 123,
   *   title: 'Breaking News'
   * })
   * ```
   */
  emit(event: string, data: unknown): void {
    if (!globalRippleServer) {
      console.warn('[Ripple] No server configured. Use BroadcastManager instead.')
      return
    }

    globalRippleServer.broadcast(this._channel, event, data)
  }
}
