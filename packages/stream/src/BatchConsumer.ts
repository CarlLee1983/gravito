import type { Job } from './Job'
import type { QueueManager } from './QueueManager'

/**
 * Batch Consumer Options
 */
export interface BatchConsumerOptions {
  /**
   * Queue name to consume from.
   * @default 'default'
   */
  queue?: string

  /**
   * Connection name.
   * @default default connection
   */
  connection?: string

  /**
   * Number of jobs to process in a batch.
   * @default 10
   */
  batchSize?: number

  /**
   * Polling interval in milliseconds when queue is empty.
   * @default 1000
   */
  pollInterval?: number

  /**
   * Whether to automatically acknowledge (complete) jobs after successful handling.
   * If false, the handler is responsible for completing/failing jobs.
   * @default true
   */
  autoAck?: boolean
}

/**
 * Batch Consumer
 *
 * Efficiently polls and processes jobs in batches.
 * Reduces I/O overhead by using `popMany` and processing jobs in bulk.
 *
 * @example
 * ```typescript
 * const consumer = new BatchConsumer(manager, async (jobs) => {
 *   console.log(`Processing ${jobs.length} jobs...`)
 *   await db.insertMany(jobs.map(j => j.data))
 * }, { batchSize: 100 })
 *
 * consumer.start()
 * ```
 */
export class BatchConsumer {
  private running = false
  private options: BatchConsumerOptions

  constructor(
    private manager: QueueManager,
    private handler: (jobs: Job[]) => Promise<void>,
    options: BatchConsumerOptions = {}
  ) {
    this.options = {
      queue: 'default',
      batchSize: 10,
      pollInterval: 1000,
      autoAck: true,
      ...options,
    }
  }

  /**
   * Start consuming.
   */
  async start(): Promise<void> {
    if (this.running) return
    this.running = true

    const { queue, connection, batchSize, pollInterval, autoAck } = this.options

    while (this.running) {
      try {
        const jobs = await this.manager.popMany(queue, batchSize, connection)

        if (jobs.length > 0) {
          try {
            await this.handler(jobs)

            if (autoAck) {
              // Complete all jobs in parallel
              await Promise.all(jobs.map((job) => this.manager.complete(job)))
            }
          } catch (error) {
            console.error(`[BatchConsumer] Batch processing failed:`, error)
            const err = error instanceof Error ? error : new Error(String(error))

            if (autoAck) {
              // Fail all jobs in parallel
              await Promise.all(jobs.map((job) => this.manager.fail(job, err)))
            }
          }
        } else {
          // Empty queue, wait
          await new Promise((resolve) => setTimeout(resolve, pollInterval))
        }
      } catch (err) {
        console.error(`[BatchConsumer] Polling error:`, err)
        // Wait before retrying to avoid tight loop on error
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
      }
    }
  }

  /**
   * Stop consuming.
   */
  stop(): void {
    this.running = false
  }
}
