/**
 * @fileoverview Ripple WebSocket Server
 *
 * Core WebSocket server implementation using Bun's native WebSocket API.
 *
 * @module @gravito/ripple
 */

import type { Server } from 'bun'
import { ChannelManager, requiresAuth } from './channels'
import { LocalDriver } from './drivers'
import type {
  ChannelAuthorizer,
  ClientData,
  ClientMessage,
  RippleConfig,
  RippleDriver,
  RippleWebSocket,
  ServerMessage,
  WebSocketHandlerConfig,
} from './types'

/**
 * Ripple WebSocket Server
 *
 * Provides channel-based real-time communication using Bun's native WebSocket.
 *
 * @example
 * ```typescript
 * const ripple = new RippleServer({
 *   path: '/ws',
 *   authorizer: async (channel, userId) => {
 *     // Custom authorization logic
 *     return true
 *   }
 * })
 *
 * Bun.serve({
 *   fetch: (req, server) => {
 *     if (ripple.upgrade(req, server)) return
 *     return new Response('Not found', { status: 404 })
 *   },
 *   websocket: ripple.getHandler()
 * })
 * ```
 */
export class RippleServer {
  private channels: ChannelManager
  private driver: RippleDriver
  private authorizer?: ChannelAuthorizer
  private pingInterval?: Timer

  readonly config: Required<Pick<RippleConfig, 'path' | 'authEndpoint' | 'pingInterval'>> &
    RippleConfig

  constructor(config: RippleConfig = {}) {
    this.config = {
      path: '/ws',
      authEndpoint: '/broadcasting/auth',
      pingInterval: 30000,
      ...config,
    }

    this.channels = new ChannelManager()
    this.driver = config.driver === 'redis' ? new LocalDriver() : new LocalDriver() // TODO: RedisDriver
    this.authorizer = config.authorizer
  }

  // ─────────────────────────────────────────────────────────────
  // Bun.serve Integration
  // ─────────────────────────────────────────────────────────────

  /**
   * Attempt to upgrade an HTTP request to WebSocket.
   *
   * @param req - The HTTP request.
   * @param server - The Bun server instance.
   * @returns True if the request was upgraded, false otherwise.
   */
  upgrade(req: Request, server: Server<ClientData>): boolean {
    const url = new URL(req.url)

    if (url.pathname !== this.config.path) {
      return false
    }

    const success = server.upgrade(req, {
      data: {
        id: crypto.randomUUID(),
        channels: new Set<string>(),
      } satisfies ClientData,
    })

    return success
  }

  /**
   * Get WebSocket handler configuration for Bun.serve.
   *
   * @returns An object containing the WebSocket event handlers.
   */
  getHandler(): WebSocketHandlerConfig {
    return {
      open: (ws) => this.handleOpen(ws),
      message: (ws, message) => this.handleMessage(ws, message),
      close: (ws, code, reason) => this.handleClose(ws, code, reason),
      drain: (ws) => this.handleDrain(ws),
    }
  }

  // ─────────────────────────────────────────────────────────────
  // WebSocket Event Handlers
  // ─────────────────────────────────────────────────────────────

  private handleOpen(ws: RippleWebSocket): void {
    this.channels.addClient(ws)

    // Send connection confirmation with socket ID
    this.send(ws, {
      type: 'connected',
      socketId: ws.data.id,
    })
  }

  private async handleMessage(ws: RippleWebSocket, message: string | Buffer): Promise<void> {
    try {
      const data: ClientMessage = JSON.parse(message.toString())

      switch (data.type) {
        case 'subscribe':
          await this.handleSubscribe(ws, data.channel, data.auth)
          break

        case 'unsubscribe':
          this.handleUnsubscribe(ws, data.channel)
          break

        case 'whisper':
          this.handleWhisper(ws, data.channel, data.event, data.data)
          break

        case 'ping':
          this.send(ws, { type: 'pong' })
          break
      }
    } catch (error) {
      this.send(ws, {
        type: 'error',
        message: error instanceof Error ? error.message : 'Invalid message',
      })
    }
  }

  private handleClose(ws: RippleWebSocket, _code: number, _reason: string): void {
    const leftChannels = this.channels.removeClient(ws.data.id)

    // Notify presence channels about user leaving
    for (const channel of leftChannels) {
      if (channel.startsWith('presence-') && ws.data.userId) {
        this.broadcastToChannel(channel, 'presence', {
          event: 'leave',
          data: {
            id: ws.data.userId,
            info: ws.data.userInfo,
          },
        })
      }
    }
  }

  private handleDrain(_ws: RippleWebSocket): void {
    // Called when backpressure is relieved
    // Currently no-op, but useful for flow control
  }

  // ─────────────────────────────────────────────────────────────
  // Subscription Handlers
  // ─────────────────────────────────────────────────────────────

