/**
 * @fileoverview @gravito/ripple - Bun-native WebSocket broadcasting
 *
 * Channel-based real-time communication for Gravito applications.
 *
 * @example
 * ```typescript
 * import { OrbitRipple, broadcast, PrivateChannel, BroadcastEvent } from '@gravito/ripple'
 *
 * // Install the module
 * core.install(new OrbitRipple({
 *   path: '/ws',
 *   authorizer: async (channel, userId) => userId !== undefined
 * }))
 *
 * // Define a broadcast event
 * class OrderShipped extends BroadcastEvent {
 *   constructor(public order: Order) { super() }
 *   broadcastOn() { return new PrivateChannel(`orders.${this.order.userId}`) }
 * }
 *
 * // Broadcast from anywhere
 * broadcast(new OrderShipped(order))
 *
 * // Or use the fluent API
 * import { Broadcaster } from '@gravito/ripple'
 * Broadcaster.toPrivate('orders.123').emit('OrderUpdated', { status: 'shipped' })
 * ```
 *
 * @module @gravito/ripple
 */

// Channels
export {
  CHANNEL_PREFIXES,
  ChannelManager,
  createChannel,
  PresenceChannel,
  PrivateChannel,
  PublicChannel,
  requiresAuth,
} from './channels'
// Drivers
export { LocalDriver } from './drivers'
// Events
export { BroadcastEvent, Broadcaster, broadcast, getRippleServer, setRippleServer } from './events'
// Core
export { OrbitRipple } from './OrbitRipple'
export { RippleServer } from './RippleServer'

// Types
export type {
  BroadcastEventInterface,
  Channel,
  ChannelAuthorizer,
  ChannelType,
  ClientData,
  ClientMessage,
  PresenceUserInfo,
  RippleBunServer,
  RippleConfig,
  RippleDriver,
  RippleWebSocket,
  ServerMessage,
  WebSocketHandlerConfig,
} from './types'
