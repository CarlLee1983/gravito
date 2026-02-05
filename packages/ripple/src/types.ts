/**
 * @fileoverview Core types for @gravito/ripple WebSocket module
 * @module @gravito/ripple
 */

import type { Server, ServerWebSocket } from 'bun'
import type { NATSDriverConfig } from './drivers/NATSDriver'
import type { RedisDriverConfig } from './drivers/RedisDriver'

// ─────────────────────────────────────────────────────────────
// Client Data
// ─────────────────────────────────────────────────────────────

/**
 * Data attached to each WebSocket connection.
 *
 * Contains client identification, authentication state, channel subscriptions,
 * and presence information. This data is accessed via `ws.data` on any RippleWebSocket.
 *
 * @example
 * ```typescript
 * // Access client data in event handlers
 * const handleMessage = (ws: RippleWebSocket, message: string) => {
 *   console.log('Client ID:', ws.data.id)
 *   console.log('User ID:', ws.data.userId)
 *   console.log('Channels:', Array.from(ws.data.channels))
 * }
 * ```
 */
export interface ClientData {
  /** Unique client identifier */
  id: string
  /** User ID if authenticated */
  userId?: string | number
  /** Channels this client has joined */
  channels: Set<string>
  /** Additional user info for presence channels */
  userInfo?: Record<string, unknown>
  /** Reconnection token for session recovery (v3.6+) */
  reconnectionToken?: string
  /** Session expiry timestamp (v3.6+) */
  sessionExpiry?: number
}

// ─────────────────────────────────────────────────────────────
// Channel Types
// ─────────────────────────────────────────────────────────────

/**
 * Supported WebSocket channel types.
 *
 * - `public`: Open channels accessible to all clients without authentication
 * - `private`: Channels requiring authorization via the authorizer callback
 * - `presence`: Private channels that track online users and their metadata
 *
 * @example
 * ```typescript
 * // Channel type determines the authorization flow
 * const publicChannel: ChannelType = 'public'      // No auth needed
 * const privateChannel: ChannelType = 'private'    // Boolean auth result
 * const presenceChannel: ChannelType = 'presence'  // PresenceUserInfo required
 * ```
 *
 * @public
 * @since 3.0.0
 */
export type ChannelType = 'public' | 'private' | 'presence'

/**
 * Base channel interface representing a WebSocket channel.
 *
 * Channels are the core abstraction for organizing WebSocket communications.
 * Each channel has a type (public/private/presence) and manages subscriptions.
 *
 * @example
 * ```typescript
 * import { PublicChannel, PrivateChannel } from '@gravito/ripple'
 *
 * // Create different channel types
 * const news = new PublicChannel('news')
 * console.log(news.fullName)  // 'news'
 *
 * const orders = new PrivateChannel('orders.123')
 * console.log(orders.fullName)  // 'private-orders.123'
 * ```
 */
export interface Channel {
  /** Channel name (without prefix) */
  readonly name: string
  /** Channel type */
  readonly type: ChannelType
  /** Full channel name with prefix */
  readonly fullName: string
}

/**
 * User information for presence channels.
 *
 * Defines the shape of user data returned by the authorizer for presence channels.
 * This data is shared with all members of the presence channel.
 *
 * @example
 * ```typescript
 * // Return presence user info from authorizer
 * const authorizer: ChannelAuthorizer = async (channel, userId, socketId) => {
 *   if (channel.startsWith('presence-chat.')) {
 *     const user = await db.users.findById(userId)
 *     return {
 *       id: user.id,
 *       info: {
 *         name: user.name,
 *         avatar: user.avatarUrl,
 *         status: 'online'
 *       }
 *     }
 *   }
 *   return true
 * }
 * ```
 */
export interface PresenceUserInfo {
  /** Unique user identifier */
  id: string | number
  /** Additional user metadata shared with channel members */
  info: Record<string, unknown>
}

