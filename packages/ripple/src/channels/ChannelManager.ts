/**
 * @fileoverview Channel Manager for @gravito/ripple
 *
 * Manages channel subscriptions and member tracking.
 *
 * @module @gravito/ripple/channels
 */

import type { PresenceUserInfo, RippleWebSocket } from '../types'
import { CHANNEL_PREFIXES } from './Channel'

/**
 * Manages all channel subscriptions and presence tracking.
 *
 * The ChannelManager is the central coordinator for WebSocket channel subscriptions.
 * It maintains mappings between clients, channels, and presence information, providing
 * efficient lookups for broadcasting and presence tracking.
 *
 * **Internal Use**: This class is primarily used internally by RippleServer. Most developers
 * interact with channels through RippleServer's public API instead.
 *
 * @example
 * ```typescript
 * // Typically used internally by RippleServer
 * const manager = new ChannelManager()
 *
 * // Add a client when they connect
 * manager.addClient(ws)
 *
 * // Subscribe them to a channel
 * manager.subscribe(ws.data.id, 'news')
 *
 * // Get all subscribers for broadcasting
 * const subscribers = manager.getSubscribers('news')
 * subscribers.forEach(ws => ws.send(message))
 *
 * // For presence channels with user info
 * manager.subscribe(ws.data.id, 'presence-chat.room1', {
 *   id: 'user-123',
 *   info: { name: 'John Doe', avatar: '/avatars/john.jpg' }
 * })
 * const members = manager.getPresenceMembers('presence-chat.room1')
 * ```
 */
export class ChannelManager {
  /** Map of channel name -> Set of client IDs */
  private subscriptions = new Map<string, Set<string>>()

  /** Map of client ID -> WebSocket */
  private clients = new Map<string, RippleWebSocket>()

  /** Map of presence channel -> Map of user ID -> user info */
  private presenceMembers = new Map<string, Map<string | number, PresenceUserInfo>>()

  // ─────────────────────────────────────────────────────────────
  // Client Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Register a new client WebSocket connection.
   *
   * Adds the client to the internal clients map, making it available for channel subscriptions
   * and broadcasts. This should be called immediately when a WebSocket connection is established.
   *
   * @param ws - The WebSocket connection with client data
   *
   * @example
   * ```typescript
   * // Called internally by RippleServer on connection
   * private handleOpen(ws: RippleWebSocket): void {
   *   this.channels.addClient(ws)
   *   // ... other connection logic
   * }
   * ```
   */
  addClient(ws: RippleWebSocket): void {
    this.clients.set(ws.data.id, ws)
  }

  /**
   * Remove a client and unsubscribe from all channels.
   *
   * Performs cleanup when a client disconnects, removing them from all channel subscriptions
   * and the client registry. Returns the list of channels the client was subscribed to,
   * useful for sending presence leave events.
   *
   * @param clientId - The unique client identifier (ws.data.id)
   * @returns Array of channel names the client was subscribed to before removal
   *
   * @example
   * ```typescript
   * // Called internally by RippleServer on disconnect
   * private handleClose(ws: RippleWebSocket): void {
   *   const leftChannels = this.channels.removeClient(ws.data.id)
   *
   *   // Notify presence channels about user leaving
   *   for (const channel of leftChannels) {
   *     if (channel.startsWith('presence-')) {
   *       this.broadcast(channel, 'presence', { event: 'leave', data: ... })
   *     }
   *   }
   * }
   * ```
   */
  removeClient(clientId: string): string[] {
    const ws = this.clients.get(clientId)
    if (!ws) {
      return []
    }

    const leftChannels: string[] = []

    // Unsubscribe from all channels
    for (const channel of ws.data.channels) {
      this.unsubscribe(clientId, channel)
      leftChannels.push(channel)
    }

    this.clients.delete(clientId)
    return leftChannels
  }

  /**
   * Get a client WebSocket by ID.
   *
   * @param clientId - The client identifier
   * @returns The WebSocket connection, or undefined if not found
   */
  getClient(clientId: string): RippleWebSocket | undefined {
    return this.clients.get(clientId)
  }

  /**
   * Get all currently connected WebSocket clients.
   *
   * @returns Array of all connected WebSocket instances
   */
  getAllClients(): RippleWebSocket[] {
    return Array.from(this.clients.values())
  }

