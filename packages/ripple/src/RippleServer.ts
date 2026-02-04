/**
 * @fileoverview Ripple WebSocket Server
 *
 * Core WebSocket server implementation using Bun's native WebSocket API.
 *
 * @module @gravito/ripple
 */

import type { Server } from 'bun'
import { ChannelManager, requiresAuth } from './channels'
import { LocalDriver, NATSDriver, RedisDriver } from './drivers'
import { HealthChecker } from './health/HealthChecker'
import type { RippleLogger } from './logging/Logger'
import { createLogger } from './logging/Logger'
import { InterceptorManager } from './middleware/InterceptorManager'
import { RippleMetrics } from './observability/RippleMetrics'
import { AckManager } from './reliability/AckManager'
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
import { MessageSerializer } from './utils/MessageSerializer'
import { TokenBucket } from './utils/TokenBucket'

/**
 * Ripple WebSocket Server
 *
 * Provides channel-based real-time communication using Bun's native WebSocket.
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
  private whisperLimiters: Map<string, TokenBucket> = new Map()
  private sessionManager?: SessionManager
  private ackManager: AckManager
  private rippleMetrics?: RippleMetrics
  private interceptors: InterceptorManager

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
    this.serializer = new MessageSerializer()

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
  }

  private emit(event: string, socket: RippleWebSocket, data: any): void {
    const handlers = this.eventListeners.get(event)
    if (handlers) {
      for (const handler of handlers) {
        handler(socket, data)
      }
    }
  }

  on(event: string, handler: (socket: RippleWebSocket, data: any) => void): void {
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

  upgrade(req: Request, server: Server<ClientData>, options?: { userId?: string }): boolean {
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

    const success = server.upgrade(req, {
      data: {
        id: sessionData?.clientId ?? crypto.randomUUID(),
        channels: new Set<string>(),
        userId: sessionData?.userId ?? options?.userId,
        userInfo: sessionData?.userInfo,
        reconnectionToken: sessionData && reconnectionToken ? reconnectionToken : undefined,
      } satisfies ClientData,
    })

    return success
  }

  getHandler(): WebSocketHandlerConfig {
    return {
      open: (ws) => this.handleOpen(ws),
      message: (ws, message) => this.handleMessage(ws, message),
      close: (ws, code, reason) => this.handleClose(ws, code, reason),
      drain: (ws) => this.handleDrain(ws),
    }
  }

  private async handleOpen(ws: RippleWebSocket): Promise<void> {
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
    ws: RippleWebSocket,
    message: string | Buffer | ArrayBuffer
  ): Promise<void> {
    try {
      if (message instanceof ArrayBuffer || Buffer.isBuffer(message)) {
        await this.handleBinaryMessage(ws, message)
        return
      }

      const data: ClientMessage = JSON.parse(message.toString())

      await this.interceptors.execute({ ws, message: data, direction: 'incoming' }, async () => {
        switch (data.type) {
          case 'subscribe':
            await this.handleSubscribe(ws, data.channel, data.auth)
            break

          case 'unsubscribe':
            await this.handleUnsubscribe(ws, data.channel)
            break

          case 'whisper':
            this.handleWhisper(ws, data.channel, data.event, data.data)
            break

          case 'ping':
            this.send(ws, { type: 'pong' })
            break

          case 'ack':
            this.ackManager.confirm(ws.data.id, data.seq)
            break
        }
      })
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

    if (buffer.length < 4) return

    const headerLength = buffer.readInt32LE(0)
    if (buffer.length < 4 + headerLength) return

    try {
      const headerRaw = buffer.subarray(4, 4 + headerLength).toString()
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

  private handleClose(ws: RippleWebSocket, code: number, reason: string): void {
    if (this.sessionManager && ws.data.channels.size > 0) {
      const token = this.sessionManager.createSession({
        clientId: ws.data.id,
        userId: ws.data.userId,
        channels: Array.from(ws.data.channels),
        userInfo: ws.data.userInfo,
      })

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

  private handleDrain(_ws: RippleWebSocket): void {
    // No-op
  }

  private async handleSubscribe(
    ws: RippleWebSocket,
    channel: string,
    _auth?: { socketId: string; signature: string }
  ): Promise<void> {
    if (requiresAuth(channel)) {
      if (!this.authorizer) {
        this.send(ws, { type: 'error', message: 'No authorizer configured', channel })
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

  private async handleUnsubscribe(ws: RippleWebSocket, channel: string): Promise<void> {
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

  private handleWhisper(ws: RippleWebSocket, channel: string, event: string, data: unknown): void {
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

  private sendRaw(ws: RippleWebSocket, serialized: string): boolean {
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

  private send(ws: RippleWebSocket, message: ServerMessage): boolean {
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

  async init(): Promise<void> {
    this.logger.info('Initializing RippleServer', { driver: this.driver.name })
    await this.driver.init?.()

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
