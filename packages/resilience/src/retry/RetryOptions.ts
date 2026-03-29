/**
 * Options for the withRetry function.
 * `idempotent: true` is required as a safety guard — only idempotent operations
 * should be retried automatically.
 * @public
 */
export interface RetryOptions {
  idempotent: true
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  retryOn?: (error: unknown) => boolean
}
