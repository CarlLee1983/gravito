import type { RetryOptions } from './RetryOptions'

/**
 * Retries an async operation with exponential backoff.
 * Requires `options.idempotent === true` as a runtime safety guard.
 * @public
 */
export async function withRetry<T>(
  _fn: () => Promise<T>,
  _options: RetryOptions,
): Promise<T> {
  throw new Error('Not implemented')
}
