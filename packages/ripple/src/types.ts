/**
 * @fileoverview Core types for @gravito/ripple WebSocket module
 * @module @gravito/ripple
 */

import type { Server, ServerWebSocket } from 'bun'

// ─────────────────────────────────────────────────────────────
// Client Data
// ─────────────────────────────────────────────────────────────

/**
 * Data attached to each WebSocket connection
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
}

// ─────────────────────────────────────────────────────────────
// Channel Types
// ─────────────────────────────────────────────────────────────

/**
 * Supported WebSocket channel types.
 *
 * @public
 * @since 3.0.0
 */
export type ChannelType = 'public' | 'private' | 'presence'

/**
 * Base channel interface
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
 * Channel authorization callback
 */
export type ChannelAuthorizer = (
  channelName: string,
  userId: string | number | undefined,
  socketId: string
) => boolean | Promise<boolean> | PresenceUserInfo | Promise<PresenceUserInfo | false>

/**
 * User info returned for presence channels
 */
export interface PresenceUserInfo {
  id: string | number
  info: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────

/**
 * Broadcast event interface
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
 * Client-to-server message types
 */
export type ClientMessage =
  | { type: 'subscribe'; channel: string; auth?: { socketId: string; signature: string } }
  | { type: 'unsubscribe'; channel: string }
  | { type: 'whisper'; channel: string; event: string; data: unknown }
  | { type: 'ping' }

export type RippleErrorCode =
  | 'UNAUTHORIZED'
  | 'NOT_SUBSCRIBED'
  | 'INVALID_FORMAT'
  | 'DRIVER_NOT_INITIALIZED'
  | 'REDIS_NOT_INSTALLED'
  | 'REDIS_CONNECTION_FAILED'

export interface ErrorServerMessage {
  type: 'error'
  code: RippleErrorCode
  message: string
  channel?: string
}

export type ServerMessage =
  | { type: 'subscribed'; channel: string }
  | { type: 'unsubscribed'; channel: string }
  | { type: 'error'; message: string; channel?: string; code?: RippleErrorCode }
  | { type: 'event'; channel: string; event: string; data: unknown }
  | { type: 'presence'; channel: string; event: 'join' | 'leave' | 'members'; data: unknown }
  | { type: 'pong' }
  | { type: 'connected'; socketId: string }

export interface DriverStatus {
  name: string
  initialized: boolean
  connected: boolean
  lastError?: string
}

export const SERVER_MESSAGE_TYPES = {
  SUBSCRIBED: 'subscribed',
  UNSUBSCRIBED: 'unsubscribed',
  ERROR: 'error',
  EVENT: 'event',
  PRESENCE: 'presence',
  PONG: 'pong',
  CONNECTED: 'connected',
} as const

export const CLIENT_MESSAGE_TYPES = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  WHISPER: 'whisper',
  PING: 'ping',
} as const

// ─────────────────────────────────────────────────────────────
// Driver Interface
// ─────────────────────────────────────────────────────────────

export interface RippleDriver {
  readonly name: string

  publish(channel: string, event: string, data: unknown): Promise<void>

  subscribe?(channel: string, callback: (event: string, data: unknown) => void): Promise<void>

  unsubscribe?(channel: string): Promise<void>

  init?(): Promise<void>

  shutdown?(): Promise<void>

  getStatus?(): DriverStatus
}

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

/**
 * Ripple server configuration
 */
export interface RippleConfig {
  /** WebSocket endpoint path (default: '/ws') */
  path?: string

  /** Authentication endpoint for private/presence channels */
  authEndpoint?: string

  /** Driver to use ('local' | 'redis') */
  driver?: 'local' | 'redis'

  /** Redis configuration (if using redis driver) */
  redis?: {
    host?: string
    port?: number
    password?: string
    db?: number
  }

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
}

// ─────────────────────────────────────────────────────────────
// WebSocket Handler Types (Bun)
// ─────────────────────────────────────────────────────────────

/**
 * Strongly-typed Bun ServerWebSocket for Ripple.
 *
 * @public
 * @since 3.0.0
 */
export type RippleWebSocket = ServerWebSocket<ClientData>

/**
 * Strongly-typed Bun Server for Ripple.
 *
 * @public
 * @since 3.0.0
 */
export type RippleBunServer = Server<ClientData>

/**
 * WebSocket handler configuration for Bun.serve
 */
export interface WebSocketHandlerConfig {
  open: (ws: RippleWebSocket) => void | Promise<void>
  message: (ws: RippleWebSocket, message: string | Buffer) => void | Promise<void>
  close: (ws: RippleWebSocket, code: number, reason: string) => void | Promise<void>
  drain?: (ws: RippleWebSocket) => void
}
