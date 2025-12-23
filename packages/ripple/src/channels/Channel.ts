/**
 * @fileoverview Channel implementations for @gravito/ripple
 * @module @gravito/ripple/channels
 */

import type { Channel, ChannelType } from '../types'

// ─────────────────────────────────────────────────────────────
// Channel Prefixes
// ─────────────────────────────────────────────────────────────

export const CHANNEL_PREFIXES = {
  private: 'private-',
  presence: 'presence-',
} as const

// ─────────────────────────────────────────────────────────────
// Base Channel Class
// ─────────────────────────────────────────────────────────────

/**
 * Abstract base class for channels
 */
abstract class BaseChannel implements Channel {
  abstract readonly type: ChannelType

  constructor(public readonly name: string) {}

  abstract get fullName(): string

  /**
   * Parse a full channel name to extract type and base name
   */
  static parse(fullName: string): { type: ChannelType; name: string } {
    if (fullName.startsWith(CHANNEL_PREFIXES.presence)) {
      return {
        type: 'presence',
        name: fullName.slice(CHANNEL_PREFIXES.presence.length),
      }
    }
    if (fullName.startsWith(CHANNEL_PREFIXES.private)) {
      return {
        type: 'private',
        name: fullName.slice(CHANNEL_PREFIXES.private.length),
      }
    }
    return { type: 'public', name: fullName }
  }

  /**
   * Check if a channel name requires authentication
   */
  static requiresAuth(fullName: string): boolean {
    return (
      fullName.startsWith(CHANNEL_PREFIXES.private) ||
      fullName.startsWith(CHANNEL_PREFIXES.presence)
    )
  }
}

// ─────────────────────────────────────────────────────────────
// Public Channel
// ─────────────────────────────────────────────────────────────

/**
 * Public channel - no authentication required
 *
 * @example
 * ```typescript
 * const channel = new PublicChannel('news')
 * // fullName: 'news'
 * ```
 */
export class PublicChannel extends BaseChannel {
  readonly type = 'public' as const

  get fullName(): string {
    return this.name
  }
}

// ─────────────────────────────────────────────────────────────
// Private Channel
// ─────────────────────────────────────────────────────────────

/**
 * Private channel - requires authentication
 *
 * @example
 * ```typescript
 * const channel = new PrivateChannel('orders.123')
 * // fullName: 'private-orders.123'
 * ```
 */
export class PrivateChannel extends BaseChannel {
  readonly type = 'private' as const

  get fullName(): string {
    return `${CHANNEL_PREFIXES.private}${this.name}`
  }
}

// ─────────────────────────────────────────────────────────────
// Presence Channel
// ─────────────────────────────────────────────────────────────

/**
 * Presence channel - requires authentication, tracks online users
 *
 * @example
 * ```typescript
 * const channel = new PresenceChannel('chat.lobby')
 * // fullName: 'presence-chat.lobby'
 * ```
 */
export class PresenceChannel extends BaseChannel {
  readonly type = 'presence' as const

  get fullName(): string {
    return `${CHANNEL_PREFIXES.presence}${this.name}`
  }
}

// ─────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────

/**
 * Create a channel from a full name
 */
export function createChannel(fullName: string): Channel {
  const { type, name } = BaseChannel.parse(fullName)

  switch (type) {
    case 'presence':
      return new PresenceChannel(name)
    case 'private':
      return new PrivateChannel(name)
    default:
      return new PublicChannel(name)
  }
}

/**
 * Check if channel requires authentication
 */
export const requiresAuth = BaseChannel.requiresAuth
