import { LuminosityError } from '../errors/LuminosityError'
import { LuminosityErrorCodes } from '../errors/codes'

/**
 * Rate limiter using Token Bucket algorithm.
 *
 * Provides a simple and efficient way to rate-limit API requests
 * without blocking the event loop.
 *
 * @public
 * @since 3.1.0
 */
export class RateLimiter {
  private tokens: number
  private lastRefillTime: number

  /**
   * Create a rate limiter.
   *
   * @param maxTokens - Maximum number of tokens (burst capacity).
   * @param refillRate - Number of tokens added per second.
   *
   * @example
   * ```typescript
   * // Allow 10 requests per second with burst of 20
   * const limiter = new RateLimiter(20, 10);
   *
   * for (const url of urls) {
   *   await limiter.acquire();
   *   await submitUrl(url);
   * }
   * ```
   */
  constructor(
    private maxTokens: number,
    private refillRate: number
  ) {
    this.tokens = maxTokens
    this.lastRefillTime = Date.now()
  }

  /**
   * Acquire a token (wait if necessary).
   *
   * This method will wait until a token is available, respecting
   * the configured rate limit.
   *
   * @param count - Number of tokens to acquire (default: 1).
   * @returns A promise that resolves when tokens are acquired.
   */
  async acquire(count = 1): Promise<void> {
    while (true) {
      this.refill()

      if (this.tokens >= count) {
        this.tokens -= count
        return
      }

      // Calculate wait time until next token
      const tokensNeeded = count - this.tokens
      const waitMs = (tokensNeeded / this.refillRate) * 1000

      await this.sleep(Math.ceil(waitMs))
    }
  }

  /**
   * Try to acquire tokens without waiting.
   *
   * @param count - Number of tokens to acquire (default: 1).
   * @returns True if tokens were acquired, false otherwise.
   */
  tryAcquire(count = 1): boolean {
    this.refill()

    if (this.tokens >= count) {
      this.tokens -= count
      return true
    }

    return false
  }

  /**
   * Get the number of available tokens.
   *
   * @returns Current token count.
   */
  getAvailableTokens(): number {
    this.refill()
    return Math.floor(this.tokens)
  }

  /**
   * Reset the rate limiter to full capacity.
   */
  reset(): void {
    this.tokens = this.maxTokens
    this.lastRefillTime = Date.now()
  }

  /**
   * Refill tokens based on elapsed time.
   * @private
   */
  private refill(): void {
    const now = Date.now()
    const elapsedSeconds = (now - this.lastRefillTime) / 1000
    const tokensToAdd = elapsedSeconds * this.refillRate

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefillTime = now
  }

  /**
   * Sleep for a specified duration.
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Configuration for rate limiting.
 *
 * @public
 * @since 3.1.0
 */
export interface RateLimitConfig {
  /** Maximum requests per second. */
  requestsPerSecond?: number
  /** Maximum requests per minute. */
  requestsPerMinute?: number
  /** Maximum requests per hour. */
  requestsPerHour?: number
}

/**
 * Create a rate limiter from configuration.
 *
 * Chooses the most restrictive limit if multiple are specified.
 *
 * @param config - Rate limit configuration.
 * @returns A configured rate limiter.
 *
 * @example
 * ```typescript
 * const limiter = createRateLimiter({
 *   requestsPerSecond: 10,
 *   requestsPerMinute: 500
 * });
 * ```
 *
 * @public
 * @since 3.1.0
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  // Calculate effective rate (tokens per second)
  let effectiveRate = Number.POSITIVE_INFINITY
  let burstCapacity = 1

  if (config.requestsPerSecond) {
    effectiveRate = Math.min(effectiveRate, config.requestsPerSecond)
    burstCapacity = Math.max(burstCapacity, config.requestsPerSecond * 2)
  }

  if (config.requestsPerMinute) {
    const perSecond = config.requestsPerMinute / 60
    effectiveRate = Math.min(effectiveRate, perSecond)
    burstCapacity = Math.max(burstCapacity, perSecond * 10)
  }

  if (config.requestsPerHour) {
    const perSecond = config.requestsPerHour / 3600
    effectiveRate = Math.min(effectiveRate, perSecond)
    burstCapacity = Math.max(burstCapacity, perSecond * 60)
  }

  if (!Number.isFinite(effectiveRate)) {
    throw new LuminosityError(422, LuminosityErrorCodes.SUBMIT_RATE_LIMIT_MISSING, {
      message: 'At least one rate limit must be specified',
      retryable: false,
    })
  }

  return new RateLimiter(Math.ceil(burstCapacity), effectiveRate)
}
