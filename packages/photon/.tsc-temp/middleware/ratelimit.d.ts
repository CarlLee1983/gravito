/**
 * @fileoverview Rate Limiting Middleware for Photon
 *
 * Provides token bucket and sliding window rate limiting strategies.
 * Supports memory-based and Redis-based storage backends.
 *
 * @module @gravito/photon/middleware/ratelimit
 * @since 1.0.0
 */
import type { Context, MiddlewareHandler } from '@gravito/photon'
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed within the time window
   * @default 100
   */
  maxRequests: number
  /**
   * Time window in milliseconds
   * @default 60000 (1 minute)
   */
  windowMs: number
  /**
   * Strategy for rate limiting
   * - 'token-bucket': Smooth rate limiting with token refill
   * - 'sliding-window': Time-based window that slides continuously
   * @default 'token-bucket'
   */
  strategy?: 'token-bucket' | 'sliding-window'
  /**
   * Custom key generator function
   * @default (c) => c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
   */
  keyGenerator?: (c: Context) => string | Promise<string>
  /**
   * Storage backend for rate limit state
   * @default new MemoryStore()
   */
  store?: RateLimitStore
  /**
   * Custom handler for rate-limited requests
   * @default (c) => c.json({ error: 'Too Many Requests', retryAfter: <seconds> }, 429)
   */
  onRateLimitExceeded?: (c: Context, retryAfter: number) => Response | Promise<Response>
  /**
   * Skip rate limiting for certain requests
   * @default undefined
   */
  skip?: (c: Context) => boolean | Promise<boolean>
  /**
   * Custom headers to include in responses
   * @default true
   */
  standardHeaders?: boolean
  /**
   * Include draft RateLimit headers (RateLimit-*)
   * @default false
   */
  draftHeaders?: boolean
}
export interface RateLimitStore {
  /**
   * Increment request count and return current state
   */
  increment(key: string): Promise<RateLimitState>
  /**
   * Reset the rate limit for a key
   */
  reset(key: string): Promise<void>
  /**
   * Get current state without incrementing
   */
  get(key: string): Promise<RateLimitState | null>
}
export interface RateLimitState {
  /**
   * Number of requests made in current window
   */
  count: number
  /**
   * Timestamp when the window expires (ms)
   */
  resetTime: number
  /**
   * Remaining requests allowed
   */
  remaining: number
}
export declare class MemoryStore implements RateLimitStore {
  private config
  private store
  private head?
  private tail?
  private cleanupInterval
  constructor(
    config: {
      maxRequests: number
      windowMs: number
    },
    cleanupIntervalMs?: number
  )
  private addNode
  private removeNode
  increment(key: string): Promise<RateLimitState>
  reset(key: string): Promise<void>
  get(key: string): Promise<RateLimitState | null>
  /**
   * Cleanup resources
   */
  destroy(): void
}
/**
 * Create a rate limiting middleware
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { rateLimit } from '@gravito/photon/middleware'
 *
 * const app = new Photon()
 *
 * // Basic usage: 100 requests per minute
 * app.use('*', rateLimit({ maxRequests: 100, windowMs: 60000 }))
 *
 * // Per-user rate limiting
 * app.use('/api/*', rateLimit({
 *   maxRequests: 50,
 *   windowMs: 60000,
 *   keyGenerator: (c) => {
 *     const userId = c.get('userId')
 *     return userId || c.req.header('x-forwarded-for') || 'anonymous'
 *   }
 * }))
 * ```
 */
export declare function rateLimit(config: RateLimitConfig): MiddlewareHandler
/**
 * Convenience factory: Create rate limiter with common presets
 */
export declare const createRateLimiter: {
  /**
   * Strict: 10 requests per minute
   */
  strict: (overrides?: Partial<RateLimitConfig>) => MiddlewareHandler
  /**
   * Moderate: 60 requests per minute
   */
  moderate: (overrides?: Partial<RateLimitConfig>) => MiddlewareHandler
  /**
   * Lenient: 100 requests per minute
   */
  lenient: (overrides?: Partial<RateLimitConfig>) => MiddlewareHandler
  /**
   * API: 1000 requests per hour
   */
  api: (overrides?: Partial<RateLimitConfig>) => MiddlewareHandler
  /**
   * Auth: 5 attempts per 15 minutes (for login endpoints)
   */
  auth: (overrides?: Partial<RateLimitConfig>) => MiddlewareHandler
}
/**
 * Export convenience preset
 */
export { createRateLimiter as rateLimiter }
