/**
 * @fileoverview Redis driver for @gravito/ripple
 *
 * @module @gravito/ripple/drivers
 */

import type { Redis as RedisClient, RedisOptions } from 'ioredis'
import { RippleDriverError } from '../errors/RippleError'
import type { RippleLogger } from '../logging/Logger'
import { createLogger } from '../logging/Logger'
import type { DriverStatus, RippleDriver } from '../types'

/**
 * Configuration for the RedisDriver.
 */
export interface RedisDriverConfig {
  /** Redis server hostname (default: 'localhost') */
  host?: string
  /** Redis server port (default: 6379) */
  port?: number
  /** Redis password for authentication */
  password?: string
  /** Redis database index (default: 0) */
  db?: number
  /** Prefix for Ripple Redis channels (default: 'ripple:') */
  keyPrefix?: string
  /** Custom logger instance */
  logger?: RippleLogger
  /** Connection timeout in milliseconds (default: 5000) */
  connectTimeout?: number
  /** Command timeout in milliseconds (default: 3000) */
  commandTimeout?: number
  /** Whether to enable ready check (default: true) */
  enableReadyCheck?: boolean
  /** Whether to connect lazily (default: false) */
  lazyConnect?: boolean
}

/**
 * Redis driver for Ripple, enabling horizontal scaling via Redis Pub/Sub.
 *
 * This driver distributes messages across multiple server instances, allowing
 * clients connected to different servers to receive the same broadcasts.
 *
 * @example
 * ```typescript
 * import { RippleServer, RedisDriver } from '@gravito/ripple'
 *
 * const server = new RippleServer({
 *   driver: 'redis',
 *   redis: {
 *     host: 'localhost',
 *     port: 6379,
 *     password: 'secret_password'
 *   }
 * })
 * ```
 */
export class RedisDriver implements RippleDriver {
  /** Driver name identifier */
  readonly name = 'redis'

  /** Redis client for publishing messages */
  private redis?: RedisClient
  /** Redis client for subscribing to messages */
  private subscriber?: RedisClient
  /** Prefix for Redis channels to avoid collisions */
  private channelPrefix: string
  /** Local subscription map: channel -> callbacks */
  private subscriptions = new Map<string, Set<(event: string, data: unknown) => void>>()
  private _initialized = false
  private _connected = false
  private _lastError?: string
  private logger: RippleLogger

  /**
   * Create a new RedisDriver.
   *
   * @param config - Redis connection and behavior configuration
   */
  constructor(private config: RedisDriverConfig = {}) {
    this.channelPrefix = config.keyPrefix ?? 'ripple:'
    this.logger = config.logger ?? createLogger('RedisDriver')
  }

  /**
   * Check if the driver has been initialized.
   */
  get isInitialized(): boolean {
    return this._initialized
  }

  /**
   * Initialize the Redis connections (Publisher and Subscriber).
   *
   * This method performs dynamic import of 'ioredis' to avoid mandatory
   * dependency on users who only use the local driver.
   *
   * @throws {RippleDriverError} If 'ioredis' is not installed or connection fails
   */
  async init(): Promise<void> {
    if (this._initialized) {
      this.logger.debug('RedisDriver already initialized, skipping')
      return
    }

    this.logger.info('Initializing RedisDriver', {
      host: this.config.host ?? 'localhost',
      port: this.config.port ?? 6379,
    })

    try {
      const Redis = await this.getRedisClient()

      const redisOptions: RedisOptions = {
        host: this.config.host ?? 'localhost',
        port: this.config.port ?? 6379,
        password: this.config.password,
        db: this.config.db ?? 0,
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
        connectTimeout: this.config.connectTimeout ?? 5000,
        commandTimeout: this.config.commandTimeout ?? 3000,
        enableReadyCheck: this.config.enableReadyCheck ?? true,
        lazyConnect: this.config.lazyConnect ?? false,
      }

      this.redis = new Redis(redisOptions)
      this.subscriber = new Redis(redisOptions)

      this.subscriber.on('message', (channel: string, message: string) => {
        this.handleMessage(channel, message)
      })

      this.subscriber.on('error', (error: Error) => {
        this.handleError('subscriber', error)
      })

      this.subscriber.on('connect', () => {
        this._connected = true
        this.logger.info('Redis subscriber connected')
      })

      this.subscriber.on('close', () => {
        this._connected = false
        this.logger.warn('Redis subscriber connection closed')
      })

      this.redis.on('error', (error: Error) => {
        this.handleError('publisher', error)
      })

      this._initialized = true
      this.logger.info('RedisDriver initialized successfully')
    } catch (error) {
      this._lastError = error instanceof Error ? error.message : String(error)
      this.logger.error('Failed to initialize RedisDriver', {
        error: this._lastError,
        errorCode: 'REDIS_CONNECTION_FAILED',
      })
      throw error
    }
  }

