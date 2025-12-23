/**
 * @fileoverview Ripple WebSocket Client
 *
 * Main client class for connecting to @gravito/ripple server.
 *
 * @module @gravito/ripple-client
 */

import { Channel, PresenceChannel, PrivateChannel } from './Channel'
import type { ClientMessage, RippleClientConfig, ServerMessage } from './types'

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
 */
export class RippleClient {
  private ws: WebSocket | null = null
  private socketId: string | null = null
  private state: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  private channels = new Map<string, Channel>()
  private pendingSubscriptions = new Set<string>()

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
      if (this.state === 'connected') {
        resolve()
        return
      }

      this.state = 'connecting'

      try {
        this.ws = new WebSocket(this.config.host)

        this.ws.onopen = () => {
          this.state = 'connected'
          this.reconnectAttempts = 0
          // Wait for 'connected' message with socketId
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
          // Resolve on first successful connection
          if (this.socketId && this.state === 'connected') {
            resolve()
          }
        }

        this.ws.onclose = () => {
          this.handleDisconnect()
        }

        this.ws.onerror = (error) => {
          if (this.state === 'connecting') {
            reject(new Error('Failed to connect'))
          }
          console.error('[Ripple] WebSocket error:', error)
        }
      } catch (error) {
        this.state = 'disconnected'
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
    this.state = 'disconnected'
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
    return this.state
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
  channel(name: string): Channel {
    if (this.channels.has(name)) {
      return this.channels.get(name)!
    }

    const channel = new Channel(name, (msg) => this.send(msg))
    this.channels.set(name, channel)
    this.subscribe(name)
    return channel
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
    if (this.state !== 'connected') {
      this.pendingSubscriptions.add(channel)
      return
    }

    this.send({ type: 'subscribe', channel })
  }

  private async subscribePrivate(channel: string): Promise<void> {
    if (this.state !== 'connected' || !this.socketId) {
      this.pendingSubscriptions.add(channel)
      return
    }

    // Get auth signature from server
    try {
      const response = await fetch(this.config.authEndpoint!, {
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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private handleMessage(raw: string): void {
    try {
      const message: ServerMessage = JSON.parse(raw)

      switch (message.type) {
        case 'connected':
          this.socketId = message.socketId
          this.processPendingSubscriptions()
          break

        case 'subscribed':
          // Channel subscription confirmed
          break

        case 'unsubscribed':
          // Channel unsubscription confirmed
          break

        case 'event': {
          const channel = this.channels.get(message.channel)
          if (channel) {
            channel._dispatch(message.event, message.data)
          }
          break
        }

        case 'presence': {
          const presenceChannel = this.channels.get(message.channel)
          if (presenceChannel instanceof PresenceChannel) {
            presenceChannel._handlePresence(message.event, message.data)
          }
          break
        }

        case 'error':
          console.error('[Ripple] Server error:', message.message, message.channel)
          break

        case 'pong':
          // Heartbeat response
          break
      }
    } catch (error) {
      console.error('[Ripple] Failed to parse message:', raw)
    }
  }

  private handleDisconnect(): void {
    const wasConnected = this.state === 'connected'
    this.state = 'disconnected'
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

    this.state = 'reconnecting'
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
