import { retry, handleWhen, ExponentialBackoff } from 'cockatiel'
import { InfrastructureException } from '@gravito/core'
import { RetryExhaustedException } from '../exceptions/RetryExhaustedException'
import type { RetryOptions } from './RetryOptions'

/**
 * Retries an async operation with exponential backoff using cockatiel.
 *
 * Requires `options.idempotent === true` as a runtime safety guard —
 * only idempotent operations should be retried automatically.
 *
 * Retries when:
 * - The error is an `InfrastructureException` with `retryable === true`
 * - The error matches the custom `retryOn` predicate (if provided)
 *
 * Throws `RetryExhaustedException` with `.cause` set to the last error
 * after all attempts are exhausted.
 *
 * @public
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  if ((options as unknown as Record<string, unknown>).idempotent !== true) {
    throw new Error(
      'withRetry: options.idempotent must be true. ' +
        'Non-idempotent operations must not be retried automatically. ' +
        'See: atlas.transactionWithRetry for DB deadlock retry.',
    )
  }

  const shouldRetry = (err: unknown): boolean => {
    if (err instanceof InfrastructureException && err.retryable) return true
    if (options.retryOn) return options.retryOn(err)
    return false
  }

  const handler = handleWhen(shouldRetry)

  const totalAttempts = options.maxAttempts ?? 3
  // cockatiel's maxAttempts counts retries only (excludes the initial attempt),
  // so we subtract 1 to match our RetryOptions semantic where maxAttempts = total calls.
  const policy = retry(handler, {
    maxAttempts: Math.max(0, totalAttempts - 1),
    backoff: new ExponentialBackoff({
      initialDelay: options.baseDelayMs ?? 200,
      maxDelay: options.maxDelayMs ?? 30_000,
    }),
  })

  let lastError: unknown

  policy.onGiveUp((reason) => {
    if ('error' in reason) {
      lastError = reason.error
    }
  })

  try {
    return await policy.execute(fn)
  } catch (err) {
    throw new RetryExhaustedException({
      message: `Operation failed after ${totalAttempts} attempts`,
      cause: lastError ?? err,
    })
  }
}
