import type { BroadcastDriver } from './BroadcastDriver'

/**
 * Configuration options for the Redis broadcast driver.
 */
export interface RedisDriverConfig {
  /**
   * The Redis connection URL.
   * @example 'redis://localhost:6379'
   */
  url?: string

  /**
   * The Redis host address.
   */
  host?: string

  /**
   * The Redis port number.
   */
  port?: number

  /**
   * The Redis password for authentication.
   */
  password?: string

  /**
   * The Redis database index.
   */
  db?: number

  /**
   * The prefix to use for Pub/Sub channels.
   * @defaultValue 'gravito:broadcast:'
   */
  keyPrefix?: string
}

/**
 * Redis broadcast driver implementation.
 *
 * Leverages Redis Pub/Sub to broadcast messages. This is ideal for internal
 * microservices or when managing your own WebSocket server fleet that subscribes to Redis.
 *
 * @remarks
 * This driver is an adapter and requires an external Redis client instance to be injected.
 * It is compatible with any Redis client that exposes a `publish` method.
 *
 * @example
 * ```typescript
 * const driver = new RedisDriver({ keyPrefix: 'app:' });
 * driver.setRedisClient(redis);
 * ```
 */
export class RedisDriver implements BroadcastDriver {
  private redis: {
    publish(channel: string, message: string): Promise<number>
  } | null = null

  /**
   * Creates a new RedisDriver instance.
   *
   * @param config - The Redis configuration options.
   */
  constructor(private config: RedisDriverConfig) {
    // The Redis client should be injected from the outside.
    // This class only provides the adapter interface.
  }

  /**
   * Inject the Redis client instance.
   *
   * @param client - A compatible Redis client (must have a publish method).
   */
  setRedisClient(client: { publish(channel: string, message: string): Promise<number> }): void {
    this.redis = client
  }

  /**
   * Broadcast an event to a Redis channel.
   *
   * @param channel - The target channel metadata.
   * @param event - The name of the event.
   * @param data - The event payload.
   * @throws {Error} If the Redis client has not been set.
   *
   * @example
   * ```typescript
   * await driver.broadcast({ name: 'system', type: 'public' }, 'Alert', { msg: 'Down' });
   * ```
   */
  async broadcast(
    channel: { name: string; type: string },
    event: string,
    data: Record<string, unknown>
  ): Promise<void> {
    if (!this.redis) {
      throw new Error(
        'Redis client not set. Please install a Redis client and call setRedisClient()'
      )
    }

    const prefix = this.config.keyPrefix || 'gravito:broadcast:'
    const channelName = `${prefix}${channel.name}`
    const message = JSON.stringify({
      event,
      data,
      channel: channel.name,
      type: channel.type,
    })

    await this.redis.publish(channelName, message)
  }
}