/**
 * Authorization callback for channel subscriptions.
 *
 * Determines whether a client can subscribe to a given channel. The return value
 * depends on the channel type:
 *
 * - **Public channels**: Always return `true` or omit authorization
 * - **Private channels**: Return `boolean` or `Promise<boolean>`
 * - **Presence channels**: Return `PresenceUserInfo` or `Promise<PresenceUserInfo | false>`
 *
 * @param channelName - Full channel name including prefix (e.g., 'private-orders.123')
 * @param userId - User ID from authenticated session (undefined for unauthenticated)
 * @param socketId - Unique WebSocket connection ID
 * @returns Authorization result:
 *   - `true` = authorized
 *   - `false` = denied
 *   - `PresenceUserInfo` = authorized with user data (presence channels only)
 *
 * @example
 * ```typescript
 * // Example 1: Public channel (no authorization)
 * const publicAuthorizer: ChannelAuthorizer = (channel, userId, socketId) => {
 *   return true  // Allow all
 * }
 *
 * // Example 2: Private channel with simple auth
 * const privateAuthorizer: ChannelAuthorizer = (channel, userId, socketId) => {
 *   if (channel === 'private-admin') {
 *     return userId === 'admin'  // Only admin user
 *   }
 *   return userId !== undefined  // Require authentication
 * }
 *
 * // Example 3: Presence channel with async database lookup
 * const presenceAuthorizer: ChannelAuthorizer = async (channel, userId, socketId) => {
 *   if (channel.startsWith('presence-chat.')) {
 *     if (!userId) return false
 *
 *     const user = await db.users.findById(userId)
 *     if (!user) return false
 *
 *     return {
 *       id: user.id,
 *       info: {
 *         name: user.name,
 *         avatar: user.avatarUrl,
 *         role: user.role
 *       }
 *     }
 *   }
 *
 *   // Default: require authentication
 *   return userId !== undefined
 * }
 *
 * // Example 4: Resource ownership check
 * const ownershipAuthorizer: ChannelAuthorizer = async (channel, userId, socketId) => {
 *   const match = channel.match(/^private-orders\.(\d+)$/)
 *   if (match) {
 *     const orderId = match[1]
 *     const order = await db.orders.findById(orderId)
 *     return order.userId === userId  // Only order owner
 *   }
 *   return false
 * }
 * ```
 */
export type ChannelAuthorizer = (
  channelName: string,
  userId: string | number | undefined,
  socketId: string
) => boolean | PresenceUserInfo | Promise<boolean | PresenceUserInfo>

// ─────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────

/**
 * Interface for broadcast event classes.
 *
 * Implement this interface to create type-safe broadcast events that can be
 * dispatched using the `broadcast()` function or `BroadcastManager`.
 *
 * @see {@link BroadcastEvent} - Abstract base class implementation
 *
 * @example
 * ```typescript
 * import { BroadcastEventInterface, Channel, PrivateChannel } from '@gravito/ripple'
 *
 * class OrderShipped implements BroadcastEventInterface {
 *   constructor(public order: { id: number; userId: number }) {}
 *
 *   broadcastOn(): Channel {
 *     return new PrivateChannel(`orders.${this.order.userId}`)
 *   }
 *
 *   broadcastAs(): string {
 *     return 'OrderShipped'
 *   }
 *
 *   broadcastExcept(): string[] {
 *     return []  // Don't exclude anyone
 *   }
 * }
 * ```
 */
export interface BroadcastEventInterface {
  /** Channels to broadcast to */
  broadcastOn(): Channel | Channel[]
  /** Event name (defaults to class name) */
  broadcastAs?(): string
  /** Exclude specific socket IDs */
  broadcastExcept?(): string[]
}

/**
 * Messages sent from client to server over WebSocket.
 *
 * This discriminated union defines the protocol for client-to-server communication.
 * All messages must have a `type` field for proper routing.
 *
 * @example
 * ```typescript
 * // Subscribe to a channel
 * const subscribeMsg: ClientMessage = {
 *   type: 'subscribe',
 *   channel: 'private-orders.123',
 *   auth: { socketId: 'abc', signature: 'xyz' }
 * }
 *
 * // Unsubscribe from a channel
 * const unsubscribeMsg: ClientMessage = {
 *   type: 'unsubscribe',
 *   channel: 'news'
 * }
 *
 * // Send a whisper (client-to-client event)
 * const whisperMsg: ClientMessage = {
 *   type: 'whisper',
 *   channel: 'presence-chat.lobby',
 *   event: 'typing',
 *   data: { userId: 123, isTyping: true }
 * }
 *
 * // Ping for connection health check
 * const pingMsg: ClientMessage = { type: 'ping' }
 * ```
 */