  // ─────────────────────────────────────────────────────────────
  // Subscription Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Subscribe a client to a channel.
   *
   * @param clientId - The client identifier
   * @param channel - The channel name
   * @param userInfo - User information for presence channels (required for presence-* channels)
   * @returns true if subscription succeeded, false if client not found
   */
  subscribe(clientId: string, channel: string, userInfo?: PresenceUserInfo): boolean {
    const ws = this.clients.get(clientId)
    if (!ws) {
      return false
    }

    // Add to channel subscriptions
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set())
    }
    this.subscriptions.get(channel)?.add(clientId)

    // Track in client's channel set
    ws.data.channels.add(channel)

    // Handle presence channel
    if (channel.startsWith(CHANNEL_PREFIXES.presence) && userInfo) {
      this.addPresenceMember(channel, userInfo)
      ws.data.userId = userInfo.id
      ws.data.userInfo = userInfo.info
    }

    return true
  }

  /**
   * Unsubscribe a client from a channel.
   *
   * @param clientId - The client identifier
   * @param channel - The channel name
   * @returns true if unsubscription succeeded, false if client not found
   */
  unsubscribe(clientId: string, channel: string): boolean {
    const ws = this.clients.get(clientId)
    if (!ws) {
      return false
    }

    // Remove from channel subscriptions
    const channelSubs = this.subscriptions.get(channel)
    if (channelSubs) {
      channelSubs.delete(clientId)
      if (channelSubs.size === 0) {
        this.subscriptions.delete(channel)
      }
    }

    // Remove from client's channel set
    ws.data.channels.delete(channel)

    // Handle presence channel
    if (channel.startsWith(CHANNEL_PREFIXES.presence) && ws.data.userId) {
      this.removePresenceMember(channel, ws.data.userId)
    }

    return true
  }

  /**
   * Get all WebSocket subscribers of a channel.
   *
   * @param channel - The channel name
   * @returns Array of WebSocket connections subscribed to the channel
   */
  getSubscribers(channel: string): RippleWebSocket[] {
    const clientIds = this.subscriptions.get(channel)
    if (!clientIds) {
      return []
    }

    return Array.from(clientIds)
      .map((id) => this.clients.get(id))
      .filter((ws): ws is RippleWebSocket => ws !== undefined)
  }

  /**
   * Check if a client is subscribed to a channel.
   *
   * @param clientId - The client identifier
   * @param channel - The channel name
   * @returns true if subscribed, false otherwise
   */
  isSubscribed(clientId: string, channel: string): boolean {
    const channelSubs = this.subscriptions.get(channel)
    return channelSubs?.has(clientId) ?? false
  }

  // ─────────────────────────────────────────────────────────────
  // Presence Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Add a member to a presence channel
   */
  private addPresenceMember(channel: string, userInfo: PresenceUserInfo): void {
    if (!this.presenceMembers.has(channel)) {
      this.presenceMembers.set(channel, new Map())
    }
    this.presenceMembers.get(channel)?.set(userInfo.id, userInfo)
  }

  /**
   * Remove a member from a presence channel
   */
  private removePresenceMember(channel: string, userId: string | number): void {
    const members = this.presenceMembers.get(channel)
    if (members) {
      members.delete(userId)
      if (members.size === 0) {
        this.presenceMembers.delete(channel)
      }
    }
  }

  /**
   * Get all members of a presence channel.
   *
   * @param channel - The presence channel name
   * @returns Array of user information for all members in the channel
   */
  getPresenceMembers(channel: string): PresenceUserInfo[] {
    const members = this.presenceMembers.get(channel)
    return members ? Array.from(members.values()) : []
  }

  /**
   * Get subscriber count for a channel.
   *
   * @param channel - The channel name
   * @returns Number of clients subscribed to the channel
   */
  getMemberCount(channel: string): number {
    return this.subscriptions.get(channel)?.size ?? 0
  }

  // ─────────────────────────────────────────────────────────────
  // Statistics
  // ─────────────────────────────────────────────────────────────

  /**
   * Get comprehensive channel statistics.
   *
   * @returns Statistics object containing total clients, channels, and per-channel subscriber counts
   */
  getStats(): {
    totalClients: number
    totalChannels: number
    channels: { name: string; subscribers: number }[]
  } {
    return {
      totalClients: this.clients.size,
      totalChannels: this.subscriptions.size,
      channels: Array.from(this.subscriptions.entries()).map(([name, subs]) => ({
        name,
        subscribers: subs.size,
      })),
    }
  }
}
