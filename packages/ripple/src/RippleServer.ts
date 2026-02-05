/**
 * @fileoverview Ripple WebSocket Server
 *
 * Core WebSocket server implementation using Bun's native WebSocket API.
 *
 * @module @gravito/ripple
 */

import { ChannelManager, requiresAuth } from './channels'
import { LocalDriver, NATSDriver, RedisDriver } from './drivers'
import { BunEngine } from './engines/BunEngine'
import type { IRippleEngine, RippleSocket } from './engines/IRippleEngine'
import { UWebSocketsEngine } from './engines/UWebSocketsEngine'
import { WsEngine } from './engines/WsEngine'
import { HealthChecker } from './health/HealthChecker'
import type { RippleLogger } from './logging/Logger'
import { createLogger } from './logging/Logger'
import { InterceptorManager } from './middleware/InterceptorManager'
import { RippleMetrics } from './observability/RippleMetrics'
import { AckManager } from './reliability/AckManager'
import type { ISerializer } from './serializers/ISerializer'
import { JsonSerializer } from './serializers/JsonSerializer'
import { ProtobufSerializer } from './serializers/ProtobufSerializer'
import type { ConnectionTracker } from './tracking/ConnectionTracker'
import { DefaultConnectionTracker } from './tracking/ConnectionTracker'
import { type SessionData, SessionManager } from './tracking/SessionManager'
import type {
  ChannelAuthorizer,
  ClientData,
  ClientMessage,
  RippleConfig,
  RippleDriver,
  RippleInterceptor,
  RippleWebSocket,
  ServerMessage,
  WebSocketHandlerConfig,
} from './types'
import { TokenBucket } from './utils/TokenBucket'

/**
 * Ripple WebSocket Server
 *
 * Provides channel-based real-time communication with multi-runtime support.
 * Can run on Bun (native WebSocket), Node.js (uWebSockets.js or ws).
 *
 * @since 5.0.0 - Multi-runtime support via engine abstraction
 */
export class RippleServer {
  private channels: ChannelManager
  private driver: RippleDriver
  private engine: IRippleEngine
  private authorizer?: ChannelAuthorizer
  private pingInterval?: ReturnType<typeof setInterval>
  private eventListeners: Map<string, ((socket: RippleSocket, data: any) => void)[]> = new Map()
  private logger: RippleLogger
  private tracker: ConnectionTracker
  private healthChecker: HealthChecker
  private serializer: ISerializer
  private whisperLimiters: Map<string, TokenBucket> = new Map()
  private sessionManager?: SessionManager
  private ackManager: AckManager
  private rippleMetrics?: RippleMetrics
  private interceptors: InterceptorManager
  private clientSockets = new Map<string, RippleSocket>()

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

    // Create WebSocket engine based on runtime
    this.engine = this.createEngine(config)

    this.driver =
      config.driver === 'redis'
        ? new RedisDriver({ ...config.redis, logger: this.logger })
        : config.driver === 'nats'
          ? new NATSDriver({ ...config.nats, logger: this.logger })
          : new LocalDriver()
    this.channels = new ChannelManager(this.driver)
    this.authorizer = config.authorizer
    this.tracker = config.connectionTracker ?? new DefaultConnectionTracker(this.logger)
    this.healthChecker = new HealthChecker(this, this.driver)

    // Initialize serializer based on config
    this.serializer =
      config.serializer === 'protobuf' ? new ProtobufSerializer() : new JsonSerializer()

    // Initialize session manager if reconnection is enabled
    if (config.reconnection?.enabled) {
      this.sessionManager = new SessionManager({
        sessionTTL: config.reconnection.sessionTTL ?? 60000,
        maxSessions: config.reconnection.maxSessions ?? 10000,
        logger: this.logger,
      })
    }

    this.ackManager = new AckManager(this.logger)

    if (config.metrics?.enabled) {
      this.rippleMetrics = new RippleMetrics(this.tracker, config.metrics.prefix, this.ackManager)
    }

    this.interceptors = new InterceptorManager(config.interceptors ?? [])

