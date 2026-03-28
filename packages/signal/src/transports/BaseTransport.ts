import { withRetry } from '@gravito/resilience'
import { MailErrorCode, MailTransportError } from '../errors'
import type { Message, Transport } from '../types'

/**
 * Transport retry configuration options.
 *
 * Defines the behavior of the automatic retry mechanism, including the number of attempts
 * and the timing between them using exponential backoff.
 *
 * @deprecated Configuration now handled internally by @gravito/resilience RetryOptions.
 * Kept for backward compat of existing subclass constructors.
 *
 * @example
 * ```typescript
 * const options: TransportOptions = {
 *   maxRetries: 5,
 *   retryDelay: 500,
 *   backoffMultiplier: 3
 * };
 * ```
 *
 * @public
 */
export interface TransportOptions {
  /**
   * Maximum number of retry attempts before giving up.
   * Set to 0 to disable retries.
   */
  maxRetries?: number
  /**
   * Initial delay in milliseconds before the first retry attempt.
   */
  retryDelay?: number
  /**
   * Multiplier applied to the delay after each failed attempt.
   * Used to implement exponential backoff to avoid overwhelming the service.
   * @deprecated Backoff is now managed by @gravito/resilience (ExponentialBackoff).
   */
  backoffMultiplier?: number
}

/**
 * Base transport class with automatic retry via @gravito/resilience.
 *
 * This abstract class provides a robust foundation for all transport implementations by
 * handling transient failures through the unified @gravito/resilience withRetry primitive.
 * Only errors whose `retryable` flag is true (e.g., CONNECTION_FAILED, RATE_LIMIT) are
 * retried automatically.
 *
 * @example
 * ```typescript
 * class MyTransport extends BaseTransport {
 *   constructor() {
 *     super({ maxRetries: 3, retryDelay: 1000 })
 *   }
 *
 *   protected async doSend(message: Message): Promise<void> {
 *     // Actual implementation of the sending logic
 *     // If this throws, BaseTransport will retry via withRetry
 *   }
 * }
 * ```
 *
 * @public
 */
export abstract class BaseTransport implements Transport {
  protected options: Required<TransportOptions>

  /**
   * Initializes the transport with retry options.
   *
   * @param options - Configuration for the retry mechanism.
   */
  constructor(options?: TransportOptions) {
    this.options = {
      maxRetries: options?.maxRetries ?? 3,
      retryDelay: options?.retryDelay ?? 1000,
      backoffMultiplier: options?.backoffMultiplier ?? 2,
    }
  }

  /**
   * Orchestrates the message delivery with automatic retry via @gravito/resilience.
   *
   * Delegates to `doSend()` and retries on retryable InfrastructureException errors
   * (CONNECTION_FAILED, RATE_LIMIT). Non-retryable errors surface immediately.
   *
   * @param message - The message to be delivered.
   * @returns A promise that resolves when the message is successfully sent.
   * @throws {MailTransportError} If the message cannot be sent after the maximum number of attempts.
   *
   * @example
   * ```typescript
   * const transport = new SmtpTransport(config);
   * try {
   *   await transport.send(message);
   * } catch (error) {
   *   console.error('Failed to send email after retries', error);
   * }
   * ```
   */
  async send(message: Message): Promise<void> {
    try {
      await withRetry(() => this.doSend(message), {
        idempotent: true as const,
        maxAttempts: this.options.maxRetries,
        baseDelayMs: this.options.retryDelay,
      })
    } catch (error) {
      // Re-throw MailTransportError as-is (already structured)
      if (error instanceof MailTransportError) {
        throw error
      }
      // Wrap any other error (including RetryExhaustedException from withRetry)
      throw new MailTransportError(
        `Mail sending failed after ${this.options.maxRetries} retries`,
        MailErrorCode.UNKNOWN,
        error as Error
      )
    }
  }

  /**
   * Actual transport implementation to be provided by subclasses.
   *
   * This method should contain the protocol-specific logic for delivering the message.
   * It will be automatically retried by `send()` if it throws a retryable error.
   *
   * @param message - The message to send.
   * @returns A promise that resolves when the delivery is successful.
   * @throws {Error} Any error encountered during delivery, which may trigger a retry.
   */
  protected abstract doSend(message: Message): Promise<void>
}
