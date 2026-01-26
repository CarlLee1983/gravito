import type { Queueable } from './Queueable'

/**
 * Abstract base class for all background jobs.
 *
 * This class serves as the foundation for creating queueable tasks. It implements the `Queueable`
 * interface for fluent configuration and provides the core structure for defining execution logic (`handle`)
 * and failure handling (`failed`).
 *
 * Subclasses must implement the `handle` method.
 *
 * @public
 * @example
 * ```typescript
 * export class SendEmailJob extends Job {
 *   constructor(private email: string, private subject: string) {
 *     super();
 *   }
 *
 *   async handle(): Promise<void> {
 *     await emailService.send(this.email, this.subject);
 *   }
 * }
 *
 * // Usage
 * await queue.push(new SendEmailJob('user@example.com', 'Welcome'))
 *   .onQueue('emails')
 *   .delay(60);
 * ```
 */
export abstract class Job implements Queueable {
  /**
   * Unique identifier for the job instance.
   *
   * Assigned automatically when the job is pushed to the queue.
   */
  id?: string

  /**
   * The name of the queue where this job will be processed.
   */
  queueName?: string

  /**
   * The name of the connection used to transport this job.
   */
  connectionName?: string

  /**
   * Delay in seconds before the job becomes available for processing.
   */
  delaySeconds?: number

  /**
   * The current attempt number (starts at 1).
   */
  attempts?: number

  /**
   * The maximum number of retry attempts allowed.
   *
   * Can be overridden by the worker configuration or per-job using `maxAttempts`.
   */
  maxAttempts?: number

  /**
   * Group ID for sequential processing.
   *
   * Jobs with the same `groupId` will be processed in strict order (FIFO)
   * if the consumer supports it.
   */
  groupId?: string

  /**
   * Priority level of the job.
   */
  priority?: string | number

  /**
   * Initial delay in seconds before the first retry attempt.
   *
   * Used for exponential backoff calculation.
   */
  retryAfterSeconds?: number

  /**
   * Multiplier applied to the retry delay for each subsequent attempt.
   *
   * Used for exponential backoff calculation.
   */
  retryMultiplier?: number

  /**
   * Sets the target queue for the job.
   *
   * @param queue - The name of the target queue.
   * @returns The job instance for chaining.
   *
   * @example
   * ```typescript
   * job.onQueue('billing');
   * ```
   */
  onQueue(queue: string): this {
    this.queueName = queue
    return this
  }

  /**
   * Sets the target connection for the job.
   *
   * @param connection - The name of the connection (e.g., 'redis').
   * @returns The job instance for chaining.
   *
   * @example
   * ```typescript
   * job.onConnection('sqs-primary');
   * ```
   */
  onConnection(connection: string): this {
    this.connectionName = connection
    return this
  }

  /**
   * Sets the priority of the job.
   *
   * @param priority - The priority level (e.g., 'high', 10).
   * @returns The job instance for chaining.
   *
   * @example
   * ```typescript
   * job.withPriority('high');
   * ```
   */
  withPriority(priority: string | number): this {
    this.priority = priority
    return this
  }

  /**
   * Delays the job execution.
   *
   * @param delay - Delay in seconds.
   * @returns The job instance for chaining.
   *
   * @example
   * ```typescript
   * job.delay(60); // Run after 1 minute
   * ```
   */
  delay(delay: number): this {
    this.delaySeconds = delay
    return this
  }

  /**
   * Configures the exponential backoff strategy for retries.
   *
   * @param seconds - Initial delay in seconds before the first retry.
   * @param multiplier - Factor by which the delay increases for each subsequent attempt (default: 2).
   * @returns The job instance for chaining.
   *
   * @example
   * ```typescript
   * // Wait 5s, then 10s, then 20s...
   * job.backoff(5, 2);
   * ```
   */
  backoff(seconds: number, multiplier = 2): this {
    this.retryAfterSeconds = seconds
    this.retryMultiplier = multiplier
    return this
  }

  /**
   * Calculates the delay for the next retry attempt based on the backoff strategy.
   *
   * Uses the formula: `initialDelay * multiplier^(attempt - 1)`, capped at 1 hour.
   *
   * @param attempt - The current attempt number (1-based).
   * @returns The calculated delay in milliseconds.
   *
   * @example
   * ```typescript
   * const nextDelay = job.getRetryDelay(2);
   * ```
   */
  getRetryDelay(attempt: number): number {
    const initialDelay = (this.retryAfterSeconds ?? 1) * 1000
    const multiplier = this.retryMultiplier ?? 2
    // Exponential backoff: initial * multiplier^(attempt-1)
    // capped at 1 hour for safety
    return Math.min(initialDelay * multiplier ** (attempt - 1), 3600000)
  }

  /**
   * Contains the main business logic of the job.
   *
   * This method is called by the worker to process the job.
   * Implementations should be idempotent if possible.
   *
   * @throws {Error} If the job fails and should be retried.
   */
  abstract handle(): Promise<void>

  /**
   * Optional handler for when the job has permanently failed.
   *
   * Called when the job has exhausted all retry attempts.
   * Useful for cleaning up resources, sending alerts, or logging.
   *
   * @param _error - The error that caused the final failure.
   *
   * @example
   * ```typescript
   * async failed(error: Error) {
   *   await notifyAdmin(`Job failed: ${error.message}`);
   * }
   * ```
   */
  async failed(_error: Error): Promise<void> {
    // No-op by default (override in subclasses if needed)
  }
}