    // Register engine event handlers
    this.setupEngineHandlers()
  }

  /**
   * Create the appropriate WebSocket engine based on configuration.
   */
  private createEngine(config: RippleConfig): IRippleEngine {
    const runtime = config.runtime ?? this.detectRuntime()

    this.logger.info('Creating WebSocket engine', { runtime })

    switch (runtime) {
      case 'bun':
        return new BunEngine({
          port: config.port,
          hostname: config.hostname,
          development: process.env.NODE_ENV === 'development',
        })

      case 'node-uws':
        return new UWebSocketsEngine({
          port: config.port,
          hostname: config.hostname,
          development: process.env.NODE_ENV === 'development',
        })

      case 'node-ws':
        return new WsEngine({
          port: config.port,
          hostname: config.hostname,
          path: config.path,
          development: process.env.NODE_ENV === 'development',
        })

      default:
        throw new Error(`Unsupported runtime: ${runtime}`)
    }
  }

  /**
   * Auto-detect the current JavaScript runtime.
   */
  private detectRuntime(): 'bun' | 'node-uws' | 'node-ws' {
    // Check if running in Bun
    if (typeof Bun !== 'undefined') {
      return 'bun'
    }

    // For Node.js, default to ws (most compatible)
    // User can explicitly set runtime: 'node-uws' for better performance
    return 'node-ws'
  }

  /**
   * Setup engine event handlers.
   */
  private setupEngineHandlers(): void {
    this.engine.onConnection((socket) => this.handleOpen(socket))
    this.engine.onMessage((socket, message) => this.handleMessage(socket, message))
    this.engine.onDisconnection((socket, code, reason) => this.handleClose(socket, code, reason))
  }

  private emit(event: string, socket: RippleSocket, data: any): void {
    const handlers = this.eventListeners.get(event)
    if (handlers) {
      for (const handler of handlers) {
        handler(socket, data)
      }
    }
  }

  on(event: string, handler: (socket: RippleSocket, data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)?.push(handler)
  }

  /**
   * Get the name of the active message driver.
   */
  get driverName(): string {
    return this.driver.name
  }

  to(channel: string) {
    return {
      emit: (event: string, data: unknown, options?: { needAck?: boolean; timeout?: number }) =>
        this.broadcast(channel, event, data, options),
    }
  }

  /**
   * Upgrade an HTTP request to WebSocket (Bun/uWS only).
   *
   * @deprecated Use engine-based initialization via init() instead.
   * This method is kept for backward compatibility with v4.x.
   */
  upgrade(req: Request, options?: { userId?: string }): boolean {
    const url = new URL(req.url)

    if (url.pathname !== this.config.path) {
      return false
    }

    const reconnectionToken = url.searchParams.get('reconnection_token')
    let sessionData: SessionData | undefined

    if (reconnectionToken && this.sessionManager) {
      sessionData = this.sessionManager.getSession(reconnectionToken)
      if (sessionData) {
        this.logger.info('Client reconnecting with token', {
          token: reconnectionToken,
          clientId: sessionData.clientId,
        })
      }
    }

    // Delegate to engine if it supports upgrade
    if ('upgrade' in this.engine && typeof this.engine.upgrade === 'function') {
      return this.engine.upgrade(req, {
        userId: sessionData?.userId?.toString() ?? options?.userId,
        reconnectionToken:
          sessionData && reconnectionToken
            ? reconnectionToken
            : this.sessionManager
              ? crypto.randomUUID()
              : undefined,
      })
    }

    throw new Error('Current engine does not support HTTP upgrade')
  }

  /**
   * Get WebSocket handler configuration (Bun only).
   *
   * @deprecated Use engine-based initialization via init() instead.
   * This method is kept for backward compatibility with v4.x.
   */
  getHandler(): WebSocketHandlerConfig {
    // For backward compatibility, we need to return Bun-specific handlers
    // This will only work if using BunEngine
    throw new Error('getHandler() is deprecated in v5.0. Use init() to start the server instead.')
  }

  private async handleOpen(ws: RippleSocket): Promise<void> {
    this.clientSockets.set(ws.id, ws)
    this.channels.addClient(ws)
    this.tracker.onConnect(ws.data.id)

    this.logger.info('Client connected', {
      clientId: ws.data.id,
      activeConnections: this.tracker.getActiveConnections(),
    })

    this.send(ws, {
      type: 'connected',
      socketId: ws.data.id,
    })

    if (ws.data.reconnectionToken) {
      this.send(ws, {
        type: 'reconnection_token',
        token: ws.data.reconnectionToken,
      })
    }

    if (ws.data.reconnectionToken && this.sessionManager) {
      const session = this.sessionManager.getSession(ws.data.reconnectionToken)
      if (session) {
        this.logger.info('Restoring session subscriptions', {
          clientId: ws.data.id,
          channels: session.channels.length,
        })

        for (const channel of session.channels) {
          if (channel.startsWith('presence-') && session.userInfo) {
            await this.channels.subscribe(ws.data.id, channel, {
              id: session.userId!,
              info: session.userInfo,
            })
          } else {
            await this.channels.subscribe(ws.data.id, channel)
          }

          this.send(ws, { type: 'subscribed', channel })
        }

        this.sessionManager.removeSession(ws.data.reconnectionToken)
      }
    }
  }

  private async handleMessage(
    ws: RippleSocket,
    message: string | Buffer | ArrayBuffer | Uint8Array
  ): Promise<void> {
    try {
      // Convert to string or Uint8Array
      let data: string | Uint8Array
      if (typeof message === 'string') {
        data = message
      } else if (message instanceof Uint8Array) {
        data = message
      } else if (message instanceof ArrayBuffer) {
        data = new Uint8Array(message)
      } else if (Buffer.isBuffer(message)) {
        data = new Uint8Array(message.buffer, message.byteOffset, message.byteLength)
      } else {
        return // Unknown type
      }

      if (data instanceof Uint8Array) {
        // Check if it's a raw binary message or a serialized message
        await this.handleBinaryMessage(ws, data)
        return
      }

      const parsedData = this.serializer.deserialize(data)

      await this.interceptors.execute(
        { ws, message: parsedData, direction: 'incoming' },
        async () => {
          switch (parsedData.type) {
            case 'subscribe':
              await this.handleSubscribe(ws, parsedData.channel, parsedData.auth)
              break

            case 'unsubscribe':
              await this.handleUnsubscribe(ws, parsedData.channel)
              break

            case 'whisper':
              this.handleWhisper(ws, parsedData.channel, parsedData.event, parsedData.data)
              break

            case 'ping':
              this.send(ws, { type: 'pong' })
              break

            case 'ack':
              this.ackManager.confirm(ws.data.id, parsedData.seq)
              break
          }
        }
      )
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

  private async handleBinaryMessage(ws: RippleSocket, message: Uint8Array): Promise<void> {
    const buffer = message

    if (buffer.length < 4) return

    // Read header length (4 bytes, little-endian)
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    const headerLength = view.getInt32(0, true) // true = little-endian
    if (buffer.length < 4 + headerLength) return

    try {
      const headerBytes = buffer.subarray(4, 4 + headerLength)
      const headerRaw = new TextDecoder().decode(headerBytes)
      const header = JSON.parse(headerRaw)
      const payload = buffer.subarray(4 + headerLength)

      if (header.type === 'binary') {
        const { channel, event } = header

        const listeners = this.eventListeners.get(event)
        if (listeners) {
          for (const handler of listeners) {
            handler(ws, payload.buffer as ArrayBuffer)
          }
        }

        if (!this.channels.isSubscribed(ws.data.id, channel)) {
          this.send(ws, { type: 'error', message: 'Not subscribed to channel', channel })
          return
        }

        this.broadcastBinaryToChannel(channel, event, payload.buffer as ArrayBuffer, ws.data.id)
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
    if (subscribers.length === 0) return

    const header = JSON.stringify({ type: 'binary', channel, event })
    const headerBuffer = Buffer.from(header)
    const totalBuffer = Buffer.allocUnsafe(4 + headerBuffer.length + data.byteLength)

    totalBuffer.writeInt32LE(headerBuffer.length, 0)
    headerBuffer.copy(totalBuffer, 4)
    Buffer.from(data).copy(totalBuffer, 4 + headerBuffer.length)

    for (const ws of subscribers) {
      if (excludeClientId && ws.data.id === excludeClientId) continue
      ws.send(totalBuffer)
    }
  }

  broadcastBinary(channel: string, event: string, data: ArrayBuffer): void {
    this.broadcastBinaryToChannel(channel, event, data)
  }

  private handleClose(ws: RippleSocket, code: number, reason: string): void {
    if (this.sessionManager && ws.data.channels.size > 0) {
      const token = this.sessionManager.createSession(
        {
          clientId: ws.data.id,
          userId: ws.data.userId,
          channels: Array.from(ws.data.channels),
          userInfo: ws.data.userInfo,
        },
        ws.data.reconnectionToken
      )

      this.logger.info('Created reconnection session', {
        clientId: ws.data.id,
        token,
        channels: ws.data.channels.size,
      })
    }

    const leftChannels = this.channels.removeClient(ws.data.id)
    this.tracker.onDisconnect(ws.data.id, code, reason)

    this.logger.info('Client disconnected', {
      clientId: ws.data.id,
      code: code.toString(),
      reason,
      channelsLeft: leftChannels.length,
      activeConnections: this.tracker.getActiveConnections(),
    })

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

    this.ackManager.clearClient(ws.data.id)
  }

  private handleDrain(_ws: RippleSocket): void {
    // No-op
  }

  private async handleSubscribe(
    ws: RippleSocket,
    channel: string,
    _auth?: { socketId: string; signature: string }
  ): Promise<void> {
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
        this.send(ws, { type: 'error', message: 'Unauthorized', channel })
        return
      }

      if (typeof result === 'object' && 'id' in result) {
        await this.channels.subscribe(ws.data.id, channel, result)
        this.tracker.onSubscribe(ws.data.id, channel)

        this.broadcastToChannel(channel, 'presence', { event: 'join', data: result }, ws.data.id)

        this.send(ws, {
          type: 'presence',
          channel,
          event: 'members',
          data: await this.channels.getPresenceMembers(channel),
        })
      } else {
        await this.channels.subscribe(ws.data.id, channel)
        this.tracker.onSubscribe(ws.data.id, channel)
      }
    } else {
      await this.channels.subscribe(ws.data.id, channel)
      this.tracker.onSubscribe(ws.data.id, channel)
    }

    this.send(ws, { type: 'subscribed', channel })
  }

  private async handleUnsubscribe(ws: RippleSocket, channel: string): Promise<void> {
    if (channel.startsWith('presence-') && ws.data.userId) {
      this.broadcastToChannel(
        channel,
        'presence',
        {
          event: 'leave',
          data: { id: ws.data.userId, info: ws.data.userInfo },
        },
        ws.data.id
      )
    }

    await this.channels.unsubscribe(ws.data.id, channel)
    this.tracker.onUnsubscribe(ws.data.id, channel)
    this.send(ws, { type: 'unsubscribed', channel })
  }

  private handleWhisper(ws: RippleSocket, channel: string, event: string, data: unknown): void {
    if (this.config.rateLimit?.whisperMax) {
      let limiter = this.whisperLimiters.get(ws.data.id)
      if (!limiter) {
        limiter = new TokenBucket(
          this.config.rateLimit.whisperMax,
          this.config.rateLimit.whisperMax / (this.config.rateLimit.whisperInterval ?? 1000)
        )
        this.whisperLimiters.set(ws.data.id, limiter)
      }

      if (!limiter.consume()) {
        this.send(ws, { type: 'error', message: 'Rate limit exceeded' })
        return
      }
    }

    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((handler) => {
        handler(ws, data)
      })
    }

    this.emit('whisper', ws, { channel, event, data })

    if (!this.channels.isSubscribed(ws.data.id, channel)) {
      this.send(ws, { type: 'error', message: 'Not subscribed to channel', channel })
      return
    }

    this.broadcastToChannel(channel, event, data, ws.data.id)
  }

  broadcast(
    channel: string,
    event: string,
    data: unknown,
    options?: { needAck?: boolean; timeout?: number }
  ): void {
    this.broadcastToChannel(channel, event, data, undefined, options)
  }

  broadcastToClients(clientIds: string[], event: string, data: unknown): void {
    for (const clientId of clientIds) {
      const ws = this.channels.getClient(clientId)
      if (ws) {
        this.send(ws, { type: 'event', channel: '', event, data })
      }
    }
  }

  private broadcastToChannel(
    channel: string,
    event: string,
    data: unknown,
    excludeClientId?: string,
    options?: { needAck?: boolean; timeout?: number }
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
      if (excludeClientId && ws.data.id === excludeClientId) continue

      // Execute outgoing interceptors
      this.interceptors.execute(
        { ws, message: message, direction: 'outgoing', channel, event },
        async () => {
          if (options?.needAck) {
            const { seq, promise } = this.ackManager.register(ws.data.id, options.timeout)
            const msgWithAck: ServerMessage = { ...message, seq, needAck: true }
            this.send(ws, msgWithAck)

            promise.then((success) => {
              if (!success) {
                this.logger.warn('ACK timeout', { clientId: ws.data.id, seq, channel })
              } else {
                this.send(ws, { type: 'ack_received', seq })
              }
            })
          } else {
            this.sendRaw(ws, serialized)
          }
        }
      )
    }

    this.serializer.clearBroadcastCache()
  }

  private sendRaw(ws: RippleSocket, serialized: string | Buffer | Uint8Array): boolean {
    const config = this.config.backpressure
    if (config?.enabled) {
      const buffered = ws.getBufferedAmount()
      if (config.hwmHigh && buffered >= config.hwmHigh) {
        this.logger.warn('Backpressure HWM High', { clientId: ws.data.id, buffered })
        this.rippleMetrics?.incrementSlowClients()
        ws.close(1011, 'Backpressure')
        return false
      }
      if (config.hwmLow && buffered >= config.hwmLow) {
        this.logger.debug('Backpressure HWM Low', { clientId: ws.data.id, buffered })
      }
    }

    try {
      ws.send(serialized)
      return true
    } catch {
      return false
    }
  }

  private send(ws: RippleSocket, message: ServerMessage): boolean {
    return this.sendRaw(ws, this.serializer.serialize(message))
  }

  /**
   * Add a middleware interceptor (v4.0+).
   */
  use(interceptor: RippleInterceptor): this {
    this.interceptors.use(interceptor)
    return this
  }

  /**
   * Get real-time server statistics.
   */
  getStats() {
    return this.channels.getStats()
  }

  /**
   * Get Prometheus metrics (v3.7+).
   */
  getMetrics(): string {
    return this.rippleMetrics?.export() ?? ''
  }

  /**
   * Get server health status.
   */
  async getHealth() {
    return await this.healthChecker.check()
  }

  /**
   * Initialize and start the RippleServer.
   *
   * This method:
   * 1. Initializes the driver (Redis/NATS/Local)
   * 2. Initializes the serializer (JSON/Protobuf)
   * 3. Starts the WebSocket engine (Bun/uWS/ws)
   * 4. Starts the ping interval
   *
   * @since 5.0.0
   */
  async start(): Promise<void> {
    const port = this.config.port ?? 3000

    this.logger.info('Starting RippleServer', {
      driver: this.driver.name,
      serializer: this.serializer.contentType,
      runtime: this.config.runtime ?? 'auto-detected',
      port,
    })

    // Initialize driver
    await this.driver.init?.()

    // Initialize serializer if needed (e.g. loading proto files)
    if ('init' in this.serializer) {
      await (this.serializer as any).init()
    }

    // Start the WebSocket engine
    await this.engine.listen(port)

    // Start ping interval
    if (this.config.pingInterval > 0) {
      const pong = this.serializer.getPongMessage()
      this.pingInterval = setInterval(() => {
        for (const ws of this.channels.getAllClients()) {
          try {
            ws.send(pong)
          } catch {}
        }
      }, this.config.pingInterval)
    }

    this.logger.info('RippleServer started successfully', { port })
  }

  /**
   * Initialize the RippleServer without starting the engine.
   *
   * @deprecated Use start() instead. This method is kept for backward compatibility.
   * @since 3.0.0
   */
  async init(): Promise<void> {
    this.logger.info('Initializing RippleServer', {
      driver: this.driver.name,
      serializer: this.serializer.contentType,
    })

    await this.driver.init?.()

    // Initialize serializer if needed (e.g. loading proto files)
    if ('init' in this.serializer) {
      await (this.serializer as any).init()
    }

    if (this.config.pingInterval > 0) {
      const pong = this.serializer.getPongMessage()
      this.pingInterval = setInterval(() => {
        for (const ws of this.channels.getAllClients()) {
          try {
            ws.send(pong)
          } catch {}
        }
      }, this.config.pingInterval)
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down RippleServer')
    if (this.pingInterval) clearInterval(this.pingInterval)
    await this.driver.shutdown?.()
  }
}
