import type { SerializedJob, TopicOptions } from '../types'

/**
 * Queue driver interface.
 *
 * All queue drivers must implement this interface.
 * Defines basic queue operations plus optional enterprise-grade capabilities.
 *
 * @example
 * ```typescript
 * class MyDriver implements QueueDriver {
 *   async push(queue: string, job: SerializedJob): Promise<void> {
 *     // push a job
 *   }
 *
 *   async pop(queue: string): Promise<SerializedJob | null> {
 *     // pop a job
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
   */
  push(queue: string, job: SerializedJob): Promise<void>

  /**
   * Pop a job from a queue (non-blocking).
   * @param queue - Queue name
   * @returns Serialized job, or `null` if the queue is empty
   */
  pop(queue: string): Promise<SerializedJob | null>

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
}