export type ClientMessage =
  | { type: 'subscribe'; channel: string; auth?: { socketId: string; signature: string } }
  | { type: 'unsubscribe'; channel: string }
  | { type: 'whisper'; channel: string; event: string; data: unknown }
  | { type: 'ping' }
  | { type: 'binary'; channel: string; event: string; data: ArrayBuffer }
  | { type: 'ack'; seq: number } // v3.7+

/**
 * Error codes for Ripple WebSocket protocol.
 *
 * Used in `ErrorServerMessage` to communicate specific failure reasons to clients.
 *
 * @example
 * ```typescript
 * // Send authorization error to client
 * const error: ErrorServerMessage = {
 *   type: 'error',
 *   code: 'UNAUTHORIZED',
 *   message: 'You are not authorized to join this channel',
 *   channel: 'private-orders.123'
 * }
 * ```
 */
export type RippleErrorCode =
  | 'UNAUTHORIZED'
  | 'NOT_SUBSCRIBED'
  | 'INVALID_FORMAT'
  | 'DRIVER_NOT_INITIALIZED'
  | 'REDIS_NOT_INSTALLED'
  | 'REDIS_CONNECTION_FAILED'

/**
 * Error message sent from server to client.
 *
 * Contains a typed error code and human-readable message.
 *
 * @deprecated Use the `ServerMessage` discriminated union instead
 */
export interface ErrorServerMessage {
  type: 'error'
  code: RippleErrorCode
  message: string
  channel?: string
}

/**
 * Messages sent from server to client over WebSocket.
 *
 * This discriminated union defines the protocol for server-to-client communication.
 * Clients should handle messages based on the `type` field.
 *
 * @example
 * ```typescript
 * // Handle incoming server messages
 * ws.onmessage = (event) => {
 *   const message: ServerMessage = JSON.parse(event.data)
 *
 *   switch (message.type) {
 *     case 'connected':
 *       console.log('Connected with socket ID:', message.socketId)
 *       break
 *
 *     case 'subscribed':
 *       console.log('Subscribed to:', message.channel)
 *       break
 *
 *     case 'event':
 *       console.log(`Event "${message.event}" on ${message.channel}:`, message.data)
 *       break
 *
 *     case 'presence':
 *       if (message.event === 'join') {
 *         console.log('User joined:', message.data)
 *       }
 *       break
 *
 *     case 'error':
 *       console.error('Error:', message.message, message.code)
 *       break
 *
 *     case 'pong':
 *       // Heartbeat response
 *       break
 *   }
 * }
 * ```
 */
export type ServerMessage =
  | { type: 'subscribed'; channel: string }
  | { type: 'unsubscribed'; channel: string }
  | { type: 'error'; message: string; channel?: string; code?: RippleErrorCode }
  | {
      type: 'event'
      channel: string
      event: string
      data: unknown
      seq?: number
      needAck?: boolean
    } // seq/needAck v3.7+
  | {
      type: 'presence'
      channel: string
      event: 'join' | 'leave' | 'members'
      data: unknown
      seq?: number
      needAck?: boolean
    } // seq/needAck v3.7+
  | { type: 'pong' }
  | { type: 'connected'; socketId: string }
  | {
      type: 'binary'
      channel: string
      event: string
      data: ArrayBuffer
      seq?: number
      needAck?: boolean
    } // seq/needAck v3.7+
  | { type: 'ack_received'; seq: number } // v3.7+
  | { type: 'reconnection_token'; token: string } // v4.0+

/**
 * Context for Ripple Message Interceptors (v4.0+).
 */
