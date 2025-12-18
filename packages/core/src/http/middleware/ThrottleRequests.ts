import type { Context, MiddlewareHandler, Next } from 'hono'
import type { PlanetCore } from '../../PlanetCore'

type RateLimiterLike = {
  attempt: (
    key: string,
    maxAttempts: number,
    decaySeconds: number
  ) => Promise<{ allowed: boolean; remaining: number; reset: number }>
}

type CacheLike = {
  limiter: () => RateLimiterLike
}

export class ThrottleRequests {
  constructor(private core: PlanetCore) {}

  /**
   * Create the middleware
   * @param maxAttempts - Max requests allowed
   * @param decaySeconds - Time window in seconds
   */
  handle(maxAttempts = 60, decaySeconds = 60): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      const cache = c.get('cache') as CacheLike | undefined
      if (!cache) {
        // If cache is not available, we can't rate limit.
        this.core.logger.warn('RateLimiter: OrbitCache not found. Skipping rate limiting.')
        await next()
        return
      }

      // Resolve IP
      const ip = c.req.header('x-forwarded-for') || '127.0.0.1'
      const key = `throttle:${ip}:${c.req.path}`

      const limiter = cache.limiter()
      const result = await limiter.attempt(key, maxAttempts, decaySeconds)

      // Set Headers
      c.header('X-RateLimit-Limit', String(maxAttempts))
      c.header('X-RateLimit-Remaining', String(Math.max(0, result.remaining)))

      if (result.reset) {
        c.header('X-RateLimit-Reset', String(result.reset))
      }

      if (!result.allowed) {
        c.header('Retry-After', String(decaySeconds))
        return c.text('Too Many Requests', 429)
      }

      return next()
    }
  }
}
