/**
 * @fileoverview Core abstraction layer for Ripple WebSocket engines
 *
 * Defines the interface that all WebSocket engines must implement to work with Ripple.
 * This abstraction allows Ripple to run on different runtimes (Bun, Node.js with uWS, Node.js with ws).
 *
 * @module @gravito/ripple/engines
 * @since 5.0.0
 */

import type { ClientData } from '../types'

/**
 * Runtime-agnostic WebSocket connection interface.
 *
 * Provides a unified API across different WebSocket implementations (Bun, uWS, ws).
 * Each engine wraps its native WebSocket type to implement this interface.
 *
 * @example
 * ```typescript
 * // Engine implementations wrap their native WebSocket
 * class BunRippleSocket implements RippleSocket {
 *   constructor(private ws: ServerWebSocket<ClientData>) {}
 *
 *   send(data: string | Uint8Array) {
 *     this.ws.send(data)
 *   }
 *
 *   get data() {
 *     return this.ws.data
 *   }
 * }
 * ```
 */
export interface RippleSocket {
  /** Unique socket identifier */
  id: string

  /** Client session data */
  data: ClientData

  /**
   * Send data to the client.
   *
   * @param data - Message payload (string or binary)
   * @param compress - Whether to compress the message (optional, engine-dependent)
   */
  send(data: string | Uint8Array, compress?: boolean): void

  /**
   * Close the WebSocket connection.
   *
   * @param code - WebSocket close code (default: 1000)
   * @param reason - Human-readable close reason
   */
  close(code?: number, reason?: string): void

  /**
   * Get the number of bytes buffered for sending.
   * Used for backpressure management.
   *
   * @returns Buffered bytes count
   */
  getBufferedAmount(): number

  /**
   * Subscribe to a pub/sub topic.
   *
   * For engines with native pub/sub (Bun, uWS), this uses the native API.
   * For engines without (ws), this is tracked in-memory by the engine.
   *
   * @param topic - Topic name to subscribe to
   */
  subscribe(topic: string): void

  /**
   * Unsubscribe from a pub/sub topic.
   *
   * @param topic - Topic name to unsubscribe from
   */
  unsubscribe(topic: string): void

  /**
   * Publish a message to a topic.
   *
   * For engines with native pub/sub, this broadcasts at the C++ layer.
   * For engines without, this is handled by the engine's broadcast logic.
   *
   * @param topic - Topic name
   * @param data - Message payload
   */
  publish(topic: string, data: string | Uint8Array): void

  /**
   * Access to the underlying native WebSocket object.
   *
   * This is an escape hatch for engine-specific features not covered by the interface.
   * Use with caution as it breaks runtime portability.
   *
   * @example
   * ```typescript
   * // Access Bun-specific features
   * if (socket.raw && 'remoteAddress' in socket.raw) {
   *   console.log('Client IP:', socket.raw.remoteAddress)
   * }
   * ```
   */
  raw?: any
}

/**
 * WebSocket engine interface for Ripple.
 *
 * Engines handle the low-level WebSocket I/O and lifecycle management.
 * RippleServer delegates all runtime-specific operations to the engine.
 *
 * @example
 * ```typescript
 * // Example: Custom engine implementation
 * class MyCustomEngine implements IRippleEngine {
 *   private server?: any
 *   private connectionHandler?: (socket: RippleSocket) => void
 *
 *   async listen(port: number): Promise<void> {
 *     this.server = createServer(port)
 *     this.server.on('connection', (ws) => {
 *       const socket = new MyRippleSocket(ws)
 *       this.connectionHandler?.(socket)
 *     })
 *   }
 *
 *   onConnection(handler: (socket: RippleSocket) => void): void {
 *     this.connectionHandler = handler
 *   }
 *
 *   // ... implement other methods
 * }
 * ```
 */
export interface IRippleEngine {
  /** Engine name for logging and debugging */
  readonly name: string

  /**
   * Start the WebSocket server.
   *
   * @param port - Port number to listen on
   * @throws If the port is already in use or binding fails
   */
  listen(port: number): Promise<void>

  /**
   * Stop the WebSocket server and close all connections.
   */
  close(): Promise<void>

  /**
   * Register handler for new WebSocket connections.
   *
   * Called by RippleServer to hook into the connection lifecycle.
   * The engine should call this handler whenever a new WebSocket connection is established.
   *
   * @param handler - Callback invoked when a client connects
   */
  onConnection(handler: (socket: RippleSocket) => void): void

  /**
   * Register handler for WebSocket disconnections.
   *
   * Called by RippleServer to hook into the disconnection lifecycle.
   * The engine should call this handler whenever a WebSocket connection closes.
   *
   * @param handler - Callback invoked when a client disconnects
   */
  onDisconnection(handler: (socket: RippleSocket, code: number, reason: string) => void): void

  /**
   * Register handler for incoming WebSocket messages.
   *
   * Called by RippleServer to hook into the message lifecycle.
   * The engine should call this handler whenever a message is received.
   *
   * @param handler - Callback invoked when a message is received
   */
  onMessage(handler: (socket: RippleSocket, message: string | Uint8Array) => void): void

  /**
   * Broadcast a message to all subscribers of a topic.
   *
   * For engines with native pub/sub (Bun, uWS), this should use the native broadcast API
   * for maximum performance (C++ layer broadcast, no JS callback overhead).
   *
   * For engines without native pub/sub (ws), this should iterate over subscribers
   * and send the message to each.
   *
   * @param topic - Topic/channel name
   * @param data - Message payload
   * @param excludeSocketId - Optional socket ID to exclude from broadcast
   */
  broadcast(topic: string, data: string | Uint8Array, excludeSocketId?: string): void

  /**
   * Upgrade an HTTP request to a WebSocket connection.
   *
   * This is optional and only needed for engines that integrate with HTTP servers
   * (Bun, uWS). For standalone WebSocket servers, this can be omitted.
   *
   * @param req - HTTP request object
   * @param options - Upgrade options (e.g., user ID for authentication)
   * @returns true if upgrade was successful, false otherwise
   */
  upgrade?(req: Request, options?: { userId?: string; reconnectionToken?: string }): boolean
}

/**
 * Factory function type for creating engine instances.
 *
 * @param config - Engine-specific configuration
 * @returns Engine instance
 */
export type EngineFactory = (config: any) => IRippleEngine
