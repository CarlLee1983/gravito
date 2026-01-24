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

export {
  CHANNEL_PREFIXES,
  ChannelManager,
  createChannel,
  PresenceChannel,
  PrivateChannel,
  PublicChannel,
  requiresAuth,
} from './channels'
export { LocalDriver } from './drivers'
export { RippleDriverError, RippleError } from './errors'
export {
  BroadcastEvent,
  Broadcaster,
  BroadcastManager,
  broadcast,
  getRippleServer,
  setRippleServer,
} from './events'
export type { ComponentHealth, HealthCheckResult, HealthStatus } from './health/HealthChecker'
export { HealthChecker } from './health/HealthChecker'
export type { LogContext, LogLevel, RippleLogger } from './logging/Logger'
export { ConsoleLogger, createLogger } from './logging/Logger'
export { OrbitRipple } from './OrbitRipple'
export { RippleServer } from './RippleServer'
export type { ConnectionEvent, ConnectionTracker } from './tracking/ConnectionTracker'
export { DefaultConnectionTracker } from './tracking/ConnectionTracker'
export type {
  BroadcastEventInterface,
  Channel,
  ChannelAuthorizer,
  ChannelType,
  ClientData,
  ClientMessage,
  DriverStatus,
  ErrorServerMessage,
  PresenceUserInfo,
  RippleBunServer,
  RippleConfig,
  RippleDriver,
  RippleErrorCode,
  RippleWebSocket,
  ServerMessage,
  WebSocketHandlerConfig,
} from './types'
export { MessageSerializer } from './utils/MessageSerializer'
