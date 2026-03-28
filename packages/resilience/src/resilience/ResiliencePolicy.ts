import type { RetryOptions } from '../retry/RetryOptions'

/**
 * Inline circuit breaker options for withResilience.
 * Requires `name` so the breaker can be registered and shared.
 * @public
 */
export interface InlineCBOptions {
  /**
   * Unique name for this circuit breaker.
   * Breakers with the same name share state across all withResilience calls.
   */
  name: string

  /**
   * Number of consecutive failures before opening the circuit.
   * @default 5
   */
  failureThreshold?: number

  /**
   * Time in milliseconds before attempting to move from OPEN to HALF_OPEN.
   * @default 30000
   */
  resetTimeout?: number
}

/**
 * Configuration for the withResilience composition function.
 *
 * Policies are applied in the correct order per D-08:
 * - timeout (outermost)
 * - circuitBreaker (middle — wraps the retry-wrapped fn)
 * - retry (innermost — directly wraps fn)
 *
 * @public
 */
export interface ResiliencePolicy {
  /**
   * Retry configuration. Requires `idempotent: true` as a safety guard.
   * Only idempotent operations should be retried automatically.
   */
  retry?: RetryOptions

  /**
   * Circuit breaker configuration.
   * - Pass a `string` to use (or create) a named/shared circuit breaker from the registry.
   * - Pass `InlineCBOptions` (with required `name`) to create an inline named breaker.
   *
   * Named breakers are shared across all withResilience calls with the same name,
   * allowing failure state to accumulate across multiple call sites.
   */
  circuitBreaker?: string | InlineCBOptions

  /**
   * Timeout in milliseconds. The operation will be cancelled after this duration.
   * Uses aggressive cancellation via cockatiel's TimeoutStrategy.Aggressive.
   */
  timeout?: number
}
