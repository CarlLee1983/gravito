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
   * Register an event listener for custom client events.
   *
   * Allows server-side code to react to custom events sent by WebSocket clients.
   * This is useful for handling client-initiated actions like typing indicators,
   * presence updates, or custom application logic.
   *
   * @param event - The event name to listen for (e.g., 'typing', 'user.online')
   * @param handler - Callback function invoked when the event is received
   * @param handler.socket - The WebSocket connection that sent the event
   * @param handler.data - The event payload sent by the client
   *
   * @example
   * ```typescript
   * // Listen for typing indicators
   * ripple.on('typing', (socket, data) => {
   *   console.log(`User ${socket.data.userId} is typing in ${data.channel}`)
   *   // Broadcast typing indicator to other users
   *   ripple.to(data.channel).emit('user-typing', {
   *     userId: socket.data.userId
   *   })
   * })
   *
   * // Listen for custom game moves
   * ripple.on('game.move', async (socket, data) => {
   *   await saveGameMove(data.gameId, data.move)
   *   ripple.to(`game.${data.gameId}`).emit('move-made', data)
   * })
   * ```
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
   * Provides a chainable interface for emitting events to specific channels.
   * This is a convenience method that returns an object with an `emit()` function.
   *
   * @param channel - The channel name (e.g., 'news', 'private-orders.123', 'presence-chat.lobby')
   * @returns An object with an `emit` method for sending events
   *
   * @example
   * ```typescript
   * // Broadcast to a public channel
   * ripple.to('news').emit('article.published', {
   *   id: 123,
   *   title: 'Breaking News',
   *   author: 'John Doe'
   * })
   *
   * // Broadcast to a private channel
   * ripple.to('private-orders.456').emit('order.shipped', {
   *   orderId: 456,
   *   trackingNumber: 'ABC123'
   * })
   *
   * // Broadcast to a presence channel
   * ripple.to('presence-chat.room1').emit('message', {
   *   userId: 'user-789',
   *   text: 'Hello everyone!'
   * })
   * ```
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
   * This method should be called in your Bun.serve fetch handler to check if an incoming
   * HTTP request should be upgraded to a WebSocket connection. It validates the request path
   * against the configured WebSocket endpoint and performs the upgrade if matched.
   *
   * **Important**: For private/presence channels, you must pass the authenticated `userId`
   * in the options parameter. This userId will be used for channel authorization.
   *
   * @param req - The incoming HTTP request from Bun.serve
   * @param server - The Bun server instance
   * @param options - Optional upgrade options
   * @param options.userId - The authenticated user ID (required for private/presence channels)
   * @returns `true` if the request was upgraded to WebSocket, `false` otherwise
   *
   * @example
   * ```typescript
   * // Basic setup (public channels only)
   * Bun.serve({
   *   fetch: (req, server) => {
   *     if (ripple.upgrade(req, server)) return
   *     return new Response('Not found', { status: 404 })
   *   },
   *   websocket: ripple.getHandler()
   * })
   *
   * // With authentication (supports private/presence channels)
   * Bun.serve({
   *   fetch: async (req, server) => {
   *     // Extract userId from JWT, session, or other auth mechanism
   *     const userId = await extractUserIdFromRequest(req)
   *
   *     // Pass userId to enable private/presence channel authorization
   *     if (ripple.upgrade(req, server, { userId })) return
   *
   *     // Handle other HTTP routes
   *     return app.fetch(req, server)
   *   },
   *   websocket: ripple.getHandler()
   * })
   *
   * // Integration with Sentinel auth
   * Bun.serve({
   *   fetch: async (req, server) => {
   *     const user = await sentinel.getUserFromRequest(req)
   *     if (ripple.upgrade(req, server, { userId: user?.id })) return
   *     return handleHttpRequest(req)
   *   },
   *   websocket: ripple.getHandler()
   * })
   * ```
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
   * Returns an object containing all WebSocket event handlers (open, message, close, drain)
   * that Bun requires for WebSocket server configuration. This should be passed to the
   * `websocket` property of `Bun.serve()`.
   *
   * @returns WebSocket handler configuration object with event handlers
   *
   * @example
   * ```typescript
   * const ripple = new RippleServer({ path: '/ws' })
   *
   * Bun.serve({
   *   port: 3000,
   *   fetch: (req, server) => {
   *     if (ripple.upgrade(req, server)) return
   *     return new Response('Not found', { status: 404 })
   *   },
   *   // Pass the handler configuration to Bun.serve
   *   websocket: ripple.getHandler()
   * })
   * ```
   *
   * @see {@link https://bun.sh/docs/api/websockets Bun WebSocket API}
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

  private async handleMessage(
    ws: RippleWebSocket,
    message: string | Buffer | ArrayBuffer
  ): Promise<void> {
    try {
      if (message instanceof ArrayBuffer || Buffer.isBuffer(message)) {
        await this.handleBinaryMessage(ws, message)
        return
      }

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

  private async handleBinaryMessage(
    ws: RippleWebSocket,
    message: Buffer | ArrayBuffer
  ): Promise<void> {
    const buffer = Buffer.isBuffer(message) ? message : Buffer.from(message)

    // Protocol: [JSON Header Length (4 bytes)] [JSON Header] [Binary Payload]
    if (buffer.length < 4) {
      return
    }

    const headerLength = buffer.readInt32LE(0)
    if (buffer.length < 4 + headerLength) {
      return
    }

    try {
      const headerRaw = buffer.subarray(4, 4 + headerLength).toString()
      const header = JSON.parse(headerRaw)
      const payload = buffer.subarray(4 + headerLength)

      if (header.type === 'binary') {
        const { channel, event } = header

        // Trigger server-side listeners
        const listeners = this.eventListeners.get(event)
        if (listeners && listeners.length > 0) {
          for (const handler of listeners) {
            handler(ws, payload.buffer)
          }
        }

        if (!this.channels.isSubscribed(ws.data.id, channel)) {
          this.send(ws, { type: 'error', message: 'Not subscribed to channel', channel })
          return
        }

        this.broadcastBinaryToChannel(channel, event, payload.buffer, ws.data.id)
      }
    } catch (e) {
      this.logger.error('Failed to parse binary message header', { error: (e as any).message })
    }
  }

  private broadcastBinaryToChannel(
    channel: string,
    event: string,
    data: ArrayBuffer,
    excludeClientId?: string
  ): void {
    const subscribers = this.channels.getSubscribers(channel)
    if (subscribers.length === 0) {
      return
    }

    const header = JSON.stringify({ type: 'binary', channel, event })
    const headerBuffer = Buffer.from(header)
    const totalBuffer = Buffer.allocUnsafe(4 + headerBuffer.length + data.byteLength)

    totalBuffer.writeInt32LE(headerBuffer.length, 0)
    headerBuffer.copy(totalBuffer, 4)
    Buffer.from(data).copy(totalBuffer, 4 + headerBuffer.length)

    for (const ws of subscribers) {
      if (excludeClientId && ws.data.id === excludeClientId) {
        continue
      }
      ws.send(totalBuffer)
    }
  }

  /**
   * Broadcast binary data to all subscribers of a channel.
   *
   * @param channel - The channel name.
   * @param event - The event name.
   * @param data - The binary data (ArrayBuffer).
   */
  broadcastBinary(channel: string, event: string, data: ArrayBuffer): void {
    this.broadcastBinaryToChannel(channel, event, data)
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
   * Broadcast an event to all subscribers of a channel.
   *
   * Sends an event with data to all WebSocket clients currently subscribed to the specified channel.
   * This method is the primary way to push server-side events to connected clients.
   *
   * **Note**: Use the fluent `to()` API for more readable code: `ripple.to(channel).emit(event, data)`
   *
   * @param channel - The full channel name (e.g., 'news', 'private-orders.123', 'presence-chat.lobby')
   * @param event - The event name that clients will listen for
   * @param data - The event payload (must be JSON-serializable)
   *
   * @example
   * ```typescript
   * // Broadcast to a public channel
   * ripple.broadcast('news', 'article.published', {
   *   id: 123,
   *   title: 'Breaking News',
   *   publishedAt: new Date().toISOString()
   * })
   *
   * // Broadcast order update to a private channel
   * ripple.broadcast('private-orders.456', 'order.status.updated', {
   *   orderId: 456,
   *   status: 'shipped',
   *   trackingNumber: 'ABC123XYZ'
   * })
   *
   * // Broadcast to presence channel
   * ripple.broadcast('presence-chat.room1', 'message', {
   *   userId: 'user-789',
   *   text: 'Hello everyone!',
   *   timestamp: Date.now()
   * })
   * ```
   *
   * @see {@link to} - Fluent API alternative for broadcasting
   */
  broadcast(channel: string, event: string, data: unknown): void {
    this.broadcastToChannel(channel, event, data)
  }

  /**
   * Broadcast an event to specific client IDs.
   *
   * Sends an event directly to an array of client IDs, regardless of their channel subscriptions.
   * This is useful for targeted notifications or private messages to specific users.
   *
   * **Note**: The event is sent without a channel context. Clients receive it as a direct message.
   *
   * @param clientIds - Array of client socket IDs (from `ws.data.id`)
   * @param event - The event name that clients will listen for
   * @param data - The event payload (must be JSON-serializable)
   *
   * @example
   * ```typescript
   * // Send notification to specific clients
   * const clientIds = ['client-uuid-1', 'client-uuid-2', 'client-uuid-3']
   * ripple.broadcastToClients(clientIds, 'notification', {
   *   type: 'alert',
   *   message: 'Your order has been confirmed',
   *   timestamp: Date.now()
   * })
   *
   * // Send direct message to a single client
   * const recipientId = 'client-uuid-xyz'
   * ripple.broadcastToClients([recipientId], 'private.message', {
   *   from: 'admin',
   *   text: 'Welcome to our platform!',
   *   priority: 'high'
   * })
   *
   * // Notify users from a query result
   * const onlineUsers = await db.query('SELECT socket_id FROM online_users WHERE premium = true')
   * const clientIds = onlineUsers.map(u => u.socket_id)
   * ripple.broadcastToClients(clientIds, 'premium.announcement', {
   *   title: 'Exclusive Offer',
   *   discount: 20
   * })
   * ```
   *
   * @see {@link broadcast} - For broadcasting to channels
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
   * Get real-time server statistics.
   *
   * Returns current metrics about active connections and channel subscriptions.
   * Useful for monitoring, debugging, and building admin dashboards.
   *
   * @returns Server statistics object
   * @returns stats.totalConnections - Number of active WebSocket connections
   * @returns stats.totalChannels - Number of channels with at least one subscriber
   * @returns stats.channelSubscriptions - Map of channel names to subscriber counts
   *
   * @example
   * ```typescript
   * // Get current stats
   * const stats = ripple.getStats()
   * console.log(`Active connections: ${stats.totalConnections}`)
   * console.log(`Active channels: ${stats.totalChannels}`)
   *
   * // Log channel-specific stats
   * for (const [channel, count] of Object.entries(stats.channelSubscriptions)) {
   *   console.log(`${channel}: ${count} subscribers`)
   * }
   *
   * // Build monitoring endpoint
   * app.get('/admin/websocket-stats', (req, res) => {
   *   const stats = ripple.getStats()
   *   return res.json({
   *     connections: stats.totalConnections,
   *     channels: stats.totalChannels,
   *     topChannels: Object.entries(stats.channelSubscriptions)
   *       .sort(([, a], [, b]) => b - a)
   *       .slice(0, 10)
   *       .map(([name, count]) => ({ name, subscribers: count }))
   *   })
   * })
   *
   * // Periodic logging
   * setInterval(() => {
   *   const stats = ripple.getStats()
   *   logger.info('WebSocket metrics', stats)
   * }, 60000) // Every minute
   * ```
   *
   * @see {@link getHealth} - For health check information
   */
  getStats() {
    return this.channels.getStats()
  }

  /**
   * Get server health status.
   *
   * Performs a comprehensive health check of the WebSocket server and its dependencies.
   * Checks include driver connectivity (Redis/Local), server responsiveness, and error metrics.
   *
   * **Use case**: Health check endpoints for load balancers, monitoring systems, and orchestration platforms.
   *
   * @returns Promise resolving to health check result
   * @returns result.healthy - Overall health status (true if all checks pass)
   * @returns result.checks - Detailed status of individual health checks
   *
   * @example
   * ```typescript
   * // Basic health check endpoint
   * app.get('/health', async (req, res) => {
   *   const health = await ripple.getHealth()
   *
   *   return res
   *     .status(health.healthy ? 200 : 503)
   *     .json(health)
   * })
   *
   * // Kubernetes liveness probe
   * app.get('/healthz', async (req, res) => {
   *   try {
   *     const health = await ripple.getHealth()
   *     if (health.healthy) {
   *       return res.status(200).send('OK')
   *     } else {
   *       return res.status(503).json({ error: 'Unhealthy', details: health.checks })
   *     }
   *   } catch (error) {
   *     return res.status(503).json({ error: 'Health check failed' })
   *   }
   * })
   *
   * // Detailed health monitoring
   * app.get('/admin/health-detail', async (req, res) => {
   *   const [health, stats] = await Promise.all([
   *     ripple.getHealth(),
   *     Promise.resolve(ripple.getStats())
   *   ])
   *
   *   return res.json({
   *     ...health,
   *     metrics: {
   *       connections: stats.totalConnections,
   *       channels: stats.totalChannels,
   *       uptime: process.uptime()
   *     }
   *   })
   * })
   * ```
   *
   * @see {@link getStats} - For connection and channel statistics
   */
  async getHealth() {
    return await this.healthChecker.check()
  }

  /**
   * Initialize the RippleServer.
   *
   * Performs initialization tasks including driver setup (Redis/Local) and starting
   * the ping interval for connection health monitoring. This method **must** be called
   * before the server starts accepting WebSocket connections.
   *
   * **Important**: Call this method during application startup, before `Bun.serve()`.
   *
   * @returns Promise that resolves when initialization is complete
   * @throws {Error} If driver initialization fails (e.g., Redis connection failed)
   *
   * @example
   * ```typescript
   * // Basic initialization
   * const ripple = new RippleServer({ path: '/ws' })
   * await ripple.init()
   *
   * Bun.serve({
   *   fetch: (req, server) => {
   *     if (ripple.upgrade(req, server)) return
   *     return new Response('Not found', { status: 404 })
   *   },
   *   websocket: ripple.getHandler()
   * })
   *
   * // With Redis driver
   * const ripple = new RippleServer({
   *   path: '/ws',
   *   driver: 'redis',
   *   redis: {
   *     host: 'localhost',
   *     port: 6379
   *   }
   * })
   *
   * try {
   *   await ripple.init()
   *   console.log('RippleServer initialized successfully')
   * } catch (error) {
   *   console.error('Failed to initialize RippleServer:', error)
   *   process.exit(1)
   * }
   *
   * // With graceful shutdown
   * const ripple = new RippleServer({ path: '/ws' })
   * await ripple.init()
   *
   * process.on('SIGTERM', async () => {
   *   console.log('SIGTERM received, shutting down...')
   *   await ripple.shutdown()
   *   process.exit(0)
   * })
   * ```
   *
   * @see {@link shutdown} - For graceful server shutdown
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
   * Shutdown the RippleServer gracefully.
   *
   * Performs cleanup tasks including stopping the ping interval, closing driver connections
   * (Redis/Local), and releasing resources. This method should be called during application
   * shutdown to ensure graceful cleanup.
   *
   * **Important**: Call this method when receiving shutdown signals (SIGTERM, SIGINT) or
   * during application teardown to prevent resource leaks.
   *
   * @returns Promise that resolves when shutdown is complete
   *
   * @example
   * ```typescript
   * // Basic shutdown
   * const ripple = new RippleServer({ path: '/ws' })
   * await ripple.init()
   *
   * // Later, during shutdown
   * await ripple.shutdown()
   *
   * // Graceful shutdown with signal handling
   * const ripple = new RippleServer({ path: '/ws' })
   * await ripple.init()
   *
   * process.on('SIGTERM', async () => {
   *   console.log('SIGTERM received, shutting down gracefully...')
   *   await ripple.shutdown()
   *   console.log('RippleServer shutdown complete')
   *   process.exit(0)
   * })
   *
   * process.on('SIGINT', async () => {
   *   console.log('SIGINT received, shutting down gracefully...')
   *   await ripple.shutdown()
   *   process.exit(0)
   * })
   *
   * // Shutdown with timeout for Kubernetes
   * process.on('SIGTERM', async () => {
   *   const timeout = setTimeout(() => {
   *     console.error('Shutdown timeout, forcing exit')
   *     process.exit(1)
   *   }, 10000) // 10 second timeout
   *
   *   try {
   *     await ripple.shutdown()
   *     clearTimeout(timeout)
   *     process.exit(0)
   *   } catch (error) {
   *     console.error('Shutdown error:', error)
   *     process.exit(1)
   *   }
   * })
   *
   * // Test cleanup
   * afterAll(async () => {
   *   await ripple.shutdown()
   * })
   * ```
   *
   * @see {@link init} - For server initialization
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