  private async handleSubscribe(
    ws: RippleWebSocket,
    channel: string,
    _auth?: { socketId: string; signature: string }
  ): Promise<void> {
    // Check if channel requires authentication
    if (requiresAuth(channel)) {
      if (!this.authorizer) {
        this.send(ws, {
          type: 'error',
          message: 'No authorizer configured for private channels',
          channel,
        })
        return
      }

      const result = await this.authorizer(channel, ws.data.userId, ws.data.id)

      if (result === false) {
        this.send(ws, {
          type: 'error',
          message: 'Unauthorized',
          channel,
        })
        return
      }

      // For presence channels, result contains user info
      if (typeof result === 'object' && 'id' in result) {
        this.channels.subscribe(ws.data.id, channel, result)

        // Notify other members about join
        this.broadcastToChannel(
          channel,
          'presence',
          {
            event: 'join',
            data: result,
          },
          ws.data.id
        )

        // Send current members to new subscriber
        this.send(ws, {
          type: 'presence',
          channel,
          event: 'members',
          data: this.channels.getPresenceMembers(channel),
        })
      } else {
        this.channels.subscribe(ws.data.id, channel)
      }
    } else {
      this.channels.subscribe(ws.data.id, channel)
    }

    this.send(ws, { type: 'subscribed', channel })
  }

  private handleUnsubscribe(ws: RippleWebSocket, channel: string): void {
    // Notify presence channel before leaving
    if (channel.startsWith('presence-') && ws.data.userId) {
      this.broadcastToChannel(
        channel,
        'presence',
        {
          event: 'leave',
          data: {
            id: ws.data.userId,
            info: ws.data.userInfo,
          },
        },
        ws.data.id
      )
    }

    this.channels.unsubscribe(ws.data.id, channel)
    this.send(ws, { type: 'unsubscribed', channel })
  }

  private handleWhisper(ws: RippleWebSocket, channel: string, event: string, data: unknown): void {
    // Whispers are client-to-client messages, excluding sender
    if (!this.channels.isSubscribed(ws.data.id, channel)) {
      this.send(ws, {
        type: 'error',
        message: 'Not subscribed to channel',
        channel,
      })
      return
    }

    this.broadcastToChannel(channel, event, data, ws.data.id)
  }

  // ─────────────────────────────────────────────────────────────
  // Broadcasting
  // ─────────────────────────────────────────────────────────────

  /**
   * Broadcast an event to a channel.
   *
   * @param channel - The channel name.
   * @param event - The event name.
   * @param data - The event data.
   */
  broadcast(channel: string, event: string, data: unknown): void {
    this.broadcastToChannel(channel, event, data)
  }

  /**
   * Broadcast to specific client IDs.
   *
   * @param clientIds - An array of client IDs.
   * @param event - The event name.
   * @param data - The event data.
   */
  broadcastToClients(clientIds: string[], event: string, data: unknown): void {
    for (const clientId of clientIds) {
      const ws = this.channels.getClient(clientId)
      if (ws) {
        this.send(ws, {
          type: 'event',
          channel: '',
          event,
          data,
        })
      }
    }
  }

  private broadcastToChannel(
    channel: string,
    event: string,
    data: unknown,
    excludeClientId?: string
  ): void {
    const subscribers = this.channels.getSubscribers(channel)

    for (const ws of subscribers) {
      if (excludeClientId && ws.data.id === excludeClientId) {
        continue
      }

      if (event === 'presence') {
        this.send(ws, {
          type: 'presence',
          channel,
          event: (data as { event: 'join' | 'leave' | 'members' }).event,
          data: (data as { data: unknown }).data,
        })
      } else {
        this.send(ws, {
          type: 'event',
          channel,
          event,
          data,
        })
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────

  private send(ws: RippleWebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message))
    } catch {
      // Connection might be closed
    }
  }

  /**
   * Get server statistics.
   *
   * @returns An object containing connection and channel statistics.
   */
  getStats() {
    return this.channels.getStats()
  }

  /**
   * Initialize the server.
   *
   * Initializes the driver and starts the ping interval.
   *
   * @returns A promise that resolves when initialization is complete.
   */
  async init(): Promise<void> {
    await this.driver.init?.()

    // Start ping interval
    if (this.config.pingInterval > 0) {
      this.pingInterval = setInterval(() => {
        for (const ws of this.channels.getAllClients()) {
          this.send(ws, { type: 'pong' })
        }
      }, this.config.pingInterval)
    }
  }

  /**
   * Shutdown the server.
   *
   * Clears the ping interval and shuts down the driver.
   *
   * @returns A promise that resolves when shutdown is complete.
   */
  async shutdown(): Promise<void> {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }
    await this.driver.shutdown?.()
  }
}
