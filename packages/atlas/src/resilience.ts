import type { ResiliencePolicy } from '@gravito/resilience'

/**
 * Default resilience policy for atlas database connections.
 * Applied at connection-level only — NEVER around transactionWithRetry (D-06).
 *
 * Policy composition (D-08 order): timeout → circuitBreaker → retry
 * - timeout: 5000ms (abort slow connection attempts)
 * - circuitBreaker: 5 consecutive failures → open, reset after 30s
 * - retry: 3 total attempts with 200ms base delay (idempotent connection acquisition)
 *
 * @public
 */
export const atlasResiliencePolicy: ResiliencePolicy = {
  retry: { idempotent: true as const, maxAttempts: 3, baseDelayMs: 200 },
  circuitBreaker: { name: 'atlas-db', failureThreshold: 5, resetTimeout: 30_000 },
  timeout: 5000,
}
