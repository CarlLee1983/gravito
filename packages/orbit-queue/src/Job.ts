import type { Queueable } from './Queueable'

/**
 * Base Job.
 *
 * All tasks that should be pushed to a queue should extend this class.
 * Implements the `Queueable` interface, providing a fluent API for queue/connection/delay.
 *
 * @example
 * ```typescript
 * class SendWelcomeEmail extends Job {
 *   constructor(private userId: string) {
 *     super()
 *   }
 *
 *   async handle(): Promise<void> {
 *     const user = await User.find(this.userId)
 *     await mail.send(new WelcomeEmail(user))
 *   }
 * }
 *
 * // Usage
 * await queue.push(new SendWelcomeEmail('123'))
 *   .onQueue('emails')
 *   .delay(60)
 * ```
 */
export abstract class Job implements Queueable {
  /**
   * Queue name.
   */
  queueName?: string

  /**
   * Connection name.
   */
  connectionName?: string

  /**
   * Delay before execution (seconds).
   */
  delaySeconds?: number

  /**
   * Current attempt number.
   */
  attempts?: number

  /**
   * Maximum attempts.
   */
  maxAttempts?: number

  /**
   * Set target queue.
   */
  onQueue(queue: string): this {
    this.queueName = queue
    return this
  }

  /**
   * Set target connection.
   */
  onConnection(connection: string): this {
    this.connectionName = connection
    return this
  }

  /**
   * Set delay (seconds).
   */
  delay(delay: number): this {
    this.delaySeconds = delay
    return this
  }

  /**
   * Job handler logic.
   *
   * Subclasses must implement this method.
   */
  abstract handle(): Promise<void>

  /**
   * Failure handler (optional).
   *
   * Called when the job fails and reaches the maximum number of attempts.
   * Subclasses can override to implement custom failure handling.
   *
   * @param error - Error instance
   */
  async failed(_error: Error): Promise<void> {
    // No-op by default (override in subclasses if needed)
  }
}
