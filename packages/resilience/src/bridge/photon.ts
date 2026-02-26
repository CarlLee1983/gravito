import { CircuitBreaker, type CircuitBreakerOptions } from '../circuit-breaker/CircuitBreaker'

/**
 * Resilience Middleware for Photon
 *
 * Provides circuit breaker protection for HTTP routes.
 *
 * @param options - Circuit Breaker options
 * @returns Photon middleware handler
 */
export function resilience(options: CircuitBreakerOptions = {}): any {
  const breaker = new CircuitBreaker(options)

  return async (c: any, next: any) => {
    try {
      return await breaker.execute(async () => {
        const result = await next()

        // If next() returns a response, check its status
        if (c.res && c.res.status >= 500) {
          throw new Error(`Upstream error: ${c.res.status}`)
        }

        return result
      })
    } catch (error: any) {
      if (breaker.isOpen()) {
        return c.json(
          {
            error: 'Service Unavailable',
            message: 'Circuit breaker is OPEN. Service temporarily throttled.',
            breaker: breaker.getName(),
          },
          503
        )
      }

      // Re-throw or handle as 500
      throw error
    }
  }
}
