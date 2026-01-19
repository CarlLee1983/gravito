import type { Job } from './Job'
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
        extraInfo?: Record<string, unknown>

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

  /**
   * Max concurrent jobs to process. Default: 1.
   */
  concurrency?: number
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
  private heartbeatTimer: Timer | null = null

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
    const concurrency = this.options.concurrency ?? 1
    let activeWorkers = 0

    console.log('[Consumer] Started', {
      queues: this.options.queues,
      connection: this.options.connection,
      workerId: this.workerId,
      concurrency,
    })

    if (this.options.monitor) {
      this.startHeartbeat()
      await this.publishLog(
        'info',
        `Consumer started on [${this.options.queues.join(', ')}] with concurrency ${concurrency}`
      )
    }

    // Main loop
    while (this.running && !this.stopRequested) {
      // If we are at capacity, wait for a bit
      if (activeWorkers >= concurrency) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        continue
      }

      // Filter queues based on rate limits
      const eligibleQueues: string[] = []
      for (const queue of this.options.queues) {
        if (this.options.rateLimits?.[queue]) {
          const limit = this.options.rateLimits[queue]
          try {
            const driver = this.queueManager.getDriver(this.connectionName)
            if (driver.checkRateLimit) {
              const allowed = await driver.checkRateLimit(queue, limit!)
              if (!allowed) continue
            }
          } catch (err) {
            console.error(`[Consumer] Error checking rate limit for "${queue}":`, err)
          }
        }
        eligibleQueues.push(queue)
      }

      if (eligibleQueues.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
        continue
      }

      try {
        const driver = this.queueManager.getDriver(this.connectionName)
        let job: Job | null = null

        // Try blocking pop if available and we have multiple potential queues
        if (driver.popBlocking) {
          const timeout = Math.max(1, Math.floor(pollInterval / 1000))
          job = await this.queueManager.popBlocking(eligibleQueues, timeout, this.connectionName)
        } else {
          // Fallback to sequential non-blocking pop
          for (const queue of eligibleQueues) {
            job = await this.queueManager.pop(queue, this.connectionName)
            if (job) break
          }
        }

        if (job) {
          activeWorkers++
          // Process job asynchronously to allow concurrency
          this.handleJob(job, worker).finally(() => {
            activeWorkers--
          })

          // Brief yield to allow next loop iteration or next blocking pop
          await new Promise((resolve) => setTimeout(resolve, 0))
          continue // Jump back to start of loop to check if we can process more
        }
      } catch (error) {
        console.error('[Consumer] Loop error:', error)
      }

      // If nothing was processed and keepAlive is disabled, and no workers are running, exit
      if (activeWorkers === 0 && !keepAlive) {
        break
      }

      // Wait if needed
      if (!this.stopRequested && activeWorkers === 0) {
        const driver = this.queueManager.getDriver(this.connectionName)
        if (!driver.popBlocking) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval))
        }
      } else {
        // Just yield
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }

    this.running = false
    this.stopHeartbeat()
    if (this.options.monitor) {
      await this.publishLog('info', 'Consumer stopped')
    }
    console.log('[Consumer] Stopped')
  }

  /**
   * Handle a single job.
   */
  private async handleJob(job: Job, worker: Worker): Promise<void> {
    const currentQueue = job.queueName || 'default'

    if (this.options.monitor) {
      await this.publishLog('info', `Processing job: ${job.id}`, job.id)
    }

    try {
      await worker.process(job)
      if (this.options.monitor) {
        await this.publishLog('success', `Completed job: ${job.id}`, job.id)
      }
    } catch (err: unknown) {
      const error = err as Error
      console.error(`[Consumer] Error processing job in queue "${currentQueue}":`, error)

      if (this.options.monitor) {
        await this.publishLog('error', `Job failed: ${job.id} - ${error.message}`, job.id)
      }

      // Retry Logic with Exponential Backoff
      const attempts = job.attempts ?? 1
      const maxAttempts = job.maxAttempts ?? this.options.workerOptions?.maxAttempts ?? 3

      if (attempts < maxAttempts) {
        job.attempts = attempts + 1
        const delayMs = job.getRetryDelay(job.attempts)
        const delaySec = Math.ceil(delayMs / 1000)
        job.delay(delaySec)
        await this.queueManager.push(job)

        if (this.options.monitor) {
          await this.publishLog(
            'warning',
            `Job retrying in ${delaySec}s (Attempt ${job.attempts}/${maxAttempts})`,
            job.id
          )
        }
      } else {
        await this.queueManager.fail(job, error).catch((dlqErr) => {
          console.error('[Consumer] Error moving job to DLQ:', dlqErr)
        })
      }
    } finally {
      await this.queueManager.complete(job).catch((err) => {
        console.error(`[Consumer] Error completing job in queue "${currentQueue}":`, err)
      })
    }
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
