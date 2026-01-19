import { EventEmitter } from 'node:events'
import pLimit from 'p-limit'
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

  /**
   * Whether to process jobs with the same groupId sequentially.
   * If true, jobs with the same groupId will never run concurrently,
   * regardless of the global concurrency setting.
   * @default true
   */
  groupJobsSequential?: boolean

  /**
   * Minimum polling interval in ms (for adaptive polling).
   * @default 100
   */
  minPollInterval?: number

  /**
   * Maximum polling interval in ms (for adaptive polling).
   * @default 5000
   */
  maxPollInterval?: number

  /**
   * Backoff multiplier for adaptive polling.
   * @default 1.5
   */
  backoffMultiplier?: number

  /**
   * Batch size for consuming jobs.
   * If > 1, tries to fetch multiple jobs at once.
   * @default 1
   */
  batchSize?: number

  /**
   * Whether to use blocking pop (BLPOP/long-polling) if supported by driver.
   * Only applies when batchSize is 1.
   * @default true
   */
  useBlocking?: boolean

  /**
   * Timeout in seconds for blocking pop.
   * @default 5
   */
  blockingTimeout?: number

  /**
   * Enable verbose debug logging.
   * @default false
   */
  debug?: boolean
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
 *
 * @emits job:started - When a job begins processing. Payload: { job: Job, queue: string }
 * @emits job:processed - When a job completes successfully. Payload: { job: Job, duration: number, queue: string }
 * @emits job:failed - When a job fails an attempt. Payload: { job: Job, error: Error, duration: number, queue: string }
 * @emits job:retried - When a job is scheduled for a retry. Payload: { job: Job, attempt: number, delay: number }
 * @emits job:failed_permanently - When a job fails all attempts and is moved to DLQ. Payload: { job: Job, error: Error }
 */
export class Consumer extends EventEmitter {
  private running = false
  private stopRequested = false
  private workerId = `worker-${Math.random().toString(36).substring(2, 8)}`
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  private groupLimiters = new Map<string, ReturnType<typeof pLimit>>()

  constructor(
    private queueManager: QueueManager,
    private options: ConsumerOptions
  ) {
    super()
  }

  private get connectionName(): string {
    return this.options.connection ?? this.queueManager.getDefaultConnection()
  }

