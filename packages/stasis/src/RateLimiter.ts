import type { CacheStore } from './store'

/**
 * Represents the response from a rate limiting attempt.
 *
 * This interface provides the necessary metadata to determine if a request
 * should be throttled and when the client can safely retry.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const res: RateLimiterResponse = { allowed: true, remaining: 4, reset: 1622548800 };
 * ```
 */
export interface RateLimiterResponse {
  /** Whether the request is allowed based on current usage and limits. */
  allowed: boolean
  /** Number of attempts remaining within the current time window. */
  remaining: number
  /** Epoch timestamp in seconds when the rate limit window will reset. */
  reset: number
  /** Seconds until the rate limit resets, typically used for the `Retry-After` header. */
  retryAfter?: number
}

/**
 * Detailed information about the current rate limit status.
 *
 * Used for inspecting the state of a limiter without necessarily
 * consuming an attempt or triggering a state change.
 *
 * @public
 * @since 3.0.0
 *
 * @example
 * ```typescript
 * const info: RateLimitInfo = { limit: 10, remaining: 5, reset: 1622548800 };
 * ```
 */
export interface RateLimitInfo {
  /** Maximum number of attempts allowed within the configured window. */
  limit: number
  /** Number of attempts remaining before the limit is reached. */
  remaining: number
  /** Epoch timestamp in seconds when the rate limit window will reset. */
  reset: number
  /** Seconds until the rate limit resets, only present when the limit has been exceeded. */
  retryAfter?: number
}

/**
 * RateLimiter provides a simple mechanism for limiting request frequency.
 *
 * It uses a `CacheStore` backend to track attempt counts and handle
 * expiration. This allows for distributed rate limiting when using
 * shared stores like Redis, or local limiting with memory stores.
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter(cacheStore);
 * const status = await limiter.attempt('login:127.0.0.1', 5, 60);
 *
 * if (!status.allowed) {
 *   console.log(`Too many attempts. Retry after ${status.retryAfter}s`);
 * }
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class RateLimiter {
  /**
   * Creates a new RateLimiter instance.
   *
   * @param store - Cache backend used to persist attempt counts.
   *
   * @example
   * ```typescript
   * const limiter = new RateLimiter(new MemoryStore());
   * ```
   */
  constructor(private store: CacheStore) {}

  /**
   * Attempt to consume a slot in the rate limit window.
   *
   * This method checks the current attempt count for the given key. If the
   * count is below the limit, it increments the count and allows the request.
   * Otherwise, it returns a rejected status with retry information.
   *
   * @param key - The unique identifier for the rate limit (e.g., IP address or user ID).
   * @param maxAttempts - Maximum number of attempts allowed within the decay period.
   * @param decaySeconds - Duration of the rate limit window in seconds.
   * @returns A response indicating if the attempt was successful and the remaining capacity.
   * @throws {Error} If the underlying cache store fails to read or write data.
   *
   * @example
   * ```typescript
   * const response = await limiter.attempt('api-client:123', 100, 3600);
   * if (response.allowed) {
   *   // Proceed with request
   * }
   * ```
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

  /**
   * Calculate the number of seconds until the rate limit resets.
   *
   * This helper method attempts to retrieve the TTL from the store. If the
   * store does not support TTL inspection, it falls back to the provided
   * decay period.
   *
   * @param key - Unique identifier for the rate limit.
   * @param decaySeconds - Default decay period to use as a fallback.
   * @returns Number of seconds until the key expires.
   * @throws {Error} If the store fails to retrieve TTL metadata.
   */
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
   * Get detailed information about the current rate limit status without consuming an attempt.
   *
   * Useful for returning rate limit headers (e.g., X-RateLimit-Limit) in
   * middleware or for pre-flight checks.
   *
   * @param key - The unique identifier for the rate limit.
   * @param maxAttempts - Maximum number of attempts allowed.
   * @param decaySeconds - Duration of the rate limit window in seconds.
   * @returns Current status including limit, remaining attempts, and reset time.
   * @throws {Error} If the underlying cache store fails to retrieve data.
   *
   * @example
   * ```typescript
   * const info = await limiter.getInfo('user:42', 60, 60);
   * console.log(`Remaining: ${info.remaining}/${info.limit}`);
   * ```
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
   * Reset the rate limit counter for a specific key.
   *
   * Use this to manually clear a block, for example after a successful
   * login or when an administrator manually unblocks a user.
   *
   * @param key - The unique identifier to clear.
   * @throws {Error} If the store fails to delete the key.
   *
   * @example
   * ```typescript
   * await limiter.clear('login-attempts:user@example.com');
   * ```
   */
  async clear(key: string): Promise<void> {
    await this.store.forget(key)
  }
}
