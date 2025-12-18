import type { SerializedJob } from '../types'
import type { QueueDriver } from './QueueDriver'

/**
 * Memory Driver
 *
 * In-memory driver for development and testing.
 * All data is stored in memory and will be lost when the process restarts.
 *
 * Zero-config: works out of the box.
 *
 * @example
 * ```typescript
 * const driver = new MemoryDriver()
 * await driver.push('default', serializedJob)
 * const job = await driver.pop('default')
 * ```
 */
export class MemoryDriver implements QueueDriver {
  private queues = new Map<string, SerializedJob[]>()

  /**
   * Push a job to a queue.
   */
  async push(queue: string, job: SerializedJob): Promise<void> {
    if (!this.queues.has(queue)) {
      this.queues.set(queue, [])
    }
    this.queues.get(queue)?.push(job)
  }

  /**
   * Pop a job from a queue (FIFO).
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
   * Get queue size.
   */
  async size(queue: string): Promise<number> {
    return this.queues.get(queue)?.length ?? 0
  }

  /**
   * Clear a queue.
   */
  async clear(queue: string): Promise<void> {
    this.queues.delete(queue)
  }

  /**
   * Push multiple jobs.
   */
  async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
    if (!this.queues.has(queue)) {
      this.queues.set(queue, [])
    }
    this.queues.get(queue)?.push(...jobs)
  }

  /**
   * Pop multiple jobs.
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
}
