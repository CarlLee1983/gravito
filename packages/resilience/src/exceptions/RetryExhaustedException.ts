import { InfrastructureException } from '@gravito/core'

/**
 * Thrown by withRetry when all retry attempts have been exhausted.
 * The `.cause` property contains the last error that caused the failure.
 * @public
 */
export class RetryExhaustedException extends InfrastructureException {
  constructor(options: { message?: string; cause?: unknown } = {}) {
    super(503, 'resilience.retry_exhausted', {
      message: options.message ?? 'Operation failed after all retry attempts',
      cause: options.cause,
      retryable: false,
    })
    this.name = 'RetryExhaustedException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
