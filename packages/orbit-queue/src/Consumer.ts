import type { QueueManager } from './QueueManager'
import type { WorkerOptions } from './Worker'
import { Worker } from './Worker'

/**
 * Consumer options.
 */
export interface ConsumerOptions {
  /**
   * Queues to listen on.
   */
  queues: string[]

  /**
   * Connection name.
   */
  connection?: string

  /**
   * Worker options.
   */
  workerOptions?: WorkerOptions

  /**
   * Polling interval (milliseconds).
   */
  pollInterval?: number

  /**
   * Whether to keep polling when queues are empty.
   */
  keepAlive?: boolean
}

/**
 * Consumer
 *
 * Consumes and executes jobs from queues.
 * Supports embedded mode (inside the main app) and standalone mode (as a worker service).
 *
 * @example
 * ```typescript
 * // Embedded mode
 * const consumer = new Consumer(queueManager, {
 *   queues: ['default', 'emails'],
 *   pollInterval: 1000
 * })
 *
 * consumer.start()
 *
 * // Standalone mode (CLI)
 * // Start via CLI tooling with graceful shutdown
 * ```
 */
export class Consumer {
  private running = false
  private stopRequested = false

  constructor(
    private queueManager: QueueManager,
    private options: ConsumerOptions
  ) {}

  /**
   * Start the consumer loop.
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Consumer is already running')
    }

    this.running = true
    this.stopRequested = false

    const worker = new Worker(this.options.workerOptions)
    const pollInterval = this.options.pollInterval ?? 1000
    const keepAlive = this.options.keepAlive ?? true

    console.log('[Consumer] Started', {
      queues: this.options.queues,
      connection: this.options.connection,
    })

    // Main loop
    while (this.running && !this.stopRequested) {
      let processed = false

      for (const queue of this.options.queues) {
        try {
          const job = await this.queueManager.pop(queue, this.options.connection)

          if (job) {
            processed = true
            await worker.process(job).catch((error) => {
              console.error(`[Consumer] Error processing job in queue "${queue}":`, error)
            })
          }
        } catch (error) {
          console.error(`[Consumer] Error polling queue "${queue}":`, error)
        }
      }

      // If nothing was processed and keepAlive is disabled, exit
      if (!processed && !keepAlive) {
        break
      }

      // Wait and poll again
      if (!this.stopRequested) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
      }
    }

    this.running = false
    console.log('[Consumer] Stopped')
  }

  /**
   * Stop the consumer loop (graceful shutdown).
   */
  async stop(): Promise<void> {
    console.log('[Consumer] Stopping...')
    this.stopRequested = true

    // Wait for current processing to finish
    while (this.running) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  /**
   * Check whether the consumer is running.
   */
  isRunning(): boolean {
    return this.running
  }
}
