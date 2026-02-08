/**
 * @fileoverview Bun native WebSocket engine implementation
 *
 * Wraps Bun's native WebSocket API to implement the IRippleEngine interface.
 * This is the default and highest-performance engine for Ripple.
 *
 * @module @gravito/ripple/engines
 * @since 5.0.0
 */

import type { Server, ServerWebSocket } from 'bun'
import type { ClientData } from '../types'
import type { IRippleEngine, RippleSocket } from './IRippleEngine'

/**
 * Wrapper around Bun's ServerWebSocket to implement RippleSocket interface.
 *
 * This is a zero-overhead wrapper that delegates all operations to the native
 * Bun WebSocket object. No proxies or additional allocations.
 */
export class BunRippleSocket implements RippleSocket {
  constructor(private ws: ServerWebSocket<ClientData>) {}

  get id(): string {
    return this.ws.data.id
  }

  get data(): ClientData {
    return this.ws.data
  }

  send(data: string | Uint8Array, compress?: boolean): void {
    this.ws.send(data, compress)
  }

  close(code?: number, reason?: string): void {
    this.ws.close(code, reason)
  }

  getBufferedAmount(): number {
    return this.ws.getBufferedAmount()
  }

  subscribe(topic: string): void {
    this.ws.subscribe(topic)
  }

  unsubscribe(topic: string): void {
    this.ws.unsubscribe(topic)
  }

  publish(topic: string, data: string | Uint8Array): void {
    this.ws.publish(topic, data)
  }

  get raw(): ServerWebSocket<ClientData> {
    return this.ws
  }
}

/**
 * Configuration for BunEngine.
 */
export interface BunEngineConfig {
  /** Port to listen on */
  port?: number
  /** Hostname to bind to */
  hostname?: string
  /** TLS configuration */
  tls?: {
    cert: string
    key: string
  }
  /** Development mode (enables verbose logging) */
  development?: boolean
}

/**
 * Bun native WebSocket engine.
 *
 * Leverages Bun's high-performance WebSocket implementation with native pub/sub support.
 * This engine provides the best performance and is the default choice for Bun runtime.
 *
 * @example
 * ```typescript
 * const engine = new BunEngine({ port: 3000 })
 *
 * engine.onConnection((socket) => {
 *   console.log('Client connected:', socket.id)
 * })
 *
 * await engine.listen(3000)
 * ```
 */
export class BunEngine implements IRippleEngine {
  readonly name = 'bun'

  private server?: Server<ClientData>
  private connectionHandler?: (socket: RippleSocket) => void
  private disconnectionHandler?: (socket: RippleSocket, code: number, reason: string) => void
  private messageHandler?: (socket: RippleSocket, message: string | Uint8Array) => void
  private sockets = new Map<string, BunRippleSocket>()

  constructor(private config: BunEngineConfig = {}) {}

  onConnection(handler: (socket: RippleSocket) => void): void {
    this.connectionHandler = handler
  }

  onDisconnection(handler: (socket: RippleSocket, code: number, reason: string) => void): void {
    this.disconnectionHandler = handler
  }

  onMessage(handler: (socket: RippleSocket, message: string | Uint8Array) => void): void {
    this.messageHandler = handler
  }

  async listen(port: number): Promise<void> {
    this.server = Bun.serve<ClientData>({
      port: port,
      hostname: this.config.hostname,
      tls: this.config.tls,
      development: this.config.development,

      fetch: (_req, _server) => {
        // This will be called by RippleServer.upgrade()
        // We don't handle fetch here, just return 404
        return new Response('WebSocket endpoint. Use upgrade() to connect.', { status: 404 })
      },

      websocket: {
        open: (ws) => {
          const socket = new BunRippleSocket(ws)
          this.sockets.set(socket.id, socket)
          this.connectionHandler?.(socket)
        },

        message: (ws, message) => {
          const socket = this.sockets.get(ws.data.id)
          if (!socket) {
            return
          }

          const data =
            typeof message === 'string'
              ? message
              : message instanceof Buffer
                ? new Uint8Array(message.buffer, message.byteOffset, message.byteLength)
                : new Uint8Array(message as unknown as ArrayBuffer)

          this.messageHandler?.(socket, data)
        },

        close: (ws, code, reason) => {
          const socket = this.sockets.get(ws.data.id)
          if (!socket) {
            return
          }

          this.disconnectionHandler?.(socket, code, reason)
          this.sockets.delete(ws.data.id)
        },

        drain: (_ws) => {
          // Backpressure drained - no-op for now
          // Could emit event if needed
        },
      },
    })
  }

  async close(): Promise<void> {
    if (this.server) {
      this.server.stop()
      this.server = undefined
    }
    this.sockets.clear()
  }

  broadcast(topic: string, data: string | Uint8Array, excludeSocketId?: string): void {
    if (!this.server) {
      return
    }

    // Bun's native pub/sub - extremely efficient (C++ layer broadcast)
    // If we need to exclude a socket, we have to do it manually
    if (excludeSocketId) {
      // Iterate and send to each socket except the excluded one
      for (const [id, socket] of this.sockets) {
        if (id !== excludeSocketId && socket.raw.isSubscribed(topic)) {
          socket.send(data)
        }
      }
    } else {
      // Use native broadcast for maximum performance
      this.server.publish(topic, data)
    }
  }

  /**
   * Upgrade an HTTP request to a WebSocket connection.
   *
   * This method is called by RippleServer to handle WebSocket upgrade requests.
   *
   * @param req - HTTP request
   * @param options - Upgrade options (userId, reconnectionToken)
   * @returns true if upgrade succeeded, false otherwise
   */
  upgrade(req: Request, options?: { userId?: string; reconnectionToken?: string }): boolean {
    if (!this.server) {
      // Server not started - cannot upgrade
      return false
    }

    const url = new URL(req.url)
    const reconnectionToken =
      options?.reconnectionToken ?? url.searchParams.get('reconnection_token') ?? undefined

    const success = this.server.upgrade(req, {
      data: {
        id: crypto.randomUUID(),
        channels: new Set<string>(),
        userId: options?.userId,
        reconnectionToken,
      } satisfies ClientData,
    })

    return success
  }

  /**
   * Get the underlying Bun server instance.
   * Useful for advanced use cases.
   */
  getServer(): Server<ClientData> | undefined {
    return this.server
  }
}
