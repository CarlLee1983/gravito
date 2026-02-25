/**
 * @fileoverview TCP Client implementation using Bun native API
 * @module @gravito/quark/TcpClient
 */

import { randomUUID } from 'node:crypto'
import { TcpConnection } from './TcpConnection'
import type { ITcpClient, ITcpConnection, RetryOptions, TcpClientOptions } from './types'

/**
 * TCP Client for connecting to remote servers
 *
 * Provides Promise-based connect API with automatic retry support
 *
 * @example
 * ```typescript
 * const client = new TcpClient({
 *   host: 'localhost',
 *   port: 3000
 * })
 *
 * const conn = await client.connect()
 *
 * conn.on('message', (data) => {
 *   console.log(`Received: ${Buffer.from(data).toString()}`)
 * })
 *
 * conn.send('Hello Server')
 * ```
 */
export class TcpClient implements ITcpClient {
  private options: TcpClientOptions

  /**
   * Create a new TCP client
   */
  constructor(options: TcpClientOptions) {
    this.options = {
      timeout: 10000,
      ...options,
    }
  }

  /**
   * Connect to remote server
   *
   * @returns Promise resolving to connected TcpConnection
   * @throws Error if connection fails
   */
  async connect(): Promise<ITcpConnection> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Connection timeout after ${this.options.timeout}ms`))
      }, this.options.timeout)

      try {
        Bun.connect({
          hostname: this.options.host,
          port: this.options.port,
          socket: {
            open: (socket) => {
              clearTimeout(timeoutHandle)
              const id = randomUUID()
              const remoteAddress = `${this.options.host}:${this.options.port}`
              const conn = new TcpConnection(socket as any, id, remoteAddress)
              resolve(conn as ITcpConnection)
            },
            error: (_socket, error) => {
              clearTimeout(timeoutHandle)
              reject(error)
            },
            close: () => {
              clearTimeout(timeoutHandle)
            },
          },
        })
      } catch (error) {
        clearTimeout(timeoutHandle)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  /**
   * Connect with automatic retry on failure
   *
   * @param options - Retry options
   * @returns Promise resolving to connected TcpConnection
   * @throws Error if all retry attempts fail
   *
   * @example
   * ```typescript
   * const conn = await client.connectWithRetry({
   *   maxRetries: 5,
   *   initialDelay: 1000,
   *   backoffMultiplier: 2
   * })
   * ```
   */
  async connectWithRetry(options?: RetryOptions): Promise<ITcpConnection> {
    const retryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 30000,
      ...options,
    }

    let lastError: Error | null = null
    let delay = retryOptions.initialDelay

    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        return await this.connect()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < retryOptions.maxRetries) {
          // Wait before retry
          await this.sleep(delay)

          // Exponential backoff
          delay = Math.min(delay * retryOptions.backoffMultiplier, retryOptions.maxDelay)
        }
      }
    }

    throw lastError ?? new Error('Connection failed after retries')
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