export interface RippleContext {
  /** The WebSocket client connection */
  ws: import('./engines/IRippleEngine').RippleSocket
  /** The message being processed */
  message: ClientMessage | ServerMessage
  /** Direction of the message flow */
  direction: 'incoming' | 'outgoing'
  /** Channel name (optional) */
  channel?: string
  /** Event name (optional) */
  event?: string
}

/**
 * Middleware function for intercepting Ripple messages.
 * Next function must be called to continue the pipeline.
 */
export type RippleInterceptor = (
  ctx: RippleContext,
  next: () => Promise<void>
) => Promise<void> | void

/**
 * Driver health status information.
 *
 * Returned by `RippleDriver.getStatus()` to report the current state of the driver.
 *
 * @example
 * ```typescript
 * const driver = new RedisDriver(config)
 * const status = driver.getStatus()
 *
 * console.log(status.name)          // 'redis'
 * console.log(status.initialized)   // true
 * console.log(status.connected)     // true
 * console.log(status.lastError)     // undefined (or error message if failed)
 * ```
 */
export interface DriverStatus {
  /** Driver name (e.g., 'local', 'redis') */
  name: string
  /** Whether the driver has been initialized */
  initialized: boolean
  /** Whether the driver is currently connected */
  connected: boolean
  /** Last error message if connection failed */
  lastError?: string
}

/**
 * Server message type constants.
 *
 * Use these constants instead of string literals for type safety.
 *
 * @example
 * ```typescript
 * import { SERVER_MESSAGE_TYPES } from '@gravito/ripple'
 *
 * // Type-safe message creation
 * const message = {
 *   type: SERVER_MESSAGE_TYPES.SUBSCRIBED,
 *   channel: 'news'
 * }
 * ```
 */
export const SERVER_MESSAGE_TYPES = {
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
  ERROR: 'error',
  EVENT: 'event',
  PRESENCE: 'presence',
  PONG: 'pong',
  CONNECTED: 'connected',
  BINARY: 'binary',
  RECONNECTION_TOKEN: 'reconnection_token',
} as const

/**
 * Client message type constants.
 *
 * Use these constants instead of string literals for type safety.
 *
 * @example
 * ```typescript
 * import { CLIENT_MESSAGE_TYPES } from '@gravito/ripple'
 *
 * // Type-safe message creation
 * const message = {
 *   type: CLIENT_MESSAGE_TYPES.SUBSCRIBE,
 *   channel: 'private-orders.123'
 * }
 * ```
 */
export const CLIENT_MESSAGE_TYPES = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  WHISPER: 'whisper',
  PING: 'ping',
  BINARY: 'binary',
  ACK: 'ack',
} as const

// ─────────────────────────────────────────────────────────────
// Driver Interface
// ─────────────────────────────────────────────────────────────

/**
 * Interface for implementing custom Ripple drivers.
 *
 * Drivers handle message distribution across server instances. The `local` driver
 * keeps messages in-memory (single server), while the `redis` driver enables
 * horizontal scaling across multiple servers.
 *
 * Implement this interface to create custom drivers (e.g., NATS, RabbitMQ, Kafka).
 *
 * @example
 * ```typescript
 * // Example: Custom NATS driver implementation
 * import type { RedisDriverConfig } from './drivers/RedisDriver'
import type { NATSDriverConfig } from './drivers/NATSDriver'
import type { ComponentHealth } from './health/HealthChecker'
import { connect, NatsConnection, Subscription } from 'nats'
 *
 * export class NatsDriver implements RippleDriver {
 *   readonly name = 'nats'
 *   private connection?: NatsConnection
 *   private subscriptions = new Map<string, Subscription>()
 *   private status: DriverStatus = {
 *     name: 'nats',
 *     initialized: false,
 *     connected: false
 *   }
 *
 *   async init(): Promise<void> {
 *     try {
 *       this.connection = await connect({ servers: 'nats://localhost:4222' })
 *       this.status.initialized = true
 *       this.status.connected = true
 *     } catch (error) {
 *       this.status.lastError = error.message
 *       throw error
 *     }
 *   }
 *
 *   async publish(channel: string, event: string, data: unknown): Promise<void> {
 *     const payload = JSON.stringify({ event, data })
 *     await this.connection?.publish(`ripple.${channel}`, payload)
 *   }
 *
 *   async subscribe(channel: string, callback: (event: string, data: unknown) => void): Promise<void> {
 *     const sub = this.connection?.subscribe(`ripple.${channel}`)
 *     this.subscriptions.set(channel, sub!)
 *
 *     for await (const msg of sub!) {
 *       const { event, data } = JSON.parse(msg.data.toString())
 *       callback(event, data)
 *     }
 *   }
 *
 *   async unsubscribe(channel: string): Promise<void> {
 *     const sub = this.subscriptions.get(channel)
 *     if (sub) {
 *       await sub.unsubscribe()
 *       this.subscriptions.delete(channel)
 *     }
 *   }
 *
 *   async shutdown(): Promise<void> {
 *     await this.connection?.close()
 *     this.status.connected = false
 *   }
 *
 *   getStatus(): DriverStatus {
 *     return this.status
 *   }
 * }
 * ```
 */
