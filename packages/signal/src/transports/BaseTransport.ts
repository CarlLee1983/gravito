import { MailErrorCode, MailTransportError } from '../errors'
import type { Message, Transport } from '../types'

/**
 * Transport retry configuration options.
 *
 * Defines the behavior of the automatic retry mechanism, including the number of attempts
 * and the timing between them using exponential backoff.
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
   */
  backoffMultiplier?: number
}

/**
 * Base transport class with automatic retry mechanism.
 *
 * This abstract class provides a robust foundation for all transport implementations by
 * handling transient failures through an exponential backoff retry strategy. It ensures
 * that temporary network issues or service rate limits do not immediately fail the email delivery.
 *
 * The retry mechanism works as follows:
 * 1. Attempt to send the message via `doSend()`.
 * 2. If it fails, wait for `retryDelay` milliseconds.
 * 3. Increment the delay by `backoffMultiplier` for the next attempt.
 * 4. Repeat until success or `maxRetries` is reached.
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
 *     // If this throws, BaseTransport will catch and retry
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
   * Orchestrates the message delivery with retry logic.
   *
   * This method wraps the concrete `doSend` implementation in a retry loop.
   * It tracks the last error encountered to provide context if all retries fail.
   *
   * @param message - The message to be delivered.
   * @returns A promise that resolves when the message is successfully sent.
   * @throws {MailTransportError} If the message cannot be sent after the maximum number of retries.
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
    let lastError: Error | undefined
    let delay = this.options.retryDelay

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await this.doSend(message)
      } catch (error) {
        lastError = error as Error

        if (attempt < this.options.maxRetries) {
          await this.sleep(delay)
          delay *= this.options.backoffMultiplier
        }
      }
    }

    throw new MailTransportError(
      `Mail sending failed after ${this.options.maxRetries} retries`,
      MailErrorCode.UNKNOWN,
      lastError
    )
  }

  /**
   * Actual transport implementation to be provided by subclasses.
   *
   * This method should contain the protocol-specific logic for delivering the message.
   * It will be automatically retried by the `send` method if it throws an error.
   *
   * @param message - The message to send.
   * @returns A promise that resolves when the delivery is successful.
   * @throws {Error} Any error encountered during delivery, which will trigger a retry.
   */
  protected abstract doSend(message: Message): Promise<void>

  /**
   * Utility method to pause execution for a given duration.
   *
   * @param ms - Milliseconds to sleep.
   * @returns A promise that resolves after the delay.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
