/**
 * Queueable interface.
 *
 * Classes implementing this interface can be pushed to a queue for execution.
 * Provides a fluent API for queue/connection/delay configuration.
 *
 * @example
 * ```typescript
 * class MyJob implements Queueable {
 *   queueName?: string
 *   connectionName?: string
 *   delaySeconds?: number
 *
 *   onQueue(queue: string): this {
 *     this.queueName = queue
 *     return this
 *   }
 *
 *   onConnection(connection: string): this {
 *     this.connectionName = connection
 *     return this
 *   }
 *
 *   delay(seconds: number): this {
 *     this.delaySeconds = seconds
 *     return this
 *   }
 * }
 * ```
 */
export interface Queueable {
  /**
   * Queue name where the job should be pushed.
   */
  queueName?: string

  /**
   * Connection name the job should use.
   */
  connectionName?: string

  /**
   * Delay before execution (seconds).
   */
  delaySeconds?: number

  /**
   * Set target queue.
   * @param queue - Queue name
   * @returns Self for fluent chaining
   */
  onQueue(queue: string): this

  /**
   * Set target connection.
   * @param connection - Connection name
   * @returns Self for fluent chaining
   */
  onConnection(connection: string): this

  /**
   * Set delay (seconds).
   * @param delay - Delay seconds
   * @returns Self for fluent chaining
   */
  delay(delay: number): this
}
