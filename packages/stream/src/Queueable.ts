/**
 * Defines the contract for queueable items (jobs) with fluent configuration.
 *
 * This interface enables method chaining for configuring job properties such as
 * target queue, connection, delay, and priority before dispatching. It ensures
 * consistent API surface across different job implementations.
 *
 * @public
 * @example
 * ```typescript
 * class MyJob implements Queueable {
 *   queueName?: string
 *   // ... implementation
 *   onQueue(queue: string): this {
 *     this.queueName = queue
 *     return this
 *   }
 *   // ...
 * }
 * ```
 */
export interface Queueable {
  /**
   * The specific queue name where the job should be processed.
   *
   * If not set, the default queue for the connection will be used.
   */
  queueName?: string

  /**
   * The connection name (e.g., 'redis', 'sqs') to use for this job.
   *
   * If not set, the default connection configured in QueueManager will be used.
   */
  connectionName?: string

  /**
   * The number of seconds to delay the job execution.
   */
  delaySeconds?: number

  /**
   * The priority level of the job.
   */
  priority?: string | number

  /**
   * Sets the target queue for the job.
   *
   * @param queue - The name of the queue to push the job to.
   * @returns The instance for method chaining.
   *
   * @example
   * ```typescript
   * job.onQueue('notifications');
   * ```
   */
  onQueue(queue: string): this

  /**
   * Sets the target connection for the job.
   *
   * @param connection - The name of the connection to use.
   * @returns The instance for method chaining.
   *
   * @example
   * ```typescript
   * job.onConnection('sqs');
   * ```
   */
  onConnection(connection: string): this

  /**
   * Sets the priority of the job.
   *
   * @param priority - The priority level (e.g., 'high', 'low', 10).
   * @returns The instance for method chaining.
   *
   * @example
   * ```typescript
   * job.withPriority('critical');
   * ```
   */
  withPriority(priority: string | number): this

  /**
   * Sets a delay before the job is available for processing.
   *
   * @param delay - The delay in seconds.
   * @returns The instance for method chaining.
   *
   * @example
   * ```typescript
   * job.delay(300); // 5 minutes
   * ```
   */
  delay(delay: number): this
}
