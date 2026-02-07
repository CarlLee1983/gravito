/**
 * @fileoverview uWebSockets.js engine implementation for Node.js
 *
 * Wraps uWebSockets.js API to implement the IRippleEngine interface.
 * This engine provides high performance on Node.js, close to Bun's native performance.
 *
 * @module @gravito/ripple/engines
 * @since 5.0.0
 */

import { randomUUID } from 'node:crypto'
import type { ClientData } from '../types'
import type { IRippleEngine, RippleSocket } from './IRippleEngine'

// uWebSockets.js types (will be installed as optional peer dependency)
interface WebSocket {
  send(message: string | ArrayBuffer, isBinary?: boolean, compress?: boolean): number
  close(): void
  getBufferedAmount(): number
  subscribe(topic: string): void
  unsubscribe(topic: string): void
  publish(
    topic: string,
    message: string | ArrayBuffer,
    isBinary?: boolean,
    compress?: boolean
  ): boolean
  getUserData(): ClientData
}

interface TemplatedApp {
  ws(
    pattern: string,
    behavior: {
      compression?: number
      maxPayloadLength?: number
      idleTimeout?: number
      maxBackpressure?: number
      upgrade?: (res: any, req: any, context: any) => void
      open?: (ws: WebSocket) => void
      message?: (ws: WebSocket, message: ArrayBuffer, isBinary: boolean) => void
      drain?: (ws: WebSocket) => void
      close?: (ws: WebSocket, code: number, message: ArrayBuffer) => void
    }
  ): TemplatedApp
  listen(port: number, callback: (listenSocket: any) => void): TemplatedApp
  publish(
    topic: string,
    message: string | ArrayBuffer,
    isBinary?: boolean,
    compress?: boolean
  ): boolean
}

interface UWebSocketsModule {
  App(options?: { cert_file_name?: string; key_file_name?: string }): TemplatedApp
  DEDICATED_COMPRESSOR_3KB: number
  SHARED_COMPRESSOR: number
  DISABLED: number
}

/**
 * Wrapper around uWebSockets.js WebSocket to implement RippleSocket interface.
 *
 * This is a zero-overhead wrapper that delegates all operations to the uWebSockets.js
 * WebSocket object.
 */
export class UWebSocketsRippleSocket implements RippleSocket {
  constructor(private ws: WebSocket) {}

  get id(): string {
    return this.ws.getUserData().id
  }

  get data(): ClientData {
    return this.ws.getUserData()
  }

  send(data: string | Uint8Array, compress?: boolean): void {
    if (typeof data === 'string') {
      this.ws.send(data, false, compress)
    } else {
      // Convert Uint8Array to ArrayBuffer
      const buffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      ) as ArrayBuffer
      this.ws.send(buffer, true, compress)
    }
  }

  close(code?: number, reason?: string): void {
    // uWebSockets.js doesn't support close codes/reasons directly
    // We just close the connection
    this.ws.close()
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
    if (typeof data === 'string') {
      this.ws.publish(topic, data, false)
    } else {
      const buffer = data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength
      ) as ArrayBuffer
      this.ws.publish(topic, buffer, true)
    }
  }

  get raw(): WebSocket {
    return this.ws as unknown as any // Cast to any because it's a uWS socket, not DOM WebSocket
  }
}

/**
 * Configuration for uWebSocketsEngine.
 */
export interface UWebSocketsEngineConfig {
  /** Port to listen on */
  port?: number
  /** Hostname to bind to */
  hostname?: string
  /** TLS configuration */
  tls?: {
    cert: string
    key: string
  }
  /** Compression mode (0 = disabled, 1 = shared, 3 = dedicated 3KB) */
  compression?: number
  /** Maximum payload length in bytes (default: 16MB) */
  maxPayloadLength?: number
  /** Idle timeout in seconds (default: 120) */
  idleTimeout?: number
  /** Maximum backpressure in bytes (default: 1MB) */
  maxBackpressure?: number
  /** Development mode (enables verbose logging) */
  development?: boolean
}

/**
 * uWebSockets.js engine for Node.js.
 *
 * Leverages uWebSockets.js high-performance WebSocket implementation with native pub/sub support.
 * This engine provides excellent performance on Node.js (~90% of Bun's performance).
 */
export class UWebSocketsEngine implements IRippleEngine {
  readonly name = 'node-uws'

  private app?: TemplatedApp
  private uws?: UWebSocketsModule
  private connectionHandler?: (socket: RippleSocket) => void
  private disconnectionHandler?: (socket: RippleSocket, code: number, reason: string) => void
  private messageHandler?: (socket: RippleSocket, message: string | Uint8Array) => void
  private sockets = new Map<string, UWebSocketsRippleSocket>()
  private listenSocket?: any

