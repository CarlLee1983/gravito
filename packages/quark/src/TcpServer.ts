/**
 * @fileoverview TCP Server implementation using Bun native API
 * @module @gravito/quark/TcpServer
 */

import { randomUUID } from 'crypto'
import { TcpConnection } from './TcpConnection'
import type { ITcpConnection, ITcpServer, TcpServerConfig } from './types'

/**
 * TCP Server implementation using Bun.listen()
 *
 * Provides a simple interface for accepting TCP connections
 * and emitting connection events
 *
 * @example
 * ```typescript
 * const server = new TcpServer({ port: 3000 })
 *
 * server.onConnection((conn) => {
 *   console.log(`Client connected: ${conn.remoteAddress}`)
 *
 *   conn.on('message', (data) => {
 *     console.log(`Received: ${Buffer.from(data).toString()}`)
 *     conn.send(`Echo: ${Buffer.from(data).toString()}`)
 *   })
 * })
 *
 * await server.listen()
 * ```
 */
export class TcpServer implements ITcpServer {
  private config: TcpServerConfig & {
    hostname: string
    highWaterMark: number
    maxBufferSize: number
  }
  private server: any | null = null
  private connections = new WeakMap<ITcpConnection, boolean>()
  private connectionHandler?: (connection: ITcpConnection) => void
  private errorHandler?: (error: Error) => void

  /**
   * Create a new TCP server
   */
  constructor(config: TcpServerConfig) {
    this.config = {
      ...config,
      hostname: config.hostname ?? '0.0.0.0',
      highWaterMark: config.highWaterMark ?? 65536,
      maxBufferSize: config.maxBufferSize ?? 10 * 1024 * 1024,
    }
  }

  /**
   * Register handler for new connections
   */
  onConnection(handler: (connection: ITcpConnection) => void): void {
    this.connectionHandler = handler
  }

  /**
   * Register error handler
   */
  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler
  }

  /**
   * Start listening for connections
   */
  async listen(): Promise<void> {
    if (this.server !== null) {
      throw new Error('Server is already listening')
    }

    try {
      this.server = Bun.listen({
        hostname: this.config.hostname,
        port: this.config.port,
        socket: {
          data: (socket, data) => {
            this.handleSocketData(socket, data)
          },
          open: (socket) => {
            this.handleSocketOpen(socket)
          },
          close: (socket) => {
            this.handleSocketClose(socket)
          },
          error: (socket, error) => {
            this.handleSocketError(socket, error)
          },
          drain: (socket) => {
            this.handleSocketDrain(socket)
          },
        },
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.errorHandler?.(err)
      throw err
    }
  }

  /**
   * Stop server and close all connections
   */
  async close(): Promise<void> {
    if (this.server === null) {
      return
    }

    try {
      this.server.stop()
      this.server = null
    } catch (error) {
      console.error('Error closing server:', error)
    }
  }

  /**
   * Handle incoming data on socket
   */
  private handleSocketData(_socket: any, data: Uint8Array): void {
    // In a production implementation, look up connection by socket
    // For now, emit is handled internally in TcpConnection
    console.debug(`Received ${data.length} bytes`)
  }

  /**
   * Handle socket open
   */
  private handleSocketOpen(socket: any): void {
    const id = randomUUID()
    const remoteAddress = socket.remoteAddress ?? 'unknown'

    const conn = new TcpConnection(socket, id, remoteAddress)
    this.connections.set(conn, true)

    this.connectionHandler?.(conn)
  }

  /**
   * Handle socket close
   */
  private handleSocketClose(_socket: any): void {
    // Connection cleanup handled by TcpConnection
  }

  /**
   * Handle socket error
   */
  private handleSocketError(_socket: any, error: Error): void {
    // Error handling delegated to TcpConnection
    this.errorHandler?.(error)
  }

  /**
   * Handle socket drain (buffer emptied)
   */
  private handleSocketDrain(_socket: any): void {
    // Drain event handled internally in TcpConnection
  }
}