  /**
   * Log debug message.
   */
  private log(message: string, data?: unknown): void {
    if (this.options.debug) {
      const timestamp = new Date().toISOString()
      const prefix = `[Consumer:${this.workerId}] [${timestamp}]`
      if (data) {
        console.log(prefix, message, data)
      } else {
        console.log(prefix, message)
      }
    }
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
    let currentPollInterval = this.options.pollInterval ?? 1000
    const minPollInterval = this.options.minPollInterval ?? 100
    const maxPollInterval = this.options.maxPollInterval ?? 5000
    const backoffMultiplier = this.options.backoffMultiplier ?? 1.5
    const keepAlive = this.options.keepAlive ?? true
    const concurrency = this.options.concurrency ?? 1
    const batchSize = this.options.batchSize ?? 1
    const useBlocking = this.options.useBlocking ?? true
    const blockingTimeout = this.options.blockingTimeout ?? 5
    let activeWorkers = 0

    this.log('Started', {
      queues: this.options.queues,
      connection: this.options.connection,
      workerId: this.workerId,
      concurrency,
      batchSize,
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
      const capacity = concurrency - activeWorkers
      if (capacity <= 0) {
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
        await new Promise((resolve) => setTimeout(resolve, currentPollInterval))
        continue
      }

      let jobs: Job[] = []
      let didBlock = false

      try {
        const currentBatchSize = Math.min(batchSize, capacity)
        const driver = this.queueManager.getDriver(this.connectionName)

        if (currentBatchSize > 1) {
          // Batch fetch (non-blocking)
          for (const queue of eligibleQueues) {
            const fetched = await this.queueManager.popMany(
              queue,
              currentBatchSize,
              this.connectionName
            )
            if (fetched.length > 0) {
              jobs = fetched
              break
            }
          }
        } else {
          // Single fetch
          if (useBlocking && driver.popBlocking) {
            didBlock = true
            const job = await this.queueManager.popBlocking(
              eligibleQueues,
              blockingTimeout,
              this.connectionName
            )
            if (job) jobs.push(job)
          } else {
            // Sequential non-blocking pop
            for (const queue of eligibleQueues) {
              const job = await this.queueManager.pop(queue, this.connectionName)
              if (job) {
                jobs.push(job)
                break
              }
            }
          }
        }

        if (jobs.length > 0) {
          activeWorkers += jobs.length
          // Reset adaptive poll interval
          currentPollInterval = minPollInterval

          // Process jobs asynchronously
          for (const job of jobs) {
            this.runJob(job, worker).finally(() => {
              activeWorkers--
            })
          }

          // Brief yield to allow next loop iteration
          await new Promise((resolve) => setTimeout(resolve, 0))
          continue
        }
      } catch (error) {
        console.error('[Consumer] Loop error:', error)
      }

      // If nothing was processed and keepAlive is disabled, and no workers are running, exit
      if (activeWorkers === 0 && !keepAlive) {
        break
      }

      // Wait if needed
      if (!this.stopRequested) {
        if (!didBlock) {
          // Adaptive backoff
          await new Promise((resolve) => setTimeout(resolve, currentPollInterval))
          currentPollInterval = Math.min(currentPollInterval * backoffMultiplier, maxPollInterval)
        }
        // If didBlock, we effectively waited blockingTimeout, so we loop immediately
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
    this.log('Stopped')
  }

  /**
   * Run a job with concurrency controls.
   */
  private async runJob(job: Job, worker: Worker): Promise<void> {
    // If group sequentiality is disabled or no groupId, run immediately
    if (!job.groupId || this.options.groupJobsSequential === false) {
      return this.handleJob(job, worker)
    }

    // Otherwise, ensure sequential execution for the group
    let limiter = this.groupLimiters.get(job.groupId)
    if (!limiter) {
      limiter = pLimit(1)
      this.groupLimiters.set(job.groupId, limiter)
    }

    if (limiter.pendingCount > 0) {
      this.log(`Job ${job.id} queued behind group ${job.groupId}`)
    }

    // Schedule the job
    await limiter(async () => {
      await this.handleJob(job, worker)
    })

    // Cleanup limiter if empty
    if (limiter.activeCount === 0 && limiter.pendingCount === 0) {
      this.groupLimiters.delete(job.groupId)
    }
  }

  /**
   * Handle a single job.
   */
  private async handleJob(job: Job, worker: Worker): Promise<void> {
    const currentQueue = job.queueName || 'default'
    const startTime = Date.now()

    this.log(`Processing job ${job.id} from ${currentQueue}`)

    this.emit('job:started', { job, queue: currentQueue })

    if (this.options.monitor) {
      await this.publishLog('info', `Processing job: ${job.id}`, job.id)
    }

    try {
      await worker.process(job)
      const duration = Date.now() - startTime
      this.emit('job:processed', { job, duration, queue: currentQueue })

      this.log(`Completed job ${job.id} in ${duration}ms`)

      if (this.options.monitor) {
        await this.publishLog('success', `Completed job: ${job.id}`, job.id)
      }
    } catch (err: unknown) {
      const error = err as Error
      const duration = Date.now() - startTime
      this.emit('job:failed', { job, error, duration, queue: currentQueue })

      this.log(`Failed job ${job.id} in ${duration}ms`, { error: error.message })

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

        this.log(`Retrying job ${job.id} in ${delaySec}s (Attempt ${job.attempts}/${maxAttempts})`)

        this.emit('job:retried', { job, attempt: job.attempts, delay: delaySec })

        if (this.options.monitor) {
          await this.publishLog(
            'warning',
            `Job retrying in ${delaySec}s (Attempt ${job.attempts}/${maxAttempts})`,
            job.id
          )
        }
      } else {
        this.emit('job:failed_permanently', { job, error })
        this.log(`Job ${job.id} failed permanently`)
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
    this.log('Stopping...')
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
