/**
 * @fileoverview Redis driver for @gravito/ripple
 *
 * Enables horizontal scaling across multiple server instances using
 * Redis Pub/Sub for message broadcasting.
 *
 * @module @gravito/ripple/drivers
 */

import type { RippleDriver } from '../types'

/**
 * Redis-based driver for multi-server deployments
 *
 * This driver uses Redis Pub/Sub to broadcast messages across multiple
 * server instances, enabling horizontal scaling of WebSocket connections.
 *
 * @example
 * ```typescript
 * const ripple = new RippleServer({
 *   driver: 'redis',
 *   redis: {
 *     host: 'localhost',
 *     port: 6379
 *   }
 * })
 * ```
 */
export class RedisDriver implements RippleDriver {
  readonly name = 'redis'

  private redis: any
  private subscriber: any
  private channelPrefix: string
  private subscriptions = new Map<string, Set<(event: string, data: unknown) => void>>()

  constructor(private config: RedisDriverConfig = {}) {
    this.channelPrefix = config.keyPrefix ?? 'ripple:'
  }

  async init(): Promise<void> {
    // Dynamically import ioredis
    const Redis = await this.getRedisClient()

    const redisOptions = {
      host: this.config.host ?? 'localhost',
      port: this.config.port ?? 6379,
      password: this.config.password,
      db: this.config.db ?? 0,
    }

    // Create publisher connection
    this.redis = new Redis(redisOptions)

    // Create subscriber connection (Redis requires separate connection for pub/sub)
    this.subscriber = new Redis(redisOptions)

    // Handle subscriber messages
    this.subscriber.on('message', (channel: string, message: string) => {
      this.handleMessage(channel, message)
    })

    // Handle subscriber errors
    this.subscriber.on('error', (error: Error) => {
      console.error('[RedisDriver] Subscriber error:', error)
    })

    this.redis.on('error', (error: Error) => {
      console.error('[RedisDriver] Publisher error:', error)
    })
  }

  async publish(channel: string, event: string, data: unknown): Promise<void> {
    if (!this.redis) {
      throw new Error('RedisDriver not initialized. Call init() first.')
    }

    const prefixedChannel = this.channelPrefix + channel
    const message = JSON.stringify({ event, data })

    await this.redis.publish(prefixedChannel, message)
  }

  async subscribe(
    channel: string,
    callback: (event: string, data: unknown) => void
  ): Promise<void> {
    if (!this.subscriber) {
      throw new Error('RedisDriver not initialized. Call init() first.')
    }

    const prefixedChannel = this.channelPrefix + channel

    // Store callback
    if (!this.subscriptions.has(prefixedChannel)) {
      this.subscriptions.set(prefixedChannel, new Set())
      // Subscribe to Redis channel
      await this.subscriber.subscribe(prefixedChannel)
    }

    this.subscriptions.get(prefixedChannel)?.add(callback)
  }

  async unsubscribe(channel: string): Promise<void> {
    if (!this.subscriber) {
      return
    }

    const prefixedChannel = this.channelPrefix + channel

    // Remove from subscriptions
    this.subscriptions.delete(prefixedChannel)

    // Unsubscribe from Redis if no more callbacks
    if (!this.subscriptions.has(prefixedChannel)) {
      await this.subscriber.unsubscribe(prefixedChannel)
    }
  }

  async shutdown(): Promise<void> {
    this.subscriptions.clear()

    if (this.subscriber) {
      try {
        await this.subscriber.quit()
      } catch (_e) {}
      this.subscriber = null
    }

    if (this.redis) {
      try {
        await this.redis.quit()
      } catch (_e) {}
      this.redis = null
    }
  }

  /**
   * Handle incoming Redis messages
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
      console.error('[RedisDriver] Failed to handle message:', error)
    }
  }

  /**
   * Dynamically import ioredis to avoid bundling it if not used
   */
  private async getRedisClient(): Promise<any> {
    try {
      const ioredis = await import('ioredis')
      return ioredis.default
    } catch (error) {
      throw new Error('ioredis is required for RedisDriver. Install it with: bun add ioredis')
    }
  }
}

/**
 * Configuration options for RedisDriver
 */
export interface RedisDriverConfig {
  /** Redis host (default: 'localhost') */
  host?: string
  /** Redis port (default: 6379) */
  port?: number
  /** Redis password (optional) */
  password?: string
  /** Redis database number (default: 0) */
  db?: number
  /** Key prefix for channels (default: 'ripple:') */
  keyPrefix?: string
}
