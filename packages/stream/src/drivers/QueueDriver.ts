import type { JobPushOptions, QueueStats, SerializedJob, TopicOptions } from '../types'

/**
 * Queue driver interface.
 *
 * Defines the contract that all storage backends (Redis, Database, SQS, etc.) must implement
 * to be compatible with the QueueManager. It covers the basic operations for a job queue:
 * push, pop, size, and clear.
 *
 * Advanced capabilities like rate limiting, reliable delivery (acknowledgements), and
 * batch operations are optional but recommended for high-performance drivers.
 *
 * @public
 * @example
 * ```typescript
 * class MyCustomDriver implements QueueDriver {
 *   async push(queue: string, job: SerializedJob) {
 *     // ... write to storage
 *   }
 *   async pop(queue: string) {
 *     // ... read from storage
 *     return job;
 *   }
 *   async size(queue: string) { return 0; }
 *   async clear(queue: string) {}
 * }
 * ```
 */
export interface QueueDriver {
  /**
   * Pushes a job onto the specified queue.
   *
   * @param queue - The name of the queue.
   * @param job - The serialized job data.
   * @param options - Optional parameters like priority or group ID.
   * @returns A promise that resolves when the job is successfully stored.
   */
  push(queue: string, job: SerializedJob, options?: JobPushOptions): Promise<void>

  /**
   * Retrieves and removes the next job from the queue (FIFO).
   *
   * @param queue - The name of the queue.
   * @returns The serialized job if available, or `null` if the queue is empty.
   */
  pop(queue: string): Promise<SerializedJob | null>

  /**
   * Blocking version of `pop`. Waits for a job to arrive if the queue is empty.
   *
   * @param queues - A single queue name or an array of queues to listen to.
   * @param timeout - The maximum time to wait in seconds (0 means indefinite).
   * @returns The serialized job if one arrives within the timeout, or `null`.
   */
  popBlocking?(queues: string | string[], timeout: number): Promise<SerializedJob | null>

  /**
   * Marks a job as completed.
   *
   * Used primarily by drivers that support advanced flow control (like FIFO groups)
   * or explicit acknowledgement (like SQS/RabbitMQ).
   *
   * @param queue - The name of the queue.
   * @param job - The job that was completed.
   */
  complete?(queue: string, job: SerializedJob): Promise<void>

  /**
   * Returns the number of jobs currently waiting in the queue.
   *
   * @param queue - The name of the queue.
   * @returns The count of pending jobs.
   */
  size(queue: string): Promise<number>

  /**
   * Removes all jobs from the specified queue.
   *
   * @param queue - The name of the queue to purge.
   */
  clear(queue: string): Promise<void>

  /**
   * Moves a job to the Dead Letter Queue (DLQ) after repeated failures.
   *
   * @param queue - The original queue name.
   * @param job - The job data (usually including error information).
   */
  fail?(queue: string, job: SerializedJob): Promise<void>

  /**
   * Retrieves detailed statistics for a queue.
   *
   * @param queue - The name of the queue.
   * @returns An object containing counts for pending, delayed, failed, etc.
   */
  stats?(queue: string): Promise<QueueStats>

  /**
   * Pushes multiple jobs to the queue in a single batch operation.
   *
   * @param queue - The name of the queue.
   * @param jobs - An array of serialized jobs.
   */
  pushMany?(queue: string, jobs: SerializedJob[]): Promise<void>

  /**
   * Retrieves multiple jobs from the queue in a single batch operation.
   *
   * @param queue - The name of the queue.
   * @param count - The maximum number of jobs to retrieve.
   * @returns An array of serialized jobs.
   */
  popMany?(queue: string, count: number): Promise<SerializedJob[]>

  /**
   * Acknowledges a specific message by its ID.
   *
   * Used for drivers that require explicit acknowledgement (e.g., SQS, Kafka).
   *
   * @param messageId - The ID of the message to acknowledge.
   */
  acknowledge?(messageId: string): Promise<void>

  /**
   * Subscribes to a queue for real-time job processing (Push model).
   *
   * Alternative to polling (`pop`). The driver pushes jobs to the callback as they arrive.
   *
   * @param queue - The name of the queue.
   * @param callback - The function to call when a job is received.
   */
  subscribe?(queue: string, callback: (job: SerializedJob) => Promise<void>): Promise<void>