  constructor(private config: UWebSocketsEngineConfig = {}) {}

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
    // Dynamically import uWebSockets.js (optional peer dependency)
    try {
      // @ts-expect-error: uWebSockets.js is not installed locally
      this.uws = await import('uWebSockets.js')
    } catch (_error) {
      throw new Error(
        'uWebSockets.js is not installed. Install it with: npm install uWebSockets.js@uNetworking/uWebSockets.js#v20.44.0'
      )
    }

    if (!this.uws) throw new Error('Failed to load uWebSockets.js module')

    // Create uWebSockets.js app
    this.app = this.config.tls
      ? this.uws.App({
          cert_file_name: this.config.tls.cert,
          key_file_name: this.config.tls.key,
        })
      : this.uws.App()

    // Configure WebSocket route
    this.app.ws('/*', {
      compression: this.config.compression ?? this.uws.SHARED_COMPRESSOR,
      maxPayloadLength: this.config.maxPayloadLength ?? 16 * 1024 * 1024, // 16MB
      idleTimeout: this.config.idleTimeout ?? 120,
      maxBackpressure: this.config.maxBackpressure ?? 1024 * 1024, // 1MB

      open: (ws) => {
        // Initialize ClientData on connection
        const data = ws.getUserData()

        // Use Node.js crypto for UUIDs
        const id = randomUUID()

        // Manually hydrate the ClientData object which is empty initially
        Object.assign(data, {
          id,
          channels: new Set<string>(),
          remoteAddress: undefined, // uWS usually provides remote address via specialized API, skipping for now
        })

        const socket = new UWebSocketsRippleSocket(ws)
        this.sockets.set(socket.id, socket)
        this.connectionHandler?.(socket)
      },

      message: (ws, message, isBinary) => {
        const data = ws.getUserData()
        const socket = this.sockets.get(data.id)
        if (!socket) return

        // Convert ArrayBuffer to Uint8Array or string
        const payload = isBinary ? new Uint8Array(message) : new TextDecoder().decode(message)

        this.messageHandler?.(socket, payload)
      },

      drain: (ws) => {
        // Handle backpressure
        if (this.config.development) {
          const buffered = ws.getBufferedAmount()
          if (buffered > 0) {
            console.log(`[uWS] Draining backpressure: ${buffered} bytes`)
          }
        }
      },

      close: (ws, code, message) => {
        const data = ws.getUserData()
        const socket = this.sockets.get(data.id)
        if (!socket) return

        const reason = new TextDecoder().decode(message)
        this.disconnectionHandler?.(socket, code, reason)
        this.sockets.delete(data.id)
      },
    })

    // Start listening
    return new Promise((resolve, reject) => {
      this.app!.listen(port, (listenSocket) => {
        if (listenSocket) {
          this.listenSocket = listenSocket
          resolve()
        } else {
          reject(new Error(`Failed to listen on port ${port}`))
        }
      })
    })
  }

  async close(): Promise<void> {
    // Close all active connections
    for (const socket of this.sockets.values()) {
      socket.close()
    }
    this.sockets.clear()

    // Close the listen socket
    if (this.listenSocket && this.uws) {
      this.listenSocket = undefined
    }

    this.app = undefined
  }

  broadcast(topic: string, data: string | Uint8Array, excludeSocketId?: string): void {
    if (!this.app) {
      throw new Error('Engine not started. Call listen() first.')
    }

    // Note: uWebSockets.js doesn't support excluding specific sockets in native pub/sub
    // If excludeSocketId is provided, we need to iterate manually
    if (excludeSocketId) {
      for (const socket of this.sockets.values()) {
        if (socket.id !== excludeSocketId) {
          socket.send(data)
        }
      }
    } else {
      // Use native pub/sub for better performance
      if (typeof data === 'string') {
        this.app.publish(topic, data, false)
      } else {
        // Safe cast for ArrayBufferLike
        const buffer = data.buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength
        ) as ArrayBuffer
        this.app.publish(topic, buffer, true)
      }
    }
  }

  getConnectedSockets(): RippleSocket[] {
    return Array.from(this.sockets.values())
  }

  getSocket(id: string): RippleSocket | undefined {
    return this.sockets.get(id)
  }

  /**
   * Upgrade an HTTP request to WebSocket.
   *
   * Note: This method is not used in the engine-based architecture.
   * uWebSockets.js handles upgrades internally via the ws() route.
   */
  upgrade(_req: Request, _data?: Record<string, unknown>): boolean {
    throw new Error('upgrade() is not supported in uWebSocketsEngine. Use the ws() route instead.')
  }
}
