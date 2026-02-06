/**
 * @fileoverview Core types for @gravito/ripple-client
 * @module @gravito/ripple-client
 */

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

/**
 * Client configuration options
 */
export interface RippleClientConfig {
  /** WebSocket server URL */
  host: string

  /** Authentication endpoint for private/presence channels */
  authEndpoint?: string

  /** Additional headers for auth requests */
  authHeaders?: Record<string, string>

  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean

  /** Reconnect delay in ms (default: 1000) */
  reconnectDelay?: number

  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number

  /** Initial Reconnection token for session recovery (v3.6+) */
  reconnectionToken?: string
}

// ─────────────────────────────────────────────────────────────
// Message Types (must match server)
// ─────────────────────────────────────────────────────────────

/**
 * Client-to-server message types
 */
export type ClientMessage =
  | { type: 'subscribe'; channel: string; auth?: { socketId: string; signature: string } }
  | { type: 'unsubscribe'; channel: string }
  | { type: 'whisper'; channel: string; event: string; data: unknown }
  | { type: 'ping' }
  | { type: 'ack'; seq: number } // v3.7+
  | { type: 'binary'; channel: string; event: string; data: ArrayBuffer; seq?: number }

/**
 * Server-to-client message types
 */
export type ServerMessage =
  | { type: 'subscribed'; channel: string }
  | { type: 'unsubscribed'; channel: string }
  | { type: 'error'; message: string; channel?: string }
  | {
      type: 'event'
      channel: string
      event: string
      data: unknown
      seq?: number
      needAck?: boolean
    }
  | {
      type: 'presence'
      channel: string
      event: 'join' | 'leave' | 'members'
      data: unknown
      seq?: number
      needAck?: boolean
    }
  | { type: 'pong' }
  | { type: 'connected'; socketId: string; reconnectionToken?: string }
  | { type: 'ack_received'; seq: number }
  | {
      type: 'binary'
      channel: string
      event: string
      data: ArrayBuffer
      seq?: number
      needAck?: boolean
    }

// ─────────────────────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────────────────────

/**
 * Channel event map for type-safe event listening.
 *
 * @example
 * ```typescript
 * declare module '@gravito/ripple-client' {
 *   interface ChannelEventMap {
 *     news: {
 *       'ArticlePublished': { title: string }
 *     }
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type ChannelEventMap = {}

/**
 * Event callback type
 */
export type EventCallback<T = unknown> = (data: T) => void

/**
 * Presence user info
 */
export interface PresenceUser {
  id: string | number
  info: Record<string, unknown>
}

/**
 * Presence event callbacks
 */
export interface PresenceCallbacks {
  here?: (users: PresenceUser[]) => void
  joining?: (user: PresenceUser) => void
  leaving?: (user: PresenceUser) => void
}
