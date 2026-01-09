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

  /**
   * Monitoring options.
   */
  monitor?:
    | boolean
    | {
        /**
         * Heartbeat interval (milliseconds). Default: 5000.
         */
        interval?: number

        /**
         * Extra info to report with heartbeat.
         */
        extraInfo?: Record<string, any>

        /**
         * Prefix for monitoring keys/channels.
         */
        prefix?: string
      }

  /**
   * Rate limits per queue.
   * Example: { 'emails': { max: 10, duration: 1000 } }
   */
  rateLimits?: Record<string, { max: number; duration: number }>
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
  private workerId = `worker-${Math.random().toString(36).substring(2, 8)}`
  private heartbeatTimer: any = null

  constructor(
    private queueManager: QueueManager,
    private options: ConsumerOptions
  ) {}

  private get connectionName(): string {
    return this.options.connection ?? this.queueManager.getDefaultConnection()
  }

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
      workerId: this.workerId,
    })

    if (this.options.monitor) {
      this.startHeartbeat()
      await this.publishLog('info', `Consumer started on [${this.options.queues.join(', ')}]`)
    }

    // Main loop
    while (this.running && !this.stopRequested) {
      let processed = false

      for (const queue of this.options.queues) {
        // Check Rate Limits
        if (this.options.rateLimits?.[queue]) {
          const limit = this.options.rateLimits[queue]
          try {
            const driver = this.queueManager.getDriver(this.connectionName)
            if (driver.checkRateLimit) {
              const allowed = await driver.checkRateLimit(queue, limit)
              if (!allowed) {
                // Rate limit exceeded, skip this queue
                continue
              }
            }
          } catch (err) {
            console.error(`[Consumer] Error checking rate limit for "${queue}":`, err)
          }
        }

        try {
          const job = await this.queueManager.pop(queue, this.options.connection)

          if (job) {
            processed = true
            if (this.options.monitor) {
              await this.publishLog('info', `Processing job: ${job.id}`, job.id)
            }
            try {
              await worker.process(job)
              if (this.options.monitor) {
                await this.publishLog('success', `Completed job: ${job.id}`, job.id)
              }
            } catch (err: any) {
              console.error(`[Consumer] Error processing job in queue "${queue}":`, err)

              if (this.options.monitor) {
                await this.publishLog('error', `Job failed: ${job.id} - ${err.message}`, job.id)
              }

              // Retry Logic with Exponential Backoff
              const attempts = job.attempts ?? 1
              const maxAttempts = job.maxAttempts ?? this.options.workerOptions?.maxAttempts ?? 3

              if (attempts < maxAttempts) {
                // Retryable
                job.attempts = attempts + 1
                const delayMs = job.getRetryDelay(job.attempts)
                const delaySec = Math.ceil(delayMs / 1000)

                // Update job properties
                job.delay(delaySec)

                // Re-queue
                await this.queueManager.push(job)

                if (this.options.monitor) {
                  await this.publishLog(
                    'warning',
                    `Job retrying in ${delaySec}s (Attempt ${job.attempts}/${maxAttempts})`,
                    job.id
                  )
                }
              } else {
                // Max attempts reached: Move to DLQ
                await this.queueManager.fail(job, err).catch((dlqErr) => {
                  console.error(`[Consumer] Error moving job to DLQ:`, dlqErr)
                })
              }
            } finally {
              // Mark as complete to handle Group FIFO logic (release lock / next job)
              await this.queueManager.complete(job).catch((err) => {
                console.error(`[Consumer] Error completing job in queue "${queue}":`, err)
              })
            }
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
      // Optimization: If we just processed a job, don't wait, poll again immediately!
      if (!this.stopRequested && !processed) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
      } else if (!this.stopRequested && processed) {
        // Optional: brief micro-task yield to prevent CPU pegging in very fast loops
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }

    this.running = false
    this.stopHeartbeat()
    if (this.options.monitor) {
      await this.publishLog('info', 'Consumer stopped')
    }
    console.log('[Consumer] Stopped')
  }

  private startHeartbeat() {
    const interval =
      typeof this.options.monitor === 'object' ? (this.options.monitor.interval ?? 5000) : 5000
    const monitorOptions = typeof this.options.monitor === 'object' ? this.options.monitor : {}

    this.heartbeatTimer = setInterval(async () => {
      try {
        const driver = this.queueManager.getDriver(this.connectionName)
        if (driver.reportHeartbeat) {
          const monitorPrefix =
            typeof this.options.monitor === 'object' ? this.options.monitor.prefix : undefined
          const os = require('node:os')
          const mem = process.memoryUsage()
          const metrics = {
            cpu: os.loadavg()[0], // 1m load avg
            cores: os.cpus().length,
            ram: {
              rss: Math.floor(mem.rss / 1024 / 1024),
              heapUsed: Math.floor(mem.heapUsed / 1024 / 1024),
              total: Math.floor(os.totalmem() / 1024 / 1024),
            },
          }

          await driver.reportHeartbeat(
            {
              id: this.workerId,
              status: 'online',
              hostname: os.hostname(),
              pid: process.pid,
              uptime: Math.floor(process.uptime()),
              last_ping: new Date().toISOString(),
              queues: this.options.queues,
              metrics,
              ...(monitorOptions.extraInfo || {}),
            },
            monitorPrefix
          )
        }
      } catch (_e) {
        // Ignore heartbeat errors
      }
    }, interval)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private async publishLog(level: string, message: string, jobId?: string) {
    try {
      const driver = this.queueManager.getDriver(this.connectionName)
      if (driver.publishLog) {
        const monitorPrefix =
          typeof this.options.monitor === 'object' ? this.options.monitor.prefix : undefined
        await driver.publishLog(
          {
            level,
            message,
            workerId: this.workerId,
            jobId,
            timestamp: new Date().toISOString(),
          },
          monitorPrefix
        )
      }
    } catch (_e) {
      // Ignore log errors
    }
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
