import type { GravitoContext, GravitoNext } from '@gravito/core'

/**
 * Options for authentication throttling.
 * @public
 */
export interface AuthThrottleOptions {
  maxAttempts?: number
  decayMinutes?: number
  keyGenerator?: (ctx: GravitoContext) => string
}

/**
 * Middleware that throttles authentication attempts to prevent brute-force attacks.
 *
 * This middleware tracks failed authentication attempts (401 status) based on
 * a key generated for the request (defaults to the client IP). If the number
 * of failed attempts exceeds the limit, it returns a 429 response with a
 * Retry-After header.
 *
 * @param options - Throttling configuration options
 * @returns A Gravito middleware handler
 *
 * @example
 * ```typescript
 * app.post('/login', throttleAuth({ maxAttempts: 5, decayMinutes: 1 }), (c) => {
 *   // Authentication logic
 * });
 * ```
 *
 * @public
 */
export function throttleAuth(options: AuthThrottleOptions = {}) {
  const {
    maxAttempts = 5,
    decayMinutes = 1,
    keyGenerator = (ctx) => ctx.req.header('x-forwarded-for') || 'unknown',
  } = options

  const attempts = new Map<string, { count: number; resetAt: number }>()

  return async (c: GravitoContext, next: GravitoNext) => {
    const key = `auth_throttle:${keyGenerator(c)}`
    const now = Date.now()
    const decayMs = decayMinutes * 60 * 1000

    let record = attempts.get(key)

    if (record && now > record.resetAt) {
      attempts.delete(key)
      record = undefined
    }

    if (record && record.count >= maxAttempts) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000)
      c.header('Retry-After', String(retryAfter))
      return c.json({ error: 'Too many login attempts. Please try again later.' }, 429)
    }

    const response = await next()

    if (response && response.status === 401) {
      if (!record) {
        record = { count: 0, resetAt: now + decayMs }
        attempts.set(key, record)
      }
      record.count++
    }

    return response
  }
}
