import type { Job } from '../Job'
import type { QueueManager } from '../QueueManager'
import type { ConsumerStrategy } from './ConsumerStrategy'

/**
 * PollingStrategy implements pull-based job consumption.
 *
 * Continuously polls queues at adaptive intervals, backing off when empty
 * and resetting when jobs are found.
 *
 * Characteristics:
 * - Simple and reliable
 * - Predictable polling intervals
 * - Higher latency and resource usage vs reactive
 * - No external dependencies (works with any driver)
 *
 * @public
 */
export class PollingStrategy implements ConsumerStrategy {
  private running = false

  constructor(
    private queueManager: QueueManager,
    private queues: string[],
    private connectionName: string,
    private options: {
      minPollInterval: number
      maxPollInterval: number
      backoffMultiplier: number
      batchSize: number
      useBlocking: boolean
      blockingTimeout: number
      concurrency: number
      stats: { active: number }
      debug: boolean
      log: (message: string, data?: unknown) => void
    }
  ) {}

  async start(): Promise<void> {
    if (this.running) {
      throw new Error('PollingStrategy is already running')
    }
    this.running = true
    this.stopRequested = false
    this.options.log('[PollingStrategy] Started')
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return
    }
    this.options.log('[PollingStrategy] Stopping...')
    this.stopRequested = true
    this.running = false
    this.options.log('[PollingStrategy] Stopped')
  }

  isRunning(): boolean {
    return this.running
  }

  async fetchJobs(): Promise<Job[]> {
    if (!this.running) {
      return []
    }

    const capacity = this.options.concurrency - this.options.stats.active
    if (capacity <= 0) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      return []
    }

    const currentBatchSize = Math.min(this.options.batchSize, capacity)
    const jobs: Job[] = []

    try {
      const driver = this.queueManager.getDriver(this.connectionName)

      if (currentBatchSize > 1) {
        // Batch fetch
        for (const queue of this.queues) {
          const fetched = await this.queueManager.popMany(
            queue,
            currentBatchSize,
            this.connectionName
          )
          if (fetched.length > 0) {
            jobs.push(...fetched)
            break
          }
        }
      } else {
        // Single fetch
        if (this.options.useBlocking && driver.popBlocking) {
          const job = await this.queueManager.popBlocking(
            this.queues,
            this.options.blockingTimeout,
            this.connectionName
          )
          if (job) {
            jobs.push(job)
          }
        } else {
          // Sequential non-blocking pop
          for (const queue of this.queues) {
            const job = await this.queueManager.pop(queue, this.connectionName)
            if (job) {
              jobs.push(job)
              break
            }
          }
        }
      }
    } catch (error) {
      console.error('[PollingStrategy] Error fetching jobs:', error)
    }

    return jobs
  }
}
