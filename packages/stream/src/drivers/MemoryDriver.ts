import type { QueueStats, SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * Configuration options for the MemoryDriver.
 */
export interface MemoryDriverConfig {
  /**
   * The maximum number of jobs allowed in a single queue.
   *
   * @default Infinity
   */
  maxSize?: number
}

/**
 * In-memory queue driver.
 *
 * Stores jobs in a local JavaScript Map. Ideal for development, testing, and simple
 * use cases where persistence across restarts is not required.
 * It supports basic delay handling but data is volatile.
 *
 * @public
 * @example
 * ```typescript
 * const driver = new MemoryDriver({ maxSize: 1000 });
 * await driver.push('default', job);
 * ```
 */
export class MemoryDriver implements QueueDriver {
  private queues = new Map<string, SerializedJob[]>()
  private maxSize: number
  private readonly callbacks = new Map<string, Array<(queue: string) => Promise<void>>>()
  private notificationsEnabled = false

  constructor(config: MemoryDriverConfig = {}) {
    this.maxSize = config.maxSize ?? Infinity
  }

  /**
   * Pushes a job to the in-memory queue.
   *
   * @param queue - The queue name.
   * @param job - The serialized job.
   * @throws {Error} If the queue has reached `maxSize`.
   */
  async push(queue: string, job: SerializedJob): Promise<void> {
    if (!this.queues.has(queue)) {
      this.queues.set(queue, [])
    }

    const q = this.queues.get(queue)!
    if (q.length >= this.maxSize) {
      throw new Error(`[MemoryDriver] Queue '${queue}' is full (max size: ${this.maxSize})`)
    }

    q.push(job)
    this.notify(queue)
  }

  /**
   * Pops the next available job from the queue.
   *
   * Respects `delaySeconds` by checking the job's `createdAt` timestamp.
   *
   * @param queue - The queue name.
   * @returns The job or `null`.
   */
  async pop(queue: string): Promise<SerializedJob | null> {
    const queueJobs = this.queues.get(queue)
    if (!queueJobs || queueJobs.length === 0) {
      return null
    }

    // Respect delayed jobs
    const now = Date.now()
    const availableIndex = queueJobs.findIndex(
      (job) => !job.delaySeconds || now >= job.createdAt + job.delaySeconds * 1000
    )

    if (availableIndex === -1) {
      return null
    }

    return queueJobs.splice(availableIndex, 1)[0]!
  }

  /**
   * Returns the number of jobs in the queue.
   *
   * @param queue - The queue name.
   */
  async size(queue: string): Promise<number> {
    return this.queues.get(queue)?.length ?? 0
  }

  /**
   * Clears all jobs from the queue.
   *
   * @param queue - The queue name.
   */
  async clear(queue: string): Promise<void> {
    this.queues.delete(queue)
  }

  /**
   * Moves a job to the failed (DLQ) list.
   *
   * In MemoryDriver, this simply pushes to a `failed:{queue}` list.
   *
   * @param queue - The original queue name.
   * @param job - The failed job.
   */
  async fail(queue: string, job: SerializedJob): Promise<void> {
    const failedQueue = `failed:${queue}`
    if (!this.queues.has(failedQueue)) {
      this.queues.set(failedQueue, [])
    }
    this.queues.get(failedQueue)?.push(job)
  }

  /**
   * Retrieves statistics for the queue.
   *
   * Calculates pending, delayed, and failed counts by iterating through the list.
   *
   * @param queue - The queue name.
   */
  async stats(queue: string): Promise<QueueStats> {
    const jobs = this.queues.get(queue) || []
    const now = Date.now()

    let pending = 0
    let delayed = 0

    for (const job of jobs) {
      const isDelayed = job.delaySeconds && now < job.createdAt + job.delaySeconds * 1000
      if (isDelayed) {
        delayed++
      } else {
        pending++
      }
    }

    return {
      queue,
      size: pending,
      delayed,
      failed: this.queues.get(`failed:${queue}`)?.length || 0,
    }
  }

  /**
   * Pushes multiple jobs to the queue.
   *
   * @param queue - The queue name.
   * @param jobs - Array of jobs.
   */
  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (!this.queues.has(queue)) {
      this.queues.set(queue, [])
    }
    this.queues.get(queue)?.push(...jobs)
    this.notify(queue)
  }

  /**
   * Pops multiple jobs from the queue.
   *
   * @param queue - The queue name.
   * @param count - Max jobs to pop.
   */
  async popMany(queue: string, count: number): Promise<SerializedJob[]> {
    const results: SerializedJob[] = []
    for (let i = 0; i < count; i++) {
      const job = await this.pop(queue)
      if (job) {
        results.push(job)
      } else {
        break
      }
    }
    return results
  }

  /**
   * Lists all active queues in memory.
   */
  async getQueues(): Promise<string[]> {
    return Array.from(this.queues.keys())
      .filter((q) => !q.startsWith('failed:'))
      .sort()
  }

  /**
   * Enable notifications for this driver.
   */
  async enableNotifications(): Promise<void> {
    this.notificationsEnabled = true
  }

  /**
   * Disable notifications for this driver.
   */
  async disableNotifications(): Promise<void> {
    this.notificationsEnabled = false
  }

  /**
   * Register a notification callback for specific queues.
   *
   * @param queues - The queue names.
   * @param callback - The callback function.
   */
  async onNotify(
    queues: string | string[],
    callback: (queue: string) => Promise<void>
  ): Promise<void> {
    const queueList = Array.isArray(queues) ? queues : [queues]
    for (const queue of queueList) {
      if (!this.callbacks.has(queue)) {
        this.callbacks.set(queue, [])
      }
      this.callbacks.get(queue)?.push(callback)
    }
  }

  /**
   * Internal notify helper.
   *
   * @param queue - The queue name.
   */
  private notify(queue: string): void {
    if (!this.notificationsEnabled) {
      return
    }

    const queueCallbacks = this.callbacks.get(queue)
    if (queueCallbacks) {
      for (const cb of queueCallbacks) {
        cb(queue).catch((_err) => {
          // Ignore notification errors in memory driver
        })
      }
    }
  }
}
