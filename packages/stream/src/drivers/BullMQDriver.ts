import type { JobPushOptions, QueueStats, SerializedJob, TopicOptions } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * Bull Queue client interface (compatible with bullmq package).
 */
export interface BullQueueClient {
  add(name: string, data: any, options?: any): Promise<any>
  getJob(id: string): Promise<any | null>
  count(): Promise<number>
  process(handler: (job: any) => Promise<void>): void
  on(event: string, handler: (...args: any[]) => void): void
  off(event: string, handler: (...args: any[]) => void): void
  pause(): Promise<void>
  resume(): Promise<void>
  clean(grace: number, limit?: number, type?: string): Promise<number>
  close(): Promise<void>
  getJobCounts(types?: string[]): Promise<Record<string, number>>
  getDelayedCount(): Promise<number>
  getFailedCount(): Promise<number>
  getActiveCount(): Promise<number>
  [key: string]: any
}

export interface BullWorkerClient {
  [key: string]: any
}

/**
 * Bull Queue driver configuration.
 */
export interface BullMQDriverConfig {
  /**
   * Bull Queue instance (from bullmq package).
   */
  queue: BullQueueClient

  /**
   * Optional Bull Worker instance for processing jobs.
   */
  worker?: BullWorkerClient

  /**
   * Connection options (host, port, etc. for Redis).
   */
  connection?: {
    host?: string
    port?: number
    password?: string
    db?: number
    [key: string]: any
  }

  /**
   * Default number of concurrent workers (default: 1).
   */
  concurrency?: number

  /**
   * Key prefix for namespacing queues (default: 'gravito:').
   */
  prefix?: string

  /**
   * Enable debug logging.
   */
  debug?: boolean
}

/**
 * Bull Queue driver implementation.
 *
 * Provides high-performance, persistent job queuing using Bull Queue (backed by Redis).
 * Supports priority, delays, retries, and group-based FIFO processing.
 *
 * @public
 * @example
 * ```typescript
 * import { Queue } from 'bullmq'
 * import Redis from 'ioredis'
 *
 * const redis = new Redis()
 * const queue = new Queue('gravito-events', { connection: redis })
 * const driver = new BullMQDriver({ queue })
 * ```
 */
export class BullMQDriver implements QueueDriver {
  private queue: BullQueueClient
  private prefix: string
  private debug: boolean
  private queueMap = new Map<string, BullQueueClient>()

  constructor(config: BullMQDriverConfig) {
    this.queue = config.queue
    this.prefix = config.prefix ?? 'gravito:'
    this.debug = config.debug ?? false

    if (!this.queue) {
      throw new Error('[BullMQDriver] Bull Queue instance is required.')
    }
  }

  /**
   * Get or create a queue for the given queue name.
   */
  private getQueue(queueName: string): BullQueueClient {
    const fullName = `${this.prefix}${queueName}`
    if (this.queueMap.has(fullName)) {
      return this.queueMap.get(fullName)!
    }

    // For simplicity, we'll use the same queue for all queue names
    // In a real implementation, you might create separate Queue instances
    // However, Bull Queue typically uses a single Queue instance with job namespacing

    // Note: This is a limitation of the current implementation.
    // To fully support multiple queue names, you'd need a Queue factory or pool.
    // For now, we namespace jobs within the primary queue.
    return this.queue
  }

  /**
   * Build Job Options from JobPushOptions.
   */
  private buildJobOptions(options?: JobPushOptions): Record<string, any> {
    const bullOptions: Record<string, any> = {}

    // Priority mapping: 'high' -> 1, 'normal' -> 5, 'low' -> 10
    if (options?.priority) {
      if (options.priority === 'high' || options.priority === 'critical') {
        bullOptions.priority = 1
      } else if (options.priority === 'low') {
        bullOptions.priority = 10
      } else if (typeof options.priority === 'number') {
        bullOptions.priority = Math.min(Math.max(options.priority, 1), 10)
      } else {
        bullOptions.priority = 5 // 'normal' or 'default'
      }
    }

    return bullOptions
  }

