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
 * Middleware to throttle authentication attempts.
 * Prevents brute-force attacks by limiting failed login attempts.
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
