import type { TokenBlacklist } from './TokenBlacklist'

/**
 * Interface for a Redis-compatible client.
 * We define this locally to avoid a hard dependency on 'ioredis'.
 */
export interface RedisClient {
  set(key: string, value: string | number, ...args: (string | number)[]): Promise<string | null>
  get(key: string): Promise<string | null>
  exists(...keys: string[]): Promise<number>
  del(...keys: string[]): Promise<number>
}

/**
 * Redis-based implementation of the token blacklist.
 *
 * This implementation uses Redis to store revoked tokens with an automatic TTL,
 * making it suitable for distributed systems and multi-server deployments.
 *
 * @public
 * @example
 * ```typescript
 * const blacklist = new RedisTokenBlacklist(redisClient);
 * ```
 */
export class RedisTokenBlacklist implements TokenBlacklist {
  /**
   * Create a new Redis token blacklist instance.
   *
   * @param redis - The Redis client instance (ioredis compatible)
   * @param prefix - Key prefix for blacklisted tokens (default: 'sentinel:blacklist:')
   */
  constructor(
    private redis: RedisClient,
    private prefix = 'sentinel:blacklist:'
  ) {}

  /**
   * Add a token to the blacklist.
   *
   * Uses Redis TTL to automatically remove the token when it expires.
   */
  async add(jti: string, expiresAt: Date): Promise<void> {
    const ttlMs = Math.max(0, expiresAt.getTime() - Date.now())
    if (ttlMs === 0) {
      return
    }

    // Use 'PX' for milliseconds expiration in Redis SET command
    await this.redis.set(this.prefix + jti, 'revoked', 'PX', ttlMs)
  }

  /**
   * Check if a token is in the blacklist.
   */
  async has(jti: string): Promise<boolean> {
    const result = await this.redis.exists(this.prefix + jti)
    return result === 1
  }

  /**
   * Remove expired entries.
   *
   * Redis handles expiration automatically, so this is a no-op.
   */
  async prune(): Promise<void> {
    // No-op for Redis
  }
}
