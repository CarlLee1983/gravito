/**
 * @fileoverview Ripple WebSocket Client
 *
 * Main client class for connecting to @gravito/ripple server.
 *
 * @module @gravito/ripple-client
 */

import { Channel, PresenceChannel, PrivateChannel } from './Channel'
import { ConnectionStateManager } from './ConnectionStateManager'
import { InterceptorManager, type RippleInterceptor } from './InterceptorManager'
import type { RippleClientConfig, ServerMessage } from './types'

/**
 * Client connection states
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

/**
 * Ripple WebSocket Client
 *
 * @example
 * ```typescript
 * const client = new RippleClient({
 *   host: 'ws://localhost:3000/ws',
 *   authEndpoint: '/broadcasting/auth',
 * })
 *
 * await client.connect()
 *
 * client.channel('news')
 *   .listen('ArticlePublished', (data) => {
 *     console.log('New article:', data)
 *   })
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class RippleClient {
  private ws: WebSocket | null = null
  private socketId: string | null = null
  private stateManager = new ConnectionStateManager()
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectionToken: string | null = null

  private channels = new Map<string, Channel>()
  private pendingSubscriptions = new Set<string>()
  private interceptors = new InterceptorManager()

  readonly config: Required<
    Pick<
      RippleClientConfig,
      'authEndpoint' | 'autoReconnect' | 'reconnectDelay' | 'maxReconnectAttempts'
    >
  > &
    RippleClientConfig

  /**
   * Create a new RippleClient instance.
   *
   * @param config - The Ripple client configuration.
   */
  constructor(config: RippleClientConfig) {
    this.config = {
      authEndpoint: '/broadcasting/auth',
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      ...config,
    }
    this.reconnectionToken = config.reconnectionToken ?? null
  }

  // ─────────────────────────────────────────────────────────────
  // Connection Management
  // ─────────────────────────────────────────────────────────────

  /**
   * Connect to the WebSocket server.
   *
   * Initializes the WebSocket connection and handles the initial handshake.
   *
   * @returns A promise that resolves when connected and handshaked.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.stateManager.getState() === 'connected') {
        resolve()
        return
      }

      this.clearReconnectTimer()

      this.stateManager.setState('connecting')

      try {
        const url = new URL(this.config.host)
        if (this.reconnectionToken) {
          url.searchParams.set('reconnection_token', this.reconnectionToken)
        }

        this.ws = new WebSocket(url.toString())
        this.ws.binaryType = 'arraybuffer'

        this.ws.onopen = () => {
          this.stateManager.setState('connected')
          this.reconnectAttempts = 0
          // Wait for 'connected' message with socketId
        }

        this.ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            this.handleBinaryMessage(event.data)
            return
          }
          this.handleMessage(event.data)
          // Resolve on first successful connection
          if (this.socketId && this.stateManager.getState() === 'connected') {
            resolve()
          }
        }

        this.ws.onclose = () => {
          this.handleDisconnect()
        }

        this.ws.onerror = (error) => {
          if (this.stateManager.getState() === 'connecting') {
            reject(new Error('Failed to connect'))
          }
          console.error('[Ripple] WebSocket error:', error)
        }
      } catch (error) {
        this.stateManager.setState('disconnected')
        reject(error)
      }
    })
  }

  /**
   * Disconnect from the server.
   *
   * Closes the active WebSocket connection and clears all state.
   */
  disconnect(): void {
    this.stateManager.setState('disconnected')
    this.clearReconnectTimer()
    this.ws?.close()
    this.ws = null
    this.socketId = null
    this.channels.clear()
    this.pendingSubscriptions.clear()
  }

  /**
   * Get the current connection state.
   *
   * @returns The connection state string.
   */
  getState(): ConnectionState {
    return this.stateManager.getState()
  }

  /**
   * Subscribe to connection state changes.
   *
   * @param callback - Function to execute on state change.
   * @returns Unsubscribe function.
   */
  onStateChange(callback: (state: ConnectionState, prev: ConnectionState) => void): () => void {
    return this.stateManager.onStateChange(callback)
  }

  /**
   * Add a middleware interceptor (v4.0+).
   *
   * @param interceptor - The interceptor function.
   * @returns This client instance for chaining.
   */
  use(interceptor: RippleInterceptor): this {
    this.interceptors.use(interceptor)
    return this
  }

  /**
   * Get the socket ID assigned by the server.
   *
   * Available only after a successful connection.
   *
   * @returns The socket ID or null.
   */
  getSocketId(): string | null {
    return this.socketId
  }

  // ─────────────────────────────────────────────────────────────
  // Channel Subscription
  // ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to a public channel.
   *
   * @param name - The name of the channel.
   * @returns A Channel instance.
   */
  channel<N extends string = string>(name: N): Channel<N> {
    const cached = this.channels.get(name)
    if (cached) {
      return cached as Channel<N>
    }

    const channel = new Channel(name, (msg) => this.send(msg))
    this.channels.set(name, channel)
    this.subscribe(name)
    return channel as Channel<N>
  }

  /**
   * Subscribe to a private channel.
   *
   * Requires authentication through the configured auth endpoint.
   *
   * @param name - The name of the channel (without 'private-' prefix).
   * @returns A PrivateChannel instance.
   */
  private(name: string): PrivateChannel {
    const fullName = `private-${name}`
    if (this.channels.has(fullName)) {
      return this.channels.get(fullName) as PrivateChannel
    }

    const channel = new PrivateChannel(name, (msg) => this.send(msg))
    this.channels.set(fullName, channel)
    this.subscribePrivate(fullName)
    return channel
  }

  /**
   * Join a presence channel.
   *
   * Presence channels allow you to see who else is subscribed to the channel.
   *
   * @param name - The name of the channel (without 'presence-' prefix).
   * @returns A PresenceChannel instance.
   */
  join(name: string): PresenceChannel {
    const fullName = `presence-${name}`
    if (this.channels.has(fullName)) {
      return this.channels.get(fullName) as PresenceChannel
    }

    const channel = new PresenceChannel(name, (msg) => this.send(msg))
    this.channels.set(fullName, channel)
    this.subscribePrivate(fullName)
    return channel
  }

  /**
   * Leave a channel and stop receiving events from it.
   *
   * @param name - The base name of the channel.
   */
  leave(name: string): void {
    // Find channel with any prefix
    const channelNames = [name, `private-${name}`, `presence-${name}`]
    for (const fullName of channelNames) {
      if (this.channels.has(fullName)) {
        this.send({ type: 'unsubscribe', channel: fullName })
        this.channels.delete(fullName)
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Internal Methods
  // ─────────────────────────────────────────────────────────────

  private subscribe(channel: string): void {
    if (this.stateManager.getState() !== 'connected') {
      this.pendingSubscriptions.add(channel)
      return
    }

    this.send({ type: 'subscribe', channel })
  }

  private async subscribePrivate(channel: string): Promise<void> {
    if (this.stateManager.getState() !== 'connected' || !this.socketId) {
      this.pendingSubscriptions.add(channel)
      return
    }

    // Get auth signature from server
    try {
      const endpoint = this.config.authEndpoint
      if (!endpoint) {
        console.error('[Ripple] Auth endpoint not configured')
        return
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.authHeaders,
        },
        body: JSON.stringify({
          socket_id: this.socketId,
          channel_name: channel,
        }),
      })

      if (!response.ok) {
        console.error('[Ripple] Auth failed for channel:', channel)
        return
      }

      const auth = await response.json()
      this.send({
        type: 'subscribe',
        channel,
        auth: {
          socketId: this.socketId,
          signature: auth.auth,
        },
      })
    } catch (error) {
      console.error('[Ripple] Auth request failed:', error)
    }
  }

  private send(message: object): void {
    this.interceptors.execute({ message: message as any, direction: 'outgoing' }, async () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message))
      }
    })
  }

  /**
   * Send binary data to a channel.
   *
   * @param channel - The channel name.
   * @param event - The event name.
   * @param data - The binary data (ArrayBuffer).
   */
  sendBinary(channel: string, event: string, data: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const header = JSON.stringify({ type: 'binary', channel, event })
      const encoder = new TextEncoder()
      const headerBuffer = encoder.encode(header)

      const totalBuffer = new Uint8Array(4 + headerBuffer.length + data.byteLength)
      const dv = new DataView(totalBuffer.buffer)
      dv.setInt32(0, headerBuffer.length, true)

      totalBuffer.set(headerBuffer, 4)
      totalBuffer.set(new Uint8Array(data), 4 + headerBuffer.length)

      this.ws.send(totalBuffer)
    }
  }

  private handleBinaryMessage(data: ArrayBuffer): void {
    if (data.byteLength < 4) {
      return
    }

    const dv = new DataView(data)
    const headerLength = dv.getInt32(0, true)

    if (data.byteLength < 4 + headerLength) {
      return
    }

    try {
      const decoder = new TextDecoder()
      const headerRaw = decoder.decode(data.slice(4, 4 + headerLength))
      const header = JSON.parse(headerRaw)
      const payload = data.slice(4 + headerLength)

      if (header.type === 'binary') {
        const channel = this.channels.get(header.channel)
        if (channel) {
          channel._dispatch(header.event, payload)
        }
      }
    } catch (e) {
      console.error('[Ripple] Failed to parse binary message header', e)
    }
  }

  private handleMessage(raw: string): void {
    try {
      const message: ServerMessage = JSON.parse(raw)

      this.interceptors.execute({ message, direction: 'incoming' }, async () => {
        switch (message.type) {
          case 'connected':
            this.socketId = message.socketId
            if (message.reconnectionToken) {
              this.reconnectionToken = message.reconnectionToken
            }
            this.processPendingSubscriptions()
            break

          case 'subscribed':
            // Channel subscription confirmed
            break

          case 'unsubscribed':
            // Channel unsubscription confirmed
            break

          case 'event': {
            if (message.needAck && message.seq !== undefined) {
              this.send({ type: 'ack', seq: message.seq })
            }
            const channel = this.channels.get(message.channel)
            if (channel) {
              channel._dispatch(message.event, message.data)
            }
            break
          }

          case 'presence': {
            if (message.needAck && message.seq !== undefined) {
              this.send({ type: 'ack', seq: message.seq })
            }
            const presenceChannel = this.channels.get(message.channel)
            if (presenceChannel instanceof PresenceChannel) {
              presenceChannel._handlePresence(message.event, message.data)
            }
            break
          }

          case 'ack_received':
            // Message confirmed by server
            break

          case 'error':
            console.error('[Ripple] Server error:', message.message, message.channel)
            break

          case 'pong':
            // Heartbeat response
            break
        }
      })
    } catch (_error) {
      console.error('[Ripple] Failed to parse message:', raw)
    }
  }

  private handleDisconnect(): void {
    const wasConnected = this.stateManager.getState() === 'connected'
    this.stateManager.setState('disconnected')
    this.socketId = null

    if (wasConnected && this.config.autoReconnect) {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[Ripple] Max reconnect attempts reached')
      return
    }

    this.stateManager.setState('reconnecting')
    this.reconnectAttempts++

    const delay = this.config.reconnectDelay * 2 ** (this.reconnectAttempts - 1)

    this.reconnectTimer = setTimeout(() => {
      console.log(`[Ripple] Reconnecting... (attempt ${this.reconnectAttempts})`)
      this.connect().catch(() => {
        // Will trigger handleDisconnect which will reschedule
      })
    }, delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private processPendingSubscriptions(): void {
    for (const channel of this.pendingSubscriptions) {
      if (channel.startsWith('private-') || channel.startsWith('presence-')) {
        this.subscribePrivate(channel)
      } else {
        this.subscribe(channel)
      }
    }
    this.pendingSubscriptions.clear()
  }
}

/**
 * Create a new Ripple client
 */
export function createRippleClient(config: RippleClientConfig): RippleClient {
  return new RippleClient(config)
}
