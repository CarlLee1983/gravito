/**
 * @fileoverview Channel Manager for @gravito/ripple
 *
 * Manages channel subscriptions and member tracking.
 *
 * @module @gravito/ripple/channels
 */

import type { ClientData, PresenceUserInfo, RippleWebSocket } from '../types'
import { CHANNEL_PREFIXES } from './Channel'

/**
 * Manages all channel subscriptions and presence tracking
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
   * Register a new client connection
   */
  addClient(ws: RippleWebSocket): void {
    this.clients.set(ws.data.id, ws)
  }

  /**
   * Remove a client and all its subscriptions
   */
  removeClient(clientId: string): string[] {
    const ws = this.clients.get(clientId)
    if (!ws) return []

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
   * Get a client by ID
   */
  getClient(clientId: string): RippleWebSocket | undefined {
    return this.clients.get(clientId)
  }

  /**
   * Get all connected clients
   */
  getAllClients(): RippleWebSocket[] {
    return Array.from(this.clients.values())
  }

  // ─────────────────────────────────────────────────────────────
  // Subscription Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Subscribe a client to a channel
   */
  subscribe(clientId: string, channel: string, userInfo?: PresenceUserInfo): boolean {
    const ws = this.clients.get(clientId)
    if (!ws) return false

    // Add to channel subscriptions
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set())
    }
    this.subscriptions.get(channel)!.add(clientId)

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
   * Unsubscribe a client from a channel
   */
  unsubscribe(clientId: string, channel: string): boolean {
    const ws = this.clients.get(clientId)
    if (!ws) return false

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
   * Get all subscribers of a channel
   */
  getSubscribers(channel: string): RippleWebSocket[] {
    const clientIds = this.subscriptions.get(channel)
    if (!clientIds) return []

    return Array.from(clientIds)
      .map((id) => this.clients.get(id))
      .filter((ws): ws is RippleWebSocket => ws !== undefined)
  }

  /**
   * Check if a client is subscribed to a channel
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
    this.presenceMembers.get(channel)!.set(userInfo.id, userInfo)
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
   * Get all members of a presence channel
   */
  getPresenceMembers(channel: string): PresenceUserInfo[] {
    const members = this.presenceMembers.get(channel)
    return members ? Array.from(members.values()) : []
  }

  /**
   * Get member count for a channel
   */
  getMemberCount(channel: string): number {
    return this.subscriptions.get(channel)?.size ?? 0
  }

  // ─────────────────────────────────────────────────────────────
  // Statistics
  // ─────────────────────────────────────────────────────────────

  /**
   * Get channel statistics
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
