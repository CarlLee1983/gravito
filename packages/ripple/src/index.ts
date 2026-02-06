/**
 * @gravito/ripple - Bun-native WebSocket broadcasting for Gravito.
 *
 * Ripple is a high-performance, real-time broadcasting module designed for the Gravito ecosystem.
 * It provides channel-based WebSocket communication (Public, Private, Presence) powered by
 * Bun's native WebSocket implementation for maximum speed and minimal overhead.
 *
 * Key features:
 * - **Bun Native**: Leveraging `Bun.serve({ websocket })` for sub-millisecond latency.
 * - **Channel System**: Built-in support for Public, Private (authenticated), and Presence (user tracking) channels.
 * - **Scalable Drivers**: Includes `LocalDriver` for single-server and `RedisDriver` for horizontal scaling.
 * - **Type-Safe**: Fully typed events and channel management.
 *
 * @example
 * ```typescript
 * // 1. Setup Server
 * import { OrbitRipple } from '@gravito/ripple'
 *
 * core.install(new OrbitRipple({
 *   path: '/ws',
 *   authorizer: async (channel, userId) => {
 *     // Return true/false for private channels
 *     // Return user info object for presence channels
 *     return userId !== undefined
 *   }
 * }))
 *
 * // 2. Define Event
 * import { BroadcastEvent, PrivateChannel } from '@gravito/ripple'
 *
 * class OrderUpdated extends BroadcastEvent {
 *   constructor(public orderId: string, public status: string) { super() }
 *
 *   broadcastOn() {
 *     return new PrivateChannel(`orders.${this.orderId}`)
 *   }
 * }
 *
 * // 3. Broadcast
 * import { broadcast } from '@gravito/ripple'
 *
 * broadcast(new OrderUpdated('123', 'shipped'))
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
export { LocalDriver, RedisDriver } from './drivers'
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
export { RippleMetrics } from './observability/RippleMetrics'
export { RippleServer } from './RippleServer'
export { AckManager } from './reliability/AckManager'
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
