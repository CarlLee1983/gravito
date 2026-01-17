import type { CacheStore } from './store'

/**
 * Represents the response from a rate limiting attempt.
 *
 * @public
 * @since 3.0.0
 */
export interface RateLimiterResponse {
  /** Whether the request is allowed. */
  allowed: boolean
  /** Number of attempts remaining within the current window. */
  remaining: number
  /** Epoch timestamp in seconds when the rate limit will reset. */
  reset: number
}

/**
 * RateLimiter provides a simple mechanism for limiting request frequency.
 *
 * It uses a `CacheStore` backend to track attempt counts and handle
 * expiration (sliding or fixed window depending on store capability).
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter(cacheStore);
 * const status = await limiter.attempt('login:127.0.0.1', 5, 60);
 * if (!status.allowed) {
 *   throw new Error('Too many attempts');
 * }
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class RateLimiter {
  constructor(private store: CacheStore) {}

  /**
   * Attempt to acquire a lock
   * @param key - The unique key (e.g., "ip:127.0.0.1")
   * @param maxAttempts - Maximum number of attempts allowed
   * @param decaySeconds - Time in seconds until the limit resets
   */
  async attempt(
    key: string,
    maxAttempts: number,
    decaySeconds: number
  ): Promise<RateLimiterResponse> {
    const current = await this.store.get<number>(key)
    const now = Math.floor(Date.now() / 1000)

    if (current === null) {
      // First attempt
      await this.store.put(key, 1, decaySeconds)
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        reset: now + decaySeconds,
      }
    }

    if (current >= maxAttempts) {
      // Limit exceeded
      // We don't know the exact TTL remaining without store support for ttl()
      // For now, we assume decaySeconds from the first write.
      // Ideally, the store would return TTL.
      // If we simply re-put, we reset TTL which is bad.
      // For simple stores, we might just block.

      // Improvement: Store value as { count: number, reset: number }
      // But standard cache is usually just value.
      // Let's assume the store handles TTL correctly (it expires).

      return {
        allowed: false,
        remaining: 0,
        reset: now + decaySeconds, // Approximation if we can't read TTL
      }
    }

    // Increment
    const next = await this.store.increment(key)
    return {
      allowed: true,
      remaining: maxAttempts - next,
      reset: now + decaySeconds,
    }
  }

  /**
   * Clear the limiter for a key
   */
  async clear(key: string): Promise<void> {
    await this.store.forget(key)
  }
}