export interface RippleDriver {
  /** Driver name (e.g., 'local', 'redis', 'nats') */
  readonly name: string

  /**
   * Publish a message to a channel.
   *
   * @param channel - Channel name to publish to
   * @param event - Event name
   * @param data - Event payload
   */
  publish(channel: string, event: string, data: unknown): Promise<void>

  /**
   * Subscribe to a channel for incoming messages (optional).
   *
   * For multi-server setups, implement this to receive messages from other servers.
   * The local driver doesn't need this since messages are in-memory.
   *
   * @param channel - Channel name to subscribe to
   * @param callback - Called when a message is received
   */
  subscribe?(channel: string, callback: (event: string, data: unknown) => void): Promise<void>

  /**
   * Unsubscribe from a channel (optional).
   *
   * @param channel - Channel name to unsubscribe from
   */
  unsubscribe?(channel: string): Promise<void>

  /**
   * Initialize the driver (optional).
   *
   * Called when RippleServer starts. Use this to establish connections,
   * initialize resources, etc.
   */
  init?(): Promise<void>

  /**
   * Shutdown the driver (optional).
   *
   * Called when RippleServer shuts down. Clean up connections and resources here.
   */
  shutdown?(): Promise<void>

  /**
   * Get current driver status (optional).
   *
   * @returns Current driver status
   */
  getStatus?(): DriverStatus

  /**
   * Track a presence member in a channel (optional).
   *
   * For distributed drivers like Redis, this stores presence information
   * in a shared backend so all server instances can see the same members.
   *
   * @param channel - Presence channel name
   * @param userInfo - User information to track
   * @since 3.6.0
   */
  trackPresence?(channel: string, userInfo: PresenceUserInfo): Promise<void>

  /**
   * Remove a presence member from a channel (optional).
   *
   * @param channel - Presence channel name
   * @param userId - User ID to remove
   * @since 3.6.0
   */
  untrackPresence?(channel: string, userId: string | number): Promise<void>

  /**
   * Get all presence members for a channel (optional).
   *
   * For distributed drivers, this retrieves members from the shared backend.
   *
   * @param channel - Presence channel name
   * @returns Array of presence user information
   * @since 3.6.0
   */
  getPresenceMembers?(channel: string): Promise<PresenceUserInfo[]>
}

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