  /**
   * Create Bull job data from SerializedJob.
   */
  private createBullJobData(job: SerializedJob): any {
    return {
      id: job.id,
      type: job.type,
      data: job.data,
      className: job.className,
      createdAt: job.createdAt,
      delaySeconds: job.delaySeconds,
      attempts: job.attempts ?? 0,
      maxAttempts: job.maxAttempts ?? 3,
      groupId: job.groupId,
      retryAfterSeconds: job.retryAfterSeconds,
      retryMultiplier: job.retryMultiplier,
      error: job.error,
      failedAt: job.failedAt,
      priority: job.priority,
    }
  }

  /**
   * Pushes a job to Bull Queue.
   */
  async push(queue: string, job: SerializedJob, options?: JobPushOptions): Promise<void> {
    try {
      const q = this.getQueue(queue)
      const bullJobData = this.createBullJobData(job)
      const bullOptions: Record<string, any> = this.buildJobOptions(options)

      // Add delay if specified
      if (job.delaySeconds && job.delaySeconds > 0) {
        bullOptions.delay = job.delaySeconds * 1000 // Convert to milliseconds
      }

      // Add retry configuration
      bullOptions.attempts = job.maxAttempts ?? 3
      if (job.retryAfterSeconds) {
        bullOptions.backoff = {
          type: 'exponential',
          delay: job.retryAfterSeconds * 1000,
        }
      }

      // Add group ID for FIFO processing (if supported by Bull extensions)
      if (options?.groupId) {
        bullOptions.group = {
          id: options.groupId,
        }
      }

      // Namespace the job by queue name
      const namespacedJobName = `${queue}:${job.id}`
      await q.add(namespacedJobName, bullJobData, bullOptions)

      if (this.debug) {
        console.log(`[BullMQDriver] Pushed job ${job.id} to queue ${queue}`)
      }
    } catch (error) {
      console.error(`[BullMQDriver] Failed to push job to queue ${queue}:`, error)
      throw error
    }
  }

  /**
   * Pops a job from Bull Queue.
   * Note: Bull Queue typically uses Workers, not manual pop.
   * This is a fallback implementation.
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    try {
      this.getQueue(queue)

      // Bull Queue doesn't have a direct pop() method like Redis.
      // We'll use getJob to simulate, but this is not the intended usage pattern.
      // In production, use the Worker pattern.

      // For now, return null as Bull Queue is event-driven
      // Real implementation would require custom worker logic
      return null
    } catch (error) {
      console.error(`[BullMQDriver] Failed to pop from queue ${queue}:`, error)
      return null
    }
  }

  /**
   * Returns the size of the queue.
   */
  async size(queue: string): Promise<number> {
    try {
      const q = this.getQueue(queue)
      const count = await q.count?.()
      return count ?? 0
    } catch (error) {
      console.error(`[BullMQDriver] Failed to get queue size for ${queue}:`, error)
      return 0
    }
  }

  /**
   * Clears the queue.
   */
  async clear(queue: string): Promise<void> {
    try {
      const q = this.getQueue(queue)
      if (typeof q.clean === 'function') {
        await q.clean(0) // Remove all jobs
      }
    } catch (error) {
      console.error(`[BullMQDriver] Failed to clear queue ${queue}:`, error)
      throw error
    }
  }

  /**
   * Marks a job as failed (moves to failed list).
   */
  async fail(queue: string, job: SerializedJob): Promise<void> {
    try {
      const q = this.getQueue(queue)
      const bullJob = await q.getJob?.(job.id)

      if (bullJob) {
        const error = job.error ?? 'Job failed'
        const failureReasonError = new Error(error)
        await bullJob.moveToFailed?.(failureReasonError, true)
      }
    } catch (error) {
      console.error(`[BullMQDriver] Failed to mark job as failed:`, error)
      throw error
    }
  }

  /**
   * Returns detailed statistics for the queue.
   */
  async stats(queue: string): Promise<QueueStats> {
    try {
      const q = this.getQueue(queue)

      const counts = await q.getJobCounts?.(['active', 'completed', 'failed', 'delayed', 'waiting'])
      const delayed = await q.getDelayedCount?.()
      const failed = await q.getFailedCount?.()
      const active = await q.getActiveCount?.()

      return {
        queue,
        size: counts?.waiting ?? 0,
        delayed: delayed ?? 0,
        failed: failed ?? 0,
        reserved: active ?? 0,
      }
    } catch (error) {
      console.error(`[BullMQDriver] Failed to get stats for queue ${queue}:`, error)
      return {
        queue,
        size: 0,
        delayed: 0,
        failed: 0,
      }
    }
  }

