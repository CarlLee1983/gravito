/**
 * @fileoverview Node.js ws engine implementation
 *
 * Wraps the 'ws' library to implement the IRippleEngine interface.
 * Implements in-memory pub/sub since the ws library does not support it natively.
 *
 * @module @gravito/ripple/engines
 * @since 5.0.0
 */

import { type WebSocket, WebSocketServer } from 'ws'
import type { ClientData } from '../types'
import type { IRippleEngine, RippleSocket } from './IRippleEngine'

/**
 * Wrapper around 'ws' WebSocket to implement RippleSocket interface.
 */
export class WsRippleSocket implements RippleSocket {
  constructor(
    private ws: WebSocket,
    private clientData: ClientData,
    private engine: WsEngine
  ) {}

  get id(): string {
    return this.clientData.id
  }

  get data(): ClientData {
    return this.clientData
  }

  send(data: string | Uint8Array, compress?: boolean): void {
    this.ws.send(data, { compress })
  }

  close(code?: number, reason?: string): void {
    this.ws.close(code, reason)
  }

  getBufferedAmount(): number {
    return this.ws.bufferedAmount
  }

  subscribe(topic: string): void {
    this.engine.subscribe(this.id, topic)
  }

  unsubscribe(topic: string): void {
    this.engine.unsubscribe(this.id, topic)
  }

  publish(topic: string, data: string | Uint8Array): void {
    this.engine.broadcast(topic, data)
  }

  get raw(): WebSocket {
    return this.ws
  }
}

/**
 * Configuration for WsEngine.
 */
export interface WsEngineConfig {
  /** Port to listen on */
  port?: number
  /** Hostname to bind to */
  hostname?: string
  /** Development mode */
  development?: boolean
  /** WebSocket path */
  path?: string
}

/**
 * Node.js ws engine.
 *
 * Uses the popular 'ws' library. Provides standard compatibility but
 * uses application-layer pub/sub.
 */
export class WsEngine implements IRippleEngine {
  readonly name = 'node-ws'

  private wss?: WebSocketServer
  private connectionHandler?: (socket: RippleSocket) => void
  private disconnectionHandler?: (socket: RippleSocket, code: number, reason: string) => void
  private messageHandler?: (socket: RippleSocket, message: string | Uint8Array) => void

  private sockets = new Map<string, WsRippleSocket>()
  private subscriptions = new Map<string, Set<string>>() // topic -> Set<socketId>

  constructor(private config: WsEngineConfig = {}) {}

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
    this.wss = new WebSocketServer({
      port: port,
      host: this.config.hostname,
      path: this.config.path,
    })

    this.wss.on('connection', (ws, req) => {
      // Create client data (Ripple context expects this)
      const clientData: ClientData = {
        id: crypto.randomUUID(),
        socketId: crypto.randomUUID(),
        remoteAddress: req.socket.remoteAddress,
      }

      const socket = new WsRippleSocket(ws, clientData, this)
      this.sockets.set(socket.id, socket)

      ws.on('message', (data, isBinary) => {
        let payload: string | Uint8Array
        if (isBinary) {
          payload = data instanceof Uint8Array ? data : new Uint8Array(data as any)
        } else {
          payload = data.toString()
        }
        this.messageHandler?.(socket, payload)
      })

      ws.on('close', (code, reason) => {
        // Cleanup subscriptions
        this.cleanupSocket(socket.id)
        this.sockets.delete(socket.id)
        this.disconnectionHandler?.(socket, code, reason.toString())
      })

      this.connectionHandler?.(socket)
    })

    return new Promise((resolve) => {
      this.wss!.once('listening', () => resolve())
    })
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.wss) return resolve()
      this.wss.close((err) => {
        if (err) return reject(err)
        this.sockets.clear()
        this.subscriptions.clear()
        resolve()
      })
    })
  }

  subscribe(socketId: string, topic: string): void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set())
    }
    this.subscriptions.get(topic)!.add(socketId)
  }

  unsubscribe(socketId: string, topic: string): void {
    this.subscriptions.get(topic)?.delete(socketId)
  }

  private cleanupSocket(socketId: string): void {
    for (const subscribers of this.subscriptions.values()) {
      subscribers.delete(socketId)
    }
  }

  broadcast(topic: string, data: string | Uint8Array, excludeSocketId?: string): void {
    const subscribers = this.subscriptions.get(topic)
    if (!subscribers) return

    for (const socketId of subscribers) {
      if (socketId === excludeSocketId) continue
      const socket = this.sockets.get(socketId)
      socket?.send(data)
    }
  }
}