/**
 * Ripple server configuration.
 *
 * Configures WebSocket behavior, authentication, drivers, and observability.
 *
 * @example
 * ```typescript
 * // Example 1: Basic setup with local driver (single server)
 * const config: RippleConfig = {
 *   path: '/ws',
 *   authorizer: async (channel, userId, socketId) => {
 *     if (channel.startsWith('private-')) {
 *       return userId !== undefined
 *     }
 *     return true
 *   }
 * }
 *
 * // Example 2: Production setup with Redis driver (multi-server)
 * const config: RippleConfig = {
 *   path: '/realtime',
 *   driver: 'redis',
 *   redis: {
 *     host: process.env.REDIS_HOST || 'localhost',
 *     port: 6379,
 *     password: process.env.REDIS_PASSWORD,
 *     db: 0
 *   },
 *   authorizer: async (channel, userId, socketId) => {
 *     if (channel.startsWith('presence-')) {
 *       if (!userId) return false
 *       const user = await db.users.findById(userId)
 *       return {
 *         id: user.id,
 *         info: { name: user.name, avatar: user.avatarUrl }
 *       }
 *     }
 *     return userId !== undefined
 *   },
 *   pingInterval: 30000,
 *   logLevel: 'info'
 * }
 *
 * // Example 3: Custom logger and health check
 * import { RippleLogger } from '@gravito/ripple'
 *
 * const customLogger: RippleLogger = {
 *   debug: (message, context) => console.debug(message, context),
 *   info: (message, context) => console.info(message, context),
 *   warn: (message, context) => console.warn(message, context),
 *   error: (message, context) => console.error(message, context)
 * }
 *
 * const config: RippleConfig = {
 *   logger: customLogger,
 *   logLevel: 'debug',
 *   healthCheck: {
 *     enabled: true,
 *     path: '/health'
 *   }
 * }
 *
 * // Example 4: Connection tracking
 * import { ConnectionTracker } from '@gravito/ripple'
 *
 * const tracker = new ConnectionTracker()
 * const config: RippleConfig = {
 *   connectionTracker: tracker
 * }
 *
 * // Later: query connection stats
 * const stats = tracker.getStats()
 * console.log('Total connections:', stats.totalConnections)
 * console.log('Active connections:', stats.activeConnections)
 * ```
 */
export interface RippleConfig {
  /** WebSocket endpoint path (default: '/ws') */
  path?: string

  /** Authentication endpoint for private/presence channels */
  authEndpoint?: string

  /** Driver to use for scaling ('local' | 'redis' | 'nats') */
  driver?: 'local' | 'redis' | 'nats'

  /** Configuration for Redis driver */
  redis?: RedisDriverConfig

  /** Configuration for NATS driver (v4.0+) */
  nats?: NATSDriverConfig

  /** Channel authorizer function */
  authorizer?: ChannelAuthorizer

  /** Ping interval in milliseconds (default: 30000) */
  pingInterval?: number

  /** Custom logger */
  logger?: import('./logging/Logger').RippleLogger

  /** Log level */
  logLevel?: import('./logging/Logger').LogLevel

  /** Connection tracker */
  connectionTracker?: import('./tracking/ConnectionTracker').ConnectionTracker

  /** Health check configuration */
  healthCheck?: {
    enabled: boolean
    path?: string
  }

  /**
   * Rate limiting configuration.
   */
  rateLimit?: {
    /** Max whispers per interval */
    whisperMax?: number
    /** Interval in milliseconds for whisper limit (default: 1000) */
    whisperInterval?: number
  }

  /**
   * Reconnection configuration (v3.6+).
   */
  reconnection?: {
    /** Enable server-assisted reconnection (default: false) */
    enabled?: boolean
    /** Session TTL in milliseconds (default: 60000 = 1 minute) */
    sessionTTL?: number
    /** Maximum number of stored sessions (default: 10000) */
    maxSessions?: number
  }

  /**
   * Serializer to use for messages (default: 'json').
   * 'protobuf' requires 'protobufjs' peer dependency.
   */
  serializer?: 'json' | 'protobuf'

  /**
   * Performance & Backpressure (v3.7+).
   */
  backpressure?: {
    /** High Water Mark in bytes. Force disconnect if reached. (default: 5,242,880 = 5MB) */
    hwmHigh?: number
    /** Low Water Mark in bytes. Skip non-critical events if reached. (default: 1,048,576 = 1MB) */
    hwmLow?: number
    /** Whether to enable automatic slow client isolation (default: false) */
    enabled?: boolean
  }

  /**
   * Prometheus Metrics (v3.7+).
   */
  metrics?: {
    /** Enable Prometheus metrics (default: false) */
    enabled?: boolean
    /** Metric name prefix (default: 'ripple') */
    prefix?: string
  }

