/**
 * Configuration for compensation retry behavior.
 */
export interface CompensationRetryConfig {
  /** Maximum number of retry attempts. Default: 3 */
  maxAttempts?: number
  /** Initial delay in milliseconds. Default: 1000ms (1s) */
  initialDelay?: number
  /** Backoff coefficient multiplier. Default: 2 (exponential) */
  backoffCoefficient?: number
  /** Maximum delay cap in milliseconds. Default: 30000ms (30s) */
  maxDelay?: number
  /** Jitter factor (0-1) to add randomness. Default: 0.1 (10%) */
  jitter?: number
}

/**
 * Result of a retry attempt.
 */
export interface RetryResult<T = void> {
  /** Whether the operation succeeded. */
  success: boolean
  /** The result value if successful. */
  value?: T
  /** The error if failed. */
  error?: Error
  /** Number of attempts made. */
  attempts: number
  /** Total time spent in milliseconds. */
  duration: number
}

/**
 * Manages retry logic for failed compensation actions with exponential backoff.
 *
 * Implements a robust retry strategy to handle transient failures during
 * workflow rollback, ensuring eventual consistency in distributed transactions.
 *
 * @example
 * ```typescript
 * const policy = new CompensationRetryPolicy({
 *   maxAttempts: 5,
 *   initialDelay: 2000,
 *   backoffCoefficient: 2,
 * });
 *
 * const result = await policy.execute(async () => {
 *   await externalAPI.cancelReservation(reservationId);
 * });
 *
 * if (!result.success) {
 *   console.error(`Failed after ${result.attempts} attempts`);
 * }
 * ```
 */
export class CompensationRetryPolicy {
  private config: Required<CompensationRetryConfig>

  constructor(config: CompensationRetryConfig = {}) {
    this.config = {
      maxAttempts: config.maxAttempts ?? 3,
      initialDelay: config.initialDelay ?? 1000,
      backoffCoefficient: config.backoffCoefficient ?? 2,
      maxDelay: config.maxDelay ?? 30000,
      jitter: config.jitter ?? 0.1,
    }
  }

  /**
   * Executes an operation with automatic retry on failure.
   *
   * Uses exponential backoff with jitter to avoid thundering herd problems.
   *
   * @param operation - The async operation to execute.
   * @returns A promise resolving to the retry result.
   *
   * @example
   * ```typescript
   * const policy = new CompensationRetryPolicy();
   *
   * const result = await policy.execute(async () => {
   *   await paymentGateway.refund(transactionId);
   * });
   *
   * if (result.success) {
   *   console.log(`Refund succeeded after ${result.attempts} attempts`);
   * }
   * ```
   */
  async execute<T = void>(operation: () => Promise<T>): Promise<RetryResult<T>> {
    const startTime = Date.now()
    let lastError: Error | undefined
    let attempts = 0

    while (attempts < this.config.maxAttempts) {
      attempts++

      try {
        const value = await operation()
        return {
          success: true,
          value,
          attempts,
          duration: Date.now() - startTime,
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))

        if (attempts < this.config.maxAttempts) {
          const delay = this.calculateDelay(attempts)
          await this.sleep(delay)
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
      duration: Date.now() - startTime,
    }
  }

  /**
   * Calculates the delay for a given retry attempt using exponential backoff.
   *
   * @param attempt - The current attempt number (1-indexed).
   * @returns The delay in milliseconds.
   * @private
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay =
      this.config.initialDelay * this.config.backoffCoefficient ** (attempt - 1)

    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay)

    const jitterAmount = cappedDelay * this.config.jitter
    const jitter = (Math.random() - 0.5) * 2 * jitterAmount

    return Math.max(0, cappedDelay + jitter)
  }

  /**
   * Sleeps for the specified duration.
   *
   * @param ms - Duration in milliseconds.
   * @private
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Checks if an error is retryable.
   *
   * By default, all errors are retryable. Override this method or provide
   * a custom predicate to implement selective retry logic.
   *
   * @param error - The error to check.
   * @returns True if the error is retryable.
   *
   * @example
   * ```typescript
   * class CustomRetryPolicy extends CompensationRetryPolicy {
   *   isRetryable(error: Error): boolean {
   *     return error.message.includes('TRANSIENT');
   *   }
   * }
   * ```
   */
  isRetryable(_error: Error): boolean {
    return true
  }

  /**
   * Executes an operation with selective retry based on error type.
   *
   * @param operation - The async operation to execute.
   * @param isRetryable - Predicate to determine if an error should trigger retry.
   * @returns A promise resolving to the retry result.
   *
   * @example
   * ```typescript
   * const policy = new CompensationRetryPolicy();
   *
   * const result = await policy.executeWithPredicate(
   *   async () => await api.call(),
   *   (err) => err.message.includes('timeout')
   * );
   * ```
   */
  async executeWithPredicate<T = void>(
    operation: () => Promise<T>,
    isRetryable: (error: Error) => boolean
  ): Promise<RetryResult<T>> {
    const startTime = Date.now()
    let lastError: Error | undefined
    let attempts = 0

    while (attempts < this.config.maxAttempts) {
      attempts++

      try {
        const value = await operation()
        return {
          success: true,
          value,
          attempts,
          duration: Date.now() - startTime,
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))

        if (!isRetryable(lastError)) {
          break
        }

        if (attempts < this.config.maxAttempts) {
          const delay = this.calculateDelay(attempts)
          await this.sleep(delay)
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts,
      duration: Date.now() - startTime,
    }
  }

  /**
   * Gets the current retry configuration.
   *
   * @returns A copy of the current configuration.
   */
  getConfig(): Readonly<Required<CompensationRetryConfig>> {
    return { ...this.config }
  }
}