  /**
   * Publish a message to Redis Pub/Sub.
   *
   * @param channel - Target channel name
   * @param event - Event name
   * @param data - Event payload
   * @throws {RippleDriverError} If driver is not initialized
   */
  async publish(channel: string, event: string, data: unknown): Promise<void> {
    if (!this.redis || !this._initialized) {
      throw new RippleDriverError(
        'DRIVER_NOT_INITIALIZED',
        'RedisDriver not initialized. Call init() first.'
      )
    }

    const prefixedChannel = this.channelPrefix + channel
    const message = JSON.stringify({ event, data })

    await this.redis.publish(prefixedChannel, message)
  }

  /**
   * Subscribe to a channel via Redis Pub/Sub.
   *
   * Multiple calls for the same channel will only result in one Redis subscription,
   * while maintaining all local callbacks.
   *
   * @param channel - Channel name
   * @param callback - Function called when a message is received from Redis
   * @throws {RippleDriverError} If driver is not initialized
   */
  async subscribe(
    channel: string,
    callback: (event: string, data: unknown) => void
  ): Promise<void> {
    if (!this.subscriber || !this._initialized) {
      throw new RippleDriverError(
        'DRIVER_NOT_INITIALIZED',
        'RedisDriver not initialized. Call init() first.'
      )
    }

    const prefixedChannel = this.channelPrefix + channel

    if (!this.subscriptions.has(prefixedChannel)) {
      this.subscriptions.set(prefixedChannel, new Set())
      await this.subscriber.subscribe(prefixedChannel)
      this.logger.debug('Subscribed to Redis channel', { channel: prefixedChannel })
    }

    this.subscriptions.get(prefixedChannel)?.add(callback)
  }

  /**
   * Unsubscribe from a channel via Redis Pub/Sub.
   *
   * If no local callbacks remain for the channel, the actual Redis unsubscription
   * is performed.
   *
   * @param channel - Channel name
   */
  async unsubscribe(channel: string): Promise<void> {
    if (!this.subscriber) {
      return
    }

    const prefixedChannel = this.channelPrefix + channel

    this.subscriptions.delete(prefixedChannel)

    if (!this.subscriptions.has(prefixedChannel)) {
      await this.subscriber.unsubscribe(prefixedChannel)
    }
  }

  /**
   * Shutdown the Redis driver and close all connections.
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down RedisDriver')

    this.subscriptions.clear()

    if (this.subscriber) {
      try {
        await this.subscriber.quit()
        this.logger.debug('Redis subscriber quit successfully')
      } catch (error) {
        this._lastError = error instanceof Error ? error.message : String(error)
        this.logger.error('Failed to quit Redis subscriber', { error: this._lastError })
      }
      this.subscriber = undefined
    }

    if (this.redis) {
      try {
        await this.redis.quit()
        this.logger.debug('Redis publisher quit successfully')
      } catch (error) {
        this._lastError = error instanceof Error ? error.message : String(error)
        this.logger.error('Failed to quit Redis publisher', { error: this._lastError })
      }
      this.redis = undefined
    }

    this._initialized = false
    this._connected = false
    this.logger.info('RedisDriver shutdown complete')
  }

  /**
   * Get the current status of the Redis driver.
   */
  getStatus(): DriverStatus {
    return {
      name: this.name,
      initialized: this._initialized,
      connected: this._connected,
      lastError: this._lastError,
    }
  }

  /**
   * Handle an incoming message from Redis Pub/Sub.
   *
   * Dispatches the message to all local callbacks registered for the channel.
   */
  private handleMessage(channel: string, message: string): void {
    try {
      const callbacks = this.subscriptions.get(channel)
      if (!callbacks || callbacks.size === 0) {
        return
      }

      const parsed = JSON.parse(message)
      const { event, data } = parsed

      for (const callback of callbacks) {
        callback(event, data)
      }
    } catch (error) {
      this._lastError = error instanceof Error ? error.message : String(error)
      this.logger.error('Failed to handle Redis message', {
        channel,
        error: this._lastError,
      })
    }
  }

  /**
   * Handle Redis client errors.
   */
  private handleError(source: 'publisher' | 'subscriber', error: Error): void {
    this._lastError = `${source}: ${error.message}`
    this.logger.error(`Redis ${source} error`, {
      error: error.message,
      errorCode: 'REDIS_CONNECTION_FAILED',
    })
  }

  /**
   * Dynamically import ioredis to check if it's available.
   *
   * @throws {RippleDriverError} If ioredis package is missing
   */
  private async getRedisClient(): Promise<typeof import('ioredis').default> {
    try {
      const ioredis = await import('ioredis')
      return ioredis.default
    } catch {
      throw new RippleDriverError(
        'REDIS_NOT_INSTALLED',
        'ioredis is required for RedisDriver. Install it with: bun add ioredis'
      )
    }
  }
}