  /**
   * Message Interceptors (v4.0+).
   */
  interceptors?: RippleInterceptor[]

  /**
   * WebSocket runtime/engine to use (v5.0+).
   *
   * - 'bun': Bun native WebSocket (default, highest performance)
   * - 'node-uws': uWebSockets.js for Node.js (high performance, requires peer dep)
   * - 'node-ws': ws package for Node.js (standard, best compatibility)
   *
   * If not specified, Ripple will auto-detect the runtime.
   *
   * @since 5.0.0
   */
  runtime?: 'bun' | 'node-uws' | 'node-ws'

  /**
   * Server port to listen on (v5.0+).
   *
   * Required when using the engine-based architecture.
   *
   * @since 5.0.0
   */
  port?: number

  /**
   * Hostname to bind to (v5.0+).
   *
   * @default '0.0.0.0'
   * @since 5.0.0
   */
  hostname?: string
}

// ─────────────────────────────────────────────────────────────
// WebSocket Handler Types (Bun)
// ─────────────────────────────────────────────────────────────

/**
 * Strongly-typed Bun ServerWebSocket for Ripple.
 *
 * This type adds `ClientData` to Bun's native `ServerWebSocket`, providing
 * type-safe access to client ID, user ID, and channel subscriptions.
 *
 * @example
 * ```typescript
 * import { RippleWebSocket } from '@gravito/ripple'
 *
 * const handleMessage = (ws: RippleWebSocket, message: string) => {
 *   // Type-safe access to client data
 *   console.log('Client ID:', ws.data.id)
 *   console.log('User ID:', ws.data.userId)
 *   console.log('Channels:', Array.from(ws.data.channels))
 *
 *   // Standard Bun WebSocket methods
 *   ws.send('Message received')
 *   ws.close()
 * }
 * ```
 *
 * @public
 * @since 3.0.0
 */
export type RippleWebSocket = ServerWebSocket<ClientData>

/**
 * Strongly-typed Bun Server for Ripple.
 *
 * This type ensures the Bun server is configured with `ClientData` for WebSocket handling.
 *
 * @example
 * ```typescript
 * import { RippleBunServer } from '@gravito/ripple'
 *
 * let server: RippleBunServer
 *
 * server = Bun.serve({
 *   port: 3000,
 *   fetch: (req, server) => {
 *     if (ripple.upgrade(req, server)) return
 *     return new Response('Not found', { status: 404 })
 *   },
 *   websocket: ripple.getHandler()
 * })
 *
 * // Later: graceful shutdown
 * server.stop()
 * ```
 *
 * @public
 * @since 3.0.0
 */
export type RippleBunServer = Server<ClientData>

/**
 * WebSocket handler configuration for Bun.serve.
 *
 * Defines the WebSocket lifecycle event handlers that Bun expects.
 * RippleServer implements this interface internally.
 *
 * @example
 * ```typescript
 * import { WebSocketHandlerConfig, RippleWebSocket } from '@gravito/ripple'
 *
 * // Custom WebSocket handler (usually handled by RippleServer)
 * const handler: WebSocketHandlerConfig = {
 *   open: (ws: RippleWebSocket) => {
 *     console.log('Client connected:', ws.data.id)
 *   },
 *
 *   message: (ws: RippleWebSocket, message: string | Buffer) => {
 *     console.log('Received:', message)
 *   },
 *
 *   close: (ws: RippleWebSocket, code: number, reason: string) => {
 *     console.log('Client disconnected:', code, reason)
 *   },
 *
 *   drain: (ws: RippleWebSocket) => {
 *     console.log('Backpressure drained')
 *   }
 * }
 *
 * // Pass to Bun.serve
 * Bun.serve({
 *   websocket: handler
 * })
 * ```
 */
export interface WebSocketHandlerConfig {
  open: (ws: RippleWebSocket) => void | Promise<void>
  message: (ws: RippleWebSocket, message: string | Buffer) => void | Promise<void>
  close: (ws: RippleWebSocket, code: number, reason: string) => void | Promise<void>
  drain?: (ws: RippleWebSocket) => void
}
