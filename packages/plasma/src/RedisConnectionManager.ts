/**
 * Redis Connection Manager
 * @description Manages Redis client connections and configuration
 */

import type { PipelineResult, RedisConfig } from './types'

export interface IORedisModule {
  default: new (options: IORedisOptions) => IORedisClient
}

export interface IORedisOptions {
  host?: string
  port?: number
  password?: string
  db?: number
  connectTimeout?: number
  commandTimeout?: number
  keyPrefix?: string
  maxRetriesPerRequest?: number
  retryStrategy?: () => number | undefined
  lazyConnect?: boolean
  tls?: Record<string, unknown>
}

// biome-ignore lint/suspicious/noExplicitAny: ioredis has complex method signatures
export interface IORedisClient extends Record<string, any> {
  connect(): Promise<void>
  quit(): Promise<'OK'>
  ping(): Promise<string>
  duplicate(): IORedisClient
  pipeline(): IORedisChain
  on(event: string, callback: (...args: unknown[]) => void): void
}

export interface IORedisClientWithCall extends IORedisClient {
  call(command: string, ...args: unknown[]): Promise<unknown>
}

// biome-ignore lint/suspicious/noExplicitAny: ioredis pipeline has dynamic methods
export interface IORedisChain extends Record<string, any> {
  exec(): Promise<PipelineResult>
}

export class RedisConnectionManager {
  private client: IORedisClient | null = null
  private subscriber: IORedisClient | null = null
  private ioredis: IORedisModule | null = null
  private connected = false

  constructor(private readonly config: RedisConfig = {}) {}

  /**
   * Connect to Redis server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return
    }

    this.ioredis = await this.loadIORedis()
    const options = this.buildIORedisOptions()

    this.client = new this.ioredis.default(options)
    await this.client.connect()
    this.connected = true
  }

  /**
   * Disconnect from Redis server
   */
  async disconnect(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit()
      this.subscriber = null
    }

    if (this.client) {
      await this.client.quit()
      this.client = null
    }

    this.connected = false
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.client !== null
  }

  /**
   * Get the main Redis client
   */
  getClient(): IORedisClient {
    if (!this.client) {
      throw new Error('Redis client not connected. Call connect() first.')
    }
    return this.client
  }

  /**
   * Get or create subscriber client
   */
  async getOrCreateSubscriber(): Promise<IORedisClient> {
    if (this.subscriber) {
      return this.subscriber
    }

    if (!this.ioredis) {
      this.ioredis = await this.loadIORedis()
    }

    this.subscriber = this.getClient().duplicate()
    return this.subscriber
  }

  /**
   * Get existing subscriber (if any)
   */
  getSubscriber(): IORedisClient | null {
    return this.subscriber
  }

  /**
   * Ping Redis server
   */
  async ping(): Promise<string> {
    return await this.getClient().ping()
  }

  /**
   * Build ioredis options from config
   */
  private buildIORedisOptions(): IORedisOptions {
    const options: IORedisOptions = {
      host: this.config.host ?? 'localhost',
      port: this.config.port ?? 6379,
      db: this.config.db ?? 0,
      connectTimeout: this.config.connectTimeout ?? 10000,
      maxRetriesPerRequest: this.config.maxRetries ?? 3,
      lazyConnect: true,
    }

    if (this.config.password) {
      options.password = this.config.password
    }
    if (this.config.commandTimeout) {
      options.commandTimeout = this.config.commandTimeout
    }
    if (this.config.keyPrefix) {
      options.keyPrefix = this.config.keyPrefix
    }
    if (this.config.retryDelay) {
      options.retryStrategy = () => this.config.retryDelay
    }
    if (this.config.tls) {
      options.tls = typeof this.config.tls === 'boolean' ? {} : { ...this.config.tls }
    }

    return options
  }

  /**
   * Load ioredis module dynamically
   */
  private async loadIORedis(): Promise<IORedisModule> {
    try {
      const ioredis = await import('ioredis')
      return ioredis as unknown as IORedisModule
    } catch {
      throw new Error(
        'Redis client requires the "ioredis" package. Please install it: bun add ioredis'
      )
    }
  }
}
