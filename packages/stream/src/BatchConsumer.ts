import type { Job } from './Job'
import type { QueueManager } from './QueueManager'

/**
 * Configuration options for the BatchConsumer.
 *
 * @example
 * ```typescript
 * const options: BatchConsumerOptions = {
 *   batchSize: 50,
 *   autoAck: false
 * };
 * ```
 */
export interface BatchConsumerOptions {
  /**
   * The name of the queue to consume from.
   * @default 'default'
   */
  queue?: string

  /**
   * The connection name to use.
   * @default The default connection of QueueManager
   */
  connection?: string

  /**
   * The number of jobs to try to retrieve in each batch.
   * @default 10
   */
  batchSize?: number

  /**
   * The polling interval in milliseconds when the queue is empty.
   * @default 1000
   */
  pollInterval?: number

  /**
   * Whether to automatically complete jobs after the handler returns successfully.
   *
   * If set to `false`, the handler function is responsible for calling `manager.complete()`
   * or `manager.fail()` for each job.
   *
   * @default true
   */
  autoAck?: boolean
}

/**
 * Specialized consumer for processing jobs in bulk.
 *
 * Unlike the standard `Consumer` which processes jobs individually (even if fetched in batches),
 * the `BatchConsumer` passes an array of jobs to a single handler function. This is ideal for
 * operations that benefit from bulk processing, such as database inserts or API calls that support batching.
 *
 * @public
 * @example
 * ```typescript
 * const consumer = new BatchConsumer(manager, async (jobs) => {
 *   // Process 100 jobs at once
 *   await elasticsearch.bulkIndex(jobs.map(j => j.data));
 * }, { batchSize: 100 });
 *
 * consumer.start();
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
   * Starts the batch consuming loop.
   *
   * Continuously polls for batches of jobs and passes them to the handler.
   */
  async start(): Promise<void> {
    if (this.running) {
      return
    }
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
   * Stops the consumer loop.
   *
   * Sets the running flag to false. The loop will exit after the current iteration finishes.
   */
  stop(): void {
    this.running = false
  }
}