  /**
   * Creates a new topic or queue (for drivers like Kafka/RabbitMQ).
   *
   * @param topic - The name of the topic/queue.
   * @param options - Configuration options (partitions, replication, etc.).
   */
  createTopic?(topic: string, options?: TopicOptions): Promise<void>

  /**
   * Deletes a topic or queue.
   *
   * @param topic - The name of the topic/queue to delete.
   */
  deleteTopic?(topic: string): Promise<void>

  /**
   * Sends a heartbeat signal for a worker instance.
   *
   * Used for monitoring worker health and presence.
   *
   * @param workerInfo - Metadata about the worker (ID, status, resources).
   * @param prefix - Optional key prefix for storage.
   */
  reportHeartbeat?(
    workerInfo: {
      id: string
      status: string
      hostname: string
      pid: number
      uptime: number
      last_ping: string
      queues: string[]
      metrics?: Record<string, any>
      [key: string]: any
    },
    prefix?: string
  ): Promise<void>

  /**
   * Publishes a log entry to the monitoring system.
   *
   * @param logPayload - The log data (level, message, context).
   * @param prefix - Optional key prefix.
   */
  publishLog?(
    logPayload: {
      level: string
      message: string
      workerId: string
      jobId?: string
      timestamp: string
      [key: string]: any
    },
    prefix?: string
  ): Promise<void>

  /**
   * Checks if a specific queue has exceeded its rate limit.
   *
   * @param queue - The name of the queue.
   * @param config - The rate limit rules (max jobs per duration).
   * @returns `true` if the job is allowed to proceed, `false` if limited.
   */
  checkRateLimit?(queue: string, config: { max: number; duration: number }): Promise<boolean>

  /**
   * Retries failed jobs from the Dead Letter Queue.
   *
   * Moves jobs from the DLQ back to the active queue.
   *
   * @param queue - The name of the queue.
   * @param count - The number of jobs to retry (optional).
   * @returns The number of jobs actually moved.
   */
  retryFailed?(queue: string, count?: number): Promise<number>

  /**
   * Retrieves a list of failed jobs from the Dead Letter Queue.
   *
   * @param queue - The name of the queue.
   * @param start - Pagination start index.
   * @param end - Pagination end index.
   * @returns An array of failed jobs.
   */
  getFailed?(queue: string, start?: number, end?: number): Promise<SerializedJob[]>

  /**
   * Clears the Dead Letter Queue for a specific queue.
   *
   * @param queue - The name of the queue.
   */
  clearFailed?(queue: string): Promise<void>

  /**
   * Lists all queues managed by this driver.
   *
   * Useful for monitoring dashboards to discover active queues dynamically.
   *
   * @returns A list of queue names.
   */
  getQueues?(): Promise<string[]>

  /**
   * Registers a notification listener for when jobs arrive in a queue.
   *
   * Only sends the queue name as notification, not the job data itself.
   * The consumer is responsible for pulling jobs from the queue.
   * This enables reactive pull-based consumption with low latency.
   *
   * @param queues - One or more queue names to listen for notifications.
   * @param callback - Called when a job arrives in any of the queues, with the queue name.
   * @returns A promise that resolves when the listener is registered.
   *
   * @example
   * ```typescript
   * driver.onNotify(['emails', 'sms'], (queue) => {
   *   console.log(`Job arrived in ${queue}`);
   *   // Consumer will pull from this queue reactively
   * });
   * ```
   */
  onNotify?(queues: string | string[], callback: (queue: string) => Promise<void>): Promise<void>

  /**
   * Enables real-time notifications for job arrivals.
   *
   * Activates the notification mechanism so that `onNotify` callbacks are invoked.
   * Called once during consumer startup.
   *
   * @returns A promise that resolves when notifications are enabled.
   */
  enableNotifications?(): Promise<void>

  /**
   * Disables real-time notifications for job arrivals.
   *
   * Stops the notification mechanism to prevent further `onNotify` callbacks.
   * Called during consumer shutdown.
   *
   * @returns A promise that resolves when notifications are disabled.
   */
  disableNotifications?(): Promise<void>
}
