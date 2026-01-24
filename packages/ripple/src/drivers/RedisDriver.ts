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

export class RedisDriver implements RippleDriver {
  readonly name = 'redis'

  private redis?: RedisClient
  private subscriber?: RedisClient
  private channelPrefix: string
  private subscriptions = new Map<string, Set<(event: string, data: unknown) => void>>()
  private _initialized = false
  private _connected = false
  private _lastError?: string
  private logger: RippleLogger

  constructor(private config: RedisDriverConfig = {}) {
    this.channelPrefix = config.keyPrefix ?? 'ripple:'
    this.logger = config.logger ?? createLogger('RedisDriver')
  }

  get isInitialized(): boolean {
    return this._initialized
  }

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

  getStatus(): DriverStatus {
    return {
      name: this.name,
      initialized: this._initialized,
      connected: this._connected,
      lastError: this._lastError,
    }
  }

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

  private handleError(source: 'publisher' | 'subscriber', error: Error): void {
    this._lastError = `${source}: ${error.message}`
    this.logger.error(`Redis ${source} error`, {
      error: error.message,
      errorCode: 'REDIS_CONNECTION_FAILED',
    })
  }

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

export interface RedisDriverConfig {
  host?: string
  port?: number
  password?: string
  db?: number
  keyPrefix?: string
  logger?: RippleLogger
  connectTimeout?: number
  commandTimeout?: number
  enableReadyCheck?: boolean
  lazyConnect?: boolean
}
