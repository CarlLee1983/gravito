/**
 * @fileoverview TCP Connection wrapper for Bun native sockets
 * @module @gravito/quark/TcpConnection
 */

import type { ITcpConnection } from './types'
import { ConnectionState } from './types'

/**
 * Wrapper around Bun's native socket for TCP connections
 *
 * Provides event-driven interface and protocol abstraction
 */
export class TcpConnection implements ITcpConnection {
  readonly id: string
  readonly remoteAddress: string
  state: ConnectionState = ConnectionState.CONNECTING

  private socket: any
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>()
  private recvBuffer = new Uint8Array(0)

  /**
   * Create a new TCP connection wrapper
   *
   * @param socket - Bun native socket
   * @param id - Unique connection identifier
   * @param remoteAddress - Remote peer address (IP:port)
   */
  constructor(socket: any, id: string, remoteAddress: string) {
    this.socket = socket
    this.id = id
    this.remoteAddress = remoteAddress

    // Setup socket event handlers
    this.setupSocketHandlers()
  }

  /**
   * Send data to remote peer
   *
   * @param data - Data to send (string or bytes)
   * @returns true if buffered successfully, false if buffer is full (backpressure)
   */
  send(data: string | Uint8Array): boolean {
    if (this.state !== ConnectionState.CONNECTED) {
      throw new Error(`Cannot send data in ${this.state} state`)
    }

    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data

    try {
      this.socket.write(buffer)
      return true
    } catch {
      // Backpressure or socket error
      return false
    }
  }

  /**
   * Close the connection gracefully
   */
  async close(): Promise<void> {
    if (this.state === ConnectionState.CLOSED || this.state === ConnectionState.CLOSING) {
      return
    }

    this.state = ConnectionState.CLOSING

    try {
      this.socket.close()
    } catch {
      // Socket already closed
    }

    this.state = ConnectionState.CLOSED
    this.emit('close')
  }

  /**
   * Get the amount of data buffered for sending (bytes)
   */
  getBufferedAmount(): number {
    return this.socket.getBufferedAmount?.() ?? 0
  }

  /**
   * Register an event listener
   *
   * @param event - Event name ('message', 'drain', 'close', 'error')
   * @param listener - Event handler callback
   */
  on(event: string, listener: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }

    this.listeners.get(event)!.add(listener)
  }

  /**
   * Unregister an event listener
   */
  off(event: string, listener: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(listener)
  }

  /**
   * Emit an event to all registered listeners
   */
  private emit(event: string, ...args: unknown[]): void {
    const listeners = this.listeners.get(event)
    if (!listeners) return

    for (const listener of listeners) {
      try {
        listener(...args)
      } catch (error) {
        console.error(`Error in listener for event '${event}':`, error)
      }
    }
  }

  /**
   * Setup native socket event handlers
   */
  private setupSocketHandlers(): void {
    // Handle data reception
    this.socket.ondata = (buffer: Uint8Array) => {
      // Append to receive buffer
      const newBuffer = new Uint8Array(this.recvBuffer.length + buffer.length)
      newBuffer.set(this.recvBuffer)
      newBuffer.set(buffer, this.recvBuffer.length)
      this.recvBuffer = newBuffer

      // Emit raw message event with accumulated data
      this.emit('message', this.recvBuffer)
    }

    // Handle connection open
    this.socket.onopen = () => {
      this.state = ConnectionState.CONNECTED
      this.emit('connect')
    }

    // Handle drain (buffer emptied, can resume sending)
    this.socket.ondrain = () => {
      this.emit('drain')
    }

    // Handle close
    this.socket.onclose = () => {
      this.state = ConnectionState.CLOSED
      this.listeners.clear()
      this.emit('close')
    }

    // Handle error
    this.socket.onerror = (error: Error) => {
      this.state = ConnectionState.ERROR
      this.emit('error', error)
    }
  }
}
