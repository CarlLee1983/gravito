import type { RateLimitState, RateLimitStore } from './ratelimit'
/**
 * Redis-based storage for Rate Limiting.
 *
 * Implements atomic rate limiting using Lua scripts to prevent race conditions
 * in distributed environments.
 *
 * @remarks
 * This store is recommended for production environments with multiple application
 * instances. It requires a Redis client (like ioredis or node-redis).
 *
 * @example
 * ```typescript
 * import Redis from 'ioredis'
 * import { rateLimit } from '@gravito/photon/middleware'
 * import { RedisStore } from '@gravito/photon/middleware/ratelimit-redis'
 *
 * const redis = new Redis()
 * const app = new Photon()
 *
 * app.use(rateLimit({
 *   maxRequests: 100,
 *   windowMs: 60000,
 *   store: new RedisStore(redis, { maxRequests: 100, windowMs: 60000 })
 * }))
 * ```
 * @public
 */
export declare class RedisStore implements RateLimitStore {
  private client
  private config
  /**
   * Create a new RedisStore.
   *
   * @param client - Redis client instance (must support .eval())
   * @param config - Rate limit configuration
   */
  constructor(
    client: any,
    config: {
      maxRequests: number
      windowMs: number
      prefix?: string
    }
  )
  private get prefix()
  /**
   * Atomic increment and TTL management using Lua.
   */
  increment(key: string): Promise<RateLimitState>
  reset(key: string): Promise<void>
  get(key: string): Promise<RateLimitState | null>
}
