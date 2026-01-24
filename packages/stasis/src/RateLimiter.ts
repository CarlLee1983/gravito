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
  /** Seconds until the rate limit resets (optional). */
  retryAfter?: number
}

/**
 * Detailed information about the current rate limit status.
 *
 * @public
 * @since 3.0.0
 */
export interface RateLimitInfo {
  /** Maximum number of attempts allowed. */
  limit: number
  /** Number of attempts remaining within the current window. */
  remaining: number
  /** Epoch timestamp in seconds when the rate limit will reset. */
  reset: number
  /** Seconds until the rate limit resets (only present when limit is exceeded). */
  retryAfter?: number
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
      await this.store.put(key, 1, decaySeconds)
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        reset: now + decaySeconds,
      }
    }

    if (current >= maxAttempts) {
      const retryAfter = await this.availableIn(key, decaySeconds)
      return {
        allowed: false,
        remaining: 0,
        reset: now + retryAfter,
        retryAfter,
      }
    }

    const next = await this.store.increment(key)
    return {
      allowed: true,
      remaining: maxAttempts - next,
      reset: now + decaySeconds,
    }
  }

  async availableIn(key: string, decaySeconds: number): Promise<number> {
    if (typeof this.store.ttl === 'function') {
      const remaining = await this.store.ttl(key)
      if (remaining !== null) {
        return remaining
      }
    }
    return decaySeconds
  }

  /**
   * Get detailed information about the current rate limit status
   * @param key - The unique key
   * @param maxAttempts - Maximum number of attempts allowed
   * @param decaySeconds - Time in seconds until the limit resets
   */
  async getInfo(key: string, maxAttempts: number, decaySeconds: number): Promise<RateLimitInfo> {
    const current = await this.store.get<number>(key)
    const now = Math.floor(Date.now() / 1000)

    if (current === null) {
      return {
        limit: maxAttempts,
        remaining: maxAttempts,
        reset: now + decaySeconds,
      }
    }

    const remaining = Math.max(0, maxAttempts - current)
    const retryAfter = remaining === 0 ? await this.availableIn(key, decaySeconds) : undefined

    return {
      limit: maxAttempts,
      remaining,
      reset: now + (retryAfter ?? decaySeconds),
      retryAfter,
    }
  }

  /**
   * Clear the limiter for a key
   */
  async clear(key: string): Promise<void> {
    await this.store.forget(key)
  }
}
