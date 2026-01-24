/**
 * @fileoverview Ripple WebSocket Server
 *
 * Core WebSocket server implementation using Bun's native WebSocket API.
 *
 * @module @gravito/ripple
 */

import type { Server } from 'bun'
import { ChannelManager, requiresAuth } from './channels'
import { LocalDriver, RedisDriver } from './drivers'
import { HealthChecker } from './health/HealthChecker'
import type { RippleLogger } from './logging/Logger'
import { createLogger } from './logging/Logger'
import type { ConnectionTracker } from './tracking/ConnectionTracker'
import { DefaultConnectionTracker } from './tracking/ConnectionTracker'
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
import { MessageSerializer } from './utils/MessageSerializer'

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
  private pingInterval?: ReturnType<typeof setInterval>
  private eventListeners: Map<string, ((socket: RippleWebSocket, data: any) => void)[]> = new Map()
  private logger: RippleLogger
  private tracker: ConnectionTracker
  private healthChecker: HealthChecker
  private serializer: MessageSerializer

  readonly config: Required<Pick<RippleConfig, 'path' | 'authEndpoint' | 'pingInterval'>> &
    RippleConfig

  constructor(config: RippleConfig = {}) {
    this.config = {
      path: '/ws',
      authEndpoint: '/broadcasting/auth',
      pingInterval: 30000,
      ...config,
    }

    this.logger = config.logger ?? createLogger('RippleServer', config.logLevel)
    this.channels = new ChannelManager()
    this.driver =
      config.driver === 'redis'
        ? new RedisDriver({ ...config.redis, logger: this.logger })
        : new LocalDriver()
    this.authorizer = config.authorizer
    this.tracker = config.connectionTracker ?? new DefaultConnectionTracker(this.logger)
    this.healthChecker = new HealthChecker(this, this.driver)
    this.serializer = new MessageSerializer()
  }

  /**
   * Register an event listener for client messages.
   *
   * @param event - The event name to listen for.
   * @param handler - The callback function.
   */
  on(event: string, handler: (socket: RippleWebSocket, data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)?.push(handler)
  }

  /**
   * Fluent API for broadcasting to a channel.
   *
   * @param channel - The channel name.
   */
  to(channel: string) {
    return {
      emit: (event: string, data: unknown) => this.broadcast(channel, event, data),
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Bun.serve Integration
  // ─────────────────────────────────────────────────────────────

  /**
   * Attempt to upgrade an HTTP request to WebSocket.
   *
   * @param req - The HTTP request.
   * @param server - The Bun server instance.
   * @param options - Optional upgrade options (userId for authenticated connections).
   * @returns True if the request was upgraded, false otherwise.
   */
  upgrade(req: Request, server: Server<ClientData>, options?: { userId?: string }): boolean {
    const url = new URL(req.url)

    if (url.pathname !== this.config.path) {
      return false
    }

    const success = server.upgrade(req, {
      data: {
        id: crypto.randomUUID(),
        channels: new Set<string>(),
        userId: options?.userId,
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
    this.tracker.onConnect(ws.data.id)

    this.logger.info('Client connected', {
      clientId: ws.data.id,
      activeConnections: this.tracker.getActiveConnections(),
    })

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
      this.logger.error('Failed to parse message', {
        clientId: ws.data.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      this.tracker.onError(ws.data.id, error instanceof Error ? error.message : 'Invalid message')
      this.send(ws, {
        type: 'error',
        message: error instanceof Error ? error.message : 'Invalid message',
      })
    }
  }

  private handleClose(ws: RippleWebSocket, code: number, reason: string): void {
    const leftChannels = this.channels.removeClient(ws.data.id)
    this.tracker.onDisconnect(ws.data.id, code, reason)

    this.logger.info('Client disconnected', {
      clientId: ws.data.id,
      code: code.toString(),
      reason,
      channelsLeft: leftChannels.length,
      activeConnections: this.tracker.getActiveConnections(),
    })

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
        this.logger.warn('Auth required but no authorizer configured', {
          clientId: ws.data.id,
          channel,
        })
        this.send(ws, {
          type: 'error',
          message: 'No authorizer configured for private channels',
          channel,
        })
        return
      }

      const result = await this.authorizer(channel, ws.data.userId, ws.data.id)

      if (result === false) {
        this.logger.warn('Subscription denied', {
          clientId: ws.data.id,
          channel,
          userId: ws.data.userId,
        })
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
        this.tracker.onSubscribe(ws.data.id, channel)

        this.logger.info('Client subscribed to presence channel', {
          clientId: ws.data.id,
          channel,
          userId: result.id,
        })

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
        this.tracker.onSubscribe(ws.data.id, channel)

        this.logger.info('Client subscribed to private channel', {
          clientId: ws.data.id,
          channel,
        })
      }
    } else {
      this.channels.subscribe(ws.data.id, channel)
      this.tracker.onSubscribe(ws.data.id, channel)

      this.logger.debug('Client subscribed to public channel', {
        clientId: ws.data.id,
        channel,
      })
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
    this.tracker.onUnsubscribe(ws.data.id, channel)

    this.logger.debug('Client unsubscribed', {
      clientId: ws.data.id,
      channel,
    })

    this.send(ws, { type: 'unsubscribed', channel })
  }

  private handleWhisper(ws: RippleWebSocket, channel: string, event: string, data: unknown): void {
    // Trigger server-side listeners
    const listeners = this.eventListeners.get(event)
    if (listeners && listeners.length > 0) {
      listeners.forEach((handler) => {
        handler(ws, data)
      })
    }

    // Whispers are client-to-client messages, excluding sender
    if (!this.channels.isSubscribed(ws.data.id, channel)) {
      this.logger.warn('Whisper to non-subscribed channel', {
        clientId: ws.data.id,
        channel,
        event,
      })
      this.send(ws, {
        type: 'error',
        message: 'Not subscribed to channel',
        channel,
      })
      return
    }

    this.logger.debug('Client whisper', {
      clientId: ws.data.id,
      channel,
      event,
    })

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
    if (subscribers.length === 0) return

    const message: ServerMessage =
      event === 'presence'
        ? {
            type: 'presence',
            channel,
            event: (data as { event: 'join' | 'leave' | 'members' }).event,
            data: (data as { data: unknown }).data,
          }
        : { type: 'event', channel, event, data }

    const serialized = this.serializer.serializeForBroadcast(message)

    for (const ws of subscribers) {
      if (excludeClientId && ws.data.id === excludeClientId) {
        continue
      }
      this.sendRaw(ws, serialized)
    }

    this.serializer.clearBroadcastCache()
  }

  // ─────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────

  private sendRaw(ws: RippleWebSocket, serialized: string): boolean {
    try {
      ws.send(serialized)
      return true
    } catch (error) {
      this.logger.error('Failed to send message', {
        clientId: ws.data.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return false
    }
  }

  private send(ws: RippleWebSocket, message: ServerMessage): boolean {
    return this.sendRaw(ws, this.serializer.serialize(message))
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
   * Get server health status.
   *
   * @returns A promise that resolves to the health check result.
   */
  async getHealth() {
    return await this.healthChecker.check()
  }

  /**
   * Initialize the server.
   *
   * Initializes the driver and starts the ping interval.
   *
   * @returns A promise that resolves when initialization is complete.
   */
  async init(): Promise<void> {
    this.logger.info('Initializing RippleServer', {
      driver: this.driver.name,
      path: this.config.path,
      pingInterval: this.config.pingInterval,
    })

    await this.driver.init?.()

    if (this.config.pingInterval > 0) {
      const pongMessage = this.serializer.getPongMessage()

      this.pingInterval = setInterval(() => {
        for (const ws of this.channels.getAllClients()) {
          try {
            ws.send(pongMessage)
          } catch {
            // Connection might be closed
          }
        }
      }, this.config.pingInterval)
    }

    this.logger.info('RippleServer initialized successfully')
  }

  /**
   * Shutdown the server.
   *
   * Clears the ping interval and shuts down the driver.
   *
   * @returns A promise that resolves when shutdown is complete.
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down RippleServer', {
      activeConnections: this.tracker.getActiveConnections(),
    })

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }
    await this.driver.shutdown?.()

    this.logger.info('RippleServer shutdown complete')
  }
}
