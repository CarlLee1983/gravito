import type { JobPushOptions, SerializedJob, TopicOptions } from '../types'

/**
 * Queue driver interface.
 *
 * All queue drivers must implement this interface.
 * Defines basic queue operations plus optional enterprise-grade capabilities.
 *
 * @example
 * ```typescript
 * class MyDriver implements QueueDriver {
 *   async push(queue: string, job: SerializedJob, options?: JobPushOptions): Promise<void> {
 *     // push a job
 *   }
 *
 *   async pop(queue: string): Promise<SerializedJob | null> {
 *     // pop a job
 *   }
 *
 *   async complete(queue: string, job: SerializedJob): Promise<void> {
 *     // job completed (for FIFO handling)
 *   }
 *
 *   async size(queue: string): Promise<number> {
 *     // queue size
 *   }
 *
 *   async clear(queue: string): Promise<void> {
 *     // clear queue
 *   }
 * }
 * ```
 */
export interface QueueDriver {
  /**
   * Push a job to a queue.
   * @param queue - Queue name
   * @param job - Serialized job
   * @param options - Push options (e.g. groupId)
   */
  push(queue: string, job: SerializedJob, options?: JobPushOptions): Promise<void>

  /**
   * Pop a job from a queue (non-blocking).
   * @param queue - Queue name
   * @returns Serialized job, or `null` if the queue is empty
   */
  pop(queue: string): Promise<SerializedJob | null>

  /**
   * Mark a job as completed (used for FIFO/Group handling).
   * @param queue - Queue name
   * @param job - Serialized job
   */
  complete?(queue: string, job: SerializedJob): Promise<void>

  /**
   * Get queue size.
   * @param queue - Queue name
   * @returns Number of jobs in the queue
   */
  size(queue: string): Promise<number>

  /**
   * Clear a queue.
   * @param queue - Queue name
   */
  clear(queue: string): Promise<void>

  /**
   * Mark a job as permanently failed (move to DLQ).
   * @param queue - Queue name
   * @param job - Serialized job with error info
   */
  fail?(queue: string, job: SerializedJob): Promise<void>

  /**
   * Push multiple jobs (optional, higher throughput).
   * @param queue - Queue name
   * @param jobs - Serialized job array
   */
  pushMany?(queue: string, jobs: SerializedJob[]): Promise<void>

  /**
   * Pop multiple jobs (optional, higher throughput).
   * @param queue - Queue name
   * @param count - Max number of jobs to pop
   * @returns Serialized job array
   */
  popMany?(queue: string, count: number): Promise<SerializedJob[]>

  /**
   * Acknowledge a message (enterprise capability, e.g. Kafka/SQS).
   * @param messageId - Message ID
   */
  acknowledge?(messageId: string): Promise<void>

  /**
   * Subscribe to a queue (push-based model, e.g. Kafka/SQS).
   * @param queue - Queue name
   * @param callback - Callback to process jobs
   */
  subscribe?(queue: string, callback: (job: SerializedJob) => Promise<void>): Promise<void>

  /**
   * Create a topic (Kafka, etc.).
   * @param topic - Topic name
   * @param options - Topic options
   */
  createTopic?(topic: string, options?: TopicOptions): Promise<void>

  /**
   * Delete a topic (Kafka, etc.).
   * @param topic - Topic name
   */
  deleteTopic?(topic: string): Promise<void>

  /**
   * Report worker heartbeat for monitoring.
   * @param workerInfo - Worker information
   * @param prefix - Optional prefix for monitoring keys
   */
  reportHeartbeat?(workerInfo: any, prefix?: string): Promise<void>

  /**
   * Publish a log message for monitoring.
   * @param logPayload - Log payload
   * @param prefix - Optional prefix for monitoring channels/keys
   */
  publishLog?(logPayload: any, prefix?: string): Promise<void>

  /**
   * Check if a queue is rate limited.
   * @param queue - Queue name
   * @param config - Rate limit configuration
   * @returns true if allowed, false if limited
   */
  checkRateLimit?(queue: string, config: { max: number; duration: number }): Promise<boolean>

  /**
   * Retry failed jobs from DLQ.
   * @param queue - Queue name
   * @param count - Optional count (default: all)
   * @returns Number of jobs retried
   */
  retryFailed?(queue: string, count?: number): Promise<number>

  /**
   * Get failed jobs from DLQ.
   * @param queue - Queue name
   * @param start - Start index
   * @param end - End index
   * @returns Array of failed jobs
   */
  getFailed?(queue: string, start?: number, end?: number): Promise<SerializedJob[]>

  /**
   * Clear failed jobs from DLQ.
   * @param queue - Queue name
   */
  clearFailed?(queue: string): Promise<void>
}
