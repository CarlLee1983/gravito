/**
 * @fileoverview Type definitions for @gravito/quark TCP module
 * @module @gravito/quark
 */

/**
 * TCP connection state enumeration
 */
export enum ConnectionState {
  /** Initial state before connection */
  CONNECTING = 'connecting',
  /** Successfully connected */
  CONNECTED = 'connected',
  /** Connection is closing */
  CLOSING = 'closing',
  /** Connection is closed */
  CLOSED = 'closed',
  /** Connection error occurred */
  ERROR = 'error',
}

/**
 * TCP Server configuration
 */
export interface TcpServerConfig {
  /** Port to listen on */
  port: number
  /** Hostname to bind to (default: '0.0.0.0') */
  hostname?: string
  /** TLS configuration for secure connections */
  tls?: {
    cert: string
    key: string
    ca?: string
  }
  /** High water mark for backpressure (bytes, default: 64KB) */
  highWaterMark?: number
  /** Maximum buffer size per connection (bytes, default: 10MB) */
  maxBufferSize?: number
}

/**
 * TCP Client connection options
 */
export interface TcpClientOptions {
  /** Target hostname */
  host: string
  /** Target port */
  port: number
  /** Enable TLS (default: false) */
  tls?: boolean
  /** Connection timeout (milliseconds, default: 10000) */
  timeout?: number
}

/**
 * TCP Client retry options
 */
export interface RetryOptions {
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number
  /** Initial retry delay (milliseconds, default: 1000) */
  initialDelay?: number
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number
  /** Maximum retry delay (milliseconds, default: 30000) */
  maxDelay?: number
}

/**
 * Frame protocol configuration
 */
export interface FrameProtocolConfig {
  /** Header size in bytes: 2 (uint16) or 4 (uint32) (default: 4) */
  headerSize?: 2 | 4
  /** Byte order: 'big' or 'little' (default: 'big') */
  byteOrder?: 'big' | 'little'
  /** Maximum frame size in bytes (default: 10MB) */
  maxFrameSize?: number
  /** Character encoding for string conversion (default: 'utf-8') */
  encoding?: BufferEncoding
}

/**
 * Line protocol configuration (for line-delimited messages)
 */
export interface LineProtocolConfig {
  /** Line delimiter (default: '\n') */
  delimiter?: string
  /** Character encoding (default: 'utf-8') */
  encoding?: BufferEncoding
}

/**
 * Custom protocol interface
 */
export interface CustomProtocol {
  /** Parse incoming data and extract complete messages */
  parse: (data: Uint8Array) => { message: unknown; remaining: Uint8Array } | null
  /** Encode outgoing message to bytes */
  encode: (message: unknown) => Uint8Array
}

/**
 * TCP Connection interface
 */
export interface ITcpConnection {
  /** Unique connection ID */
  readonly id: string
  /** Remote address (IP:port) */
  readonly remoteAddress: string
  /** Current connection state */
  readonly state: ConnectionState
  /** Send data to remote peer */
  send(data: string | Uint8Array): boolean
  /** Close connection */
  close(): Promise<void>
  /** Get buffered amount (bytes waiting to send) */
  getBufferedAmount(): number
  /** Register connection event listener */
  on(event: string, listener: (...args: unknown[]) => void): void
  /** Unregister event listener */
  off(event: string, listener: (...args: unknown[]) => void): void
}

/**
 * TCP Server interface
 */
export interface ITcpServer {
  /** Start listening for connections */
  listen(): Promise<void>
  /** Stop server and close all connections */
  close(): Promise<void>
  /** Register connection event listener */
  onConnection(handler: (connection: ITcpConnection) => void): void
  /** Register error event listener */
  onError(handler: (error: Error) => void): void
}

/**
 * TCP Client interface
 */
export interface ITcpClient {
  /** Connect to remote server */
  connect(): Promise<ITcpConnection>
  /** Connect with automatic retry */
  connectWithRetry(options?: RetryOptions): Promise<ITcpConnection>
}
