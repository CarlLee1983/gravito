import {
  wrap,
  circuitBreaker as cockatielCB,
  ConsecutiveBreaker,
  retry,
  handleAll,
  handleWhen,
  ExponentialBackoff,
  timeout as cockatielTimeout,
  TimeoutStrategy,
  BrokenCircuitError,
  IsolatedCircuitError,
} from 'cockatiel'
import { InfrastructureException } from '@gravito/core'
import { CircuitOpenException } from '../exceptions/CircuitOpenException'
import { RetryExhaustedException } from '../exceptions/RetryExhaustedException'
import type { ResiliencePolicy, InlineCBOptions } from './ResiliencePolicy'

// Internal registry for named circuit breakers (shared across withResilience calls)
const cbRegistry = new Map<string, ReturnType<typeof cockatielCB>>()

/**
 * Composes timeout + circuit breaker + retry policies in the correct order (D-08):
 * - timeout (outermost)
 * - circuitBreaker (middle — wraps the retry-wrapped fn)
 * - retry (innermost — directly wraps fn)
 *
 * Throws CircuitOpenException when the circuit is open (never returns fallback values).
 * Per D-11: fallback handling belongs to OrbitDegradationManager (Phase 20).
 *
 * Named circuit breakers are shared via an internal registry — all withResilience calls
 * with the same CB name share the same circuit state.
 *
 * @public
 */
export async function withResilience<T>(
  fn: () => Promise<T>,
  policy: ResiliencePolicy,
): Promise<T> {
  // Build policies in order: timeout → CB → retry
  // cockatiel's wrap() applies them outermost-first, so we push in this order.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const policies: any[] = []

  // 1. Timeout (outermost)
  if (policy.timeout != null) {
    policies.push(cockatielTimeout(policy.timeout, TimeoutStrategy.Aggressive))
  }

  // 2. Circuit Breaker (middle — wraps retry) per D-08
  if (policy.circuitBreaker != null) {
    let cbOpts: InlineCBOptions
    if (typeof policy.circuitBreaker === 'string') {
      cbOpts = { name: policy.circuitBreaker }
    } else {
      cbOpts = policy.circuitBreaker
    }

    const cbName = cbOpts.name

    if (!cbRegistry.has(cbName)) {
      cbRegistry.set(
        cbName,
        cockatielCB(handleAll, {
          halfOpenAfter: cbOpts.resetTimeout ?? 30_000,
          breaker: new ConsecutiveBreaker(cbOpts.failureThreshold ?? 5),
        }),
      )
    }
    policies.push(cbRegistry.get(cbName)!)
  }

  // 3. Retry (innermost — wraps fn directly) per D-08
  if (policy.retry != null) {
    const retryOpts = policy.retry
    if ((retryOpts as unknown as Record<string, unknown>).idempotent !== true) {
      throw new Error('withResilience: retry.idempotent must be true')
    }

    const handler = handleWhen((err: unknown) => {
      if (err instanceof InfrastructureException && err.retryable) return true
      if (retryOpts.retryOn) return retryOpts.retryOn(err)
      return false
    })

    const totalAttempts = retryOpts.maxAttempts ?? 3
    // cockatiel's maxAttempts counts retries only (excludes the initial attempt),
    // so subtract 1 to match RetryOptions semantic where maxAttempts = total calls.
    policies.push(
      retry(handler, {
        maxAttempts: Math.max(0, totalAttempts - 1),
        backoff: new ExponentialBackoff({
          initialDelay: retryOpts.baseDelayMs ?? 200,
          maxDelay: retryOpts.maxDelayMs ?? 30_000,
        }),
      }),
    )
  }

  // Fast path: no policies configured
  if (policies.length === 0) {
    return fn()
  }

  // Compose policies: wrap() in cockatiel applies left-to-right outermost-first
  const combined = policies.length === 1 ? policies[0] : wrap(...policies)

  let lastError: unknown

  // Track retry give-up only when retry is in the policy
  if (policy.retry != null && combined.onGiveUp) {
    combined.onGiveUp((reason: { error?: unknown }) => {
      if (reason.error !== undefined) {
        lastError = reason.error
      }
    })
  }

  try {
    return await combined.execute(fn)
  } catch (err) {
    // Map cockatiel circuit-open errors -> Gravito CircuitOpenException
    if (err instanceof BrokenCircuitError || err instanceof IsolatedCircuitError) {
      throw new CircuitOpenException({ cause: err })
    }

    // Map retry-exhausted to RetryExhaustedException when retry is configured
    if (policy.retry != null && !(err instanceof CircuitOpenException)) {
      const isNotCircuitError =
        !(err instanceof BrokenCircuitError) && !(err instanceof IsolatedCircuitError)
      if (isNotCircuitError && !(err instanceof RetryExhaustedException)) {
        throw new RetryExhaustedException({
          message: `Operation failed after ${policy.retry.maxAttempts ?? 3} attempts`,
          cause: lastError ?? err,
        })
      }
    }

    throw err
  }
}

/**
 * Clear the internal circuit breaker registry.
 * For testing only — do not use in production code.
 * @internal
 */
export function _resetCBRegistry(): void {
  cbRegistry.clear()
}
