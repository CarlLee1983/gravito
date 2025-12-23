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

/**
 * Server-to-client message types
 */
export type ServerMessage =
  | { type: 'subscribed'; channel: string }
  | { type: 'unsubscribed'; channel: string }
  | { type: 'error'; message: string; channel?: string }
  | { type: 'event'; channel: string; event: string; data: unknown }
  | { type: 'presence'; channel: string; event: 'join' | 'leave' | 'members'; data: unknown }
  | { type: 'pong' }
  | { type: 'connected'; socketId: string }

// ─────────────────────────────────────────────────────────────
// Driver Interface
// ─────────────────────────────────────────────────────────────

/**
 * Driver interface for pub/sub backends
 */
export interface RippleDriver {
  /** Driver name */
  readonly name: string

  /**
   * Publish a message to a channel
   */
  publish(channel: string, event: string, data: unknown): Promise<void>

  /**
   * Subscribe to channel messages (for Redis driver)
   */
  subscribe?(channel: string, callback: (event: string, data: unknown) => void): Promise<void>

  /**
   * Unsubscribe from a channel
   */
  unsubscribe?(channel: string): Promise<void>

  /**
   * Initialize the driver
   */
  init?(): Promise<void>

  /**
   * Shutdown the driver
   */
  shutdown?(): Promise<void>
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
}

// ─────────────────────────────────────────────────────────────
// WebSocket Handler Types (Bun)
// ─────────────────────────────────────────────────────────────

export type RippleWebSocket = ServerWebSocket<ClientData>
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