  /**
   * Retrieves failed jobs from the Dead Letter Queue.
   */
  async getFailed(queue: string, _start = 0, _end = -1): Promise<SerializedJob[]> {
    try {
      this.getQueue(queue)

      // Bull Queue doesn't have a direct getFailed method
      // This would require custom implementation or using a separate failed list
      // For now, return empty array as placeholder
      return []
    } catch (error) {
      console.error(`[BullMQDriver] Failed to get failed jobs for queue ${queue}:`, error)
      return []
    }
  }

  /**
   * Retries failed jobs.
   */
  async retryFailed(queue: string, _count = 1): Promise<number> {
    try {
      this.getQueue(queue)

      // Bull Queue handles retries automatically via job.retry()
      // This is a placeholder for manual retry logic
      return 0
    } catch (error) {
      console.error(`[BullMQDriver] Failed to retry jobs for queue ${queue}:`, error)
      return 0
    }
  }

  /**
   * Clears the Dead Letter Queue.
   */
  async clearFailed(queue: string): Promise<void> {
    try {
      const q = this.getQueue(queue)

      if (typeof q.clean === 'function') {
        await q.clean(0, undefined, 'failed')
      }
    } catch (error) {
      console.error(`[BullMQDriver] Failed to clear failed jobs for queue ${queue}:`, error)
      throw error
    }
  }

  /**
   * Creates a new queue/topic.
   */
  async createTopic(_topic: string, _options?: TopicOptions): Promise<void> {
    // Bull Queue creates queues on-the-fly when adding jobs
    // No explicit creation needed
  }

  /**
   * Deletes a queue/topic.
   */
  async deleteTopic(topic: string): Promise<void> {
    try {
      const q = this.getQueue(topic)
      await q.close?.()
    } catch (error) {
      console.error(`[BullMQDriver] Failed to delete queue ${topic}:`, error)
      throw error
    }
  }

  /**
   * Pushes multiple jobs in batch.
   */
  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    try {
      const q = this.getQueue(queue)
      const bullJobs = jobs.map((job) => {
        const bullJobData = this.createBullJobData(job)
        const namespacedJobName = `${queue}:${job.id}`
        return {
          name: namespacedJobName,
          data: bullJobData,
        }
      })

      // Bull Queue doesn't have direct pushMany, so use individual pushes
      // or batch using addBulk if available
      for (const bullJob of bullJobs) {
        await q.add(bullJob.name, bullJob.data)
      }
    } catch (error) {
      console.error(`[BullMQDriver] Failed to push multiple jobs to queue ${queue}:`, error)
      throw error
    }
  }

  /**
   * Pops multiple jobs in batch.
   */
  async popMany(_queue: string, _count: number): Promise<SerializedJob[]> {
    // Bull Queue is event-driven, not pull-based
    // Returning empty for now; real implementation uses Workers
    return []
  }

  /**
   * Reports worker heartbeat.
   */
  async reportHeartbeat(
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
    _prefix?: string
  ): Promise<void> {
    // Placeholder for heartbeat reporting
    if (this.debug) {
      console.log(`[BullMQDriver] Worker heartbeat from ${workerInfo.id}`)
    }
  }

  /**
   * Publishes a log message.
   */
  async publishLog(
    logPayload: {
      level: string
      message: string
      workerId: string
      jobId?: string
      timestamp: string
      [key: string]: any
    },
    _prefix?: string
  ): Promise<void> {
    if (this.debug) {
      console.log(`[BullMQDriver] [${logPayload.level}] ${logPayload.message}`)
    }
  }

  /**
   * Checks rate limit for a queue.
   */
  async checkRateLimit(
    _queue: string,
    _config: { max: number; duration: number }
  ): Promise<boolean> {
    // Placeholder; would require Redis INCR/EXPIRE logic
    return true
  }

  /**
   * Retrieves all queue names.
   */
  async getQueues(): Promise<string[]> {
    // Placeholder; Bull Queue doesn't have built-in queue listing
    return ['default']
  }
}
