import type { BroadcastDriver } from './BroadcastDriver'

/**
 * Redis driver configuration.
 */
export interface RedisDriverConfig {
  url?: string
  host?: string
  port?: number
  password?: string
  db?: number
  keyPrefix?: string
}

/**
 * Redis driver.
 *
 * Broadcasts via Redis Pub/Sub.
 * Requires an external Redis client.
 */
export class RedisDriver implements BroadcastDriver {
  private redis: {
    publish(channel: string, message: string): Promise<number>
  } | null = null

  constructor(private config: RedisDriverConfig) {
    // The Redis client should be injected from the outside.
    // This class only provides the adapter interface.
  }

  /**
   * Set Redis client.
   */
  setRedisClient(client: { publish(channel: string, message: string): Promise<number> }): void {
    this.redis = client
  }

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
