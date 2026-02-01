import { EventEmitter } from 'node:events'
import pLimit from 'p-limit'
import type { Job } from './Job'
import type { QueueManager } from './QueueManager'
import type { WorkerOptions } from './Worker'
import { Worker } from './Worker'

/**
 * Configuration options for the Consumer.
 *
 * Defines which queues to listen to, connection settings, concurrency levels,
 * and advanced behavior like rate limiting and batch processing.
 *
 * @example
 * ```typescript
 * const options: ConsumerOptions = {
 *   queues: ['emails', 'notifications'],
 *   concurrency: 5,
 *   pollInterval: 2000
 * };
 * ```
 */
export interface ConsumerOptions {
  /**
   * List of queue names to consume jobs from.
   *
   * The consumer will poll these queues in the order provided or based on driver logic.
   */
  queues: string[]

  /**
   * The connection name to use (e.g., 'redis', 'sqs').
   *
   * If not provided, uses the default connection from QueueManager.
   */
  connection?: string

  /**
   * Configuration options passed to the underlying Worker.
   */
  workerOptions?: WorkerOptions

  /**
   * The interval in milliseconds to wait before polling again when the queue is empty.
   */
  pollInterval?: number

  /**
   * Whether to keep the process alive when queues are empty.
   *
   * If false, the consumer will exit the loop when no jobs are found (useful for one-off scripts).
   */
  keepAlive?: boolean

  /**
   * Monitoring configuration.
   *
   * Can be a boolean to enable default monitoring, or an object for advanced configuration.
   */
  monitor?:
    | boolean
    | {
        /**
         * The interval in milliseconds for sending heartbeat updates.
         * @default 5000
         */
        interval?: number

        /**
         * Additional metadata to include in heartbeat payloads.
         */
        extraInfo?: Record<string, unknown>

        /**
         * Key prefix for monitoring events (e.g. for Redis Pub/Sub).
         */
        prefix?: string
      }

  /**
   * Rate limiting configuration per queue.
   *
   * Defines the maximum number of jobs to process within a given duration.
   *
   * @example
   * ```typescript
   * { 'emails': { max: 10, duration: 1000 } } // 10 emails per second
   * ```
   */
  rateLimits?: Record<string, { max: number; duration: number }>

  /**
   * The maximum number of jobs to process concurrently.
   *
   * @default 1
   */
  concurrency?: number

  /**
   * Whether to enforce sequential processing for jobs with the same `groupId`.
   *
   * If true, jobs sharing a `groupId` will be processed one after another,
   * even if global concurrency is high.
   *
   * @default true
   */
  groupJobsSequential?: boolean

  /**
   * The minimum polling interval in milliseconds for adaptive polling.
   *
   * @default 100
   */
  minPollInterval?: number

  /**
   * The maximum polling interval in milliseconds for adaptive polling.
   *
   * @default 5000
   */
  maxPollInterval?: number

  /**
   * The multiplier used to increase the polling interval when the queue is empty.
   *
   * @default 1.5
   */
  backoffMultiplier?: number

  /**
   * The number of jobs to try to fetch in a single request.
   *
   * If supported by the driver, fetching multiple jobs reduces network round-trips.
   *
   * @default 1
   */
  batchSize?: number

  /**
   * Whether to use blocking operations (like BLPOP in Redis) when polling.
   *
   * Significant optimization for low-latency job pickup. Only applies when `batchSize` is 1.
   *
   * @default true
   */
  useBlocking?: boolean

  /**
   * The timeout in seconds for blocking operations.
   *
   * @default 5
   */
  blockingTimeout?: number

  /**
   * Enable verbose debug logging for consumer activities.
   *
   * @default false
   */
  debug?: boolean

  /**
   * 最大處理請求數量。
   *
   * 當 consumer 處理完這個數量的 job 後會自動停止（觸發 max_requests_reached 事件）。
   * 適用於需要定期重啟 worker 的場景（避免記憶體累積、載入最新程式碼等）。
   *
   * @default undefined (無限制)
   */
  maxRequests?: number

  /**
   * Optional event callback for external monitoring systems.
   *
   * Called whenever a job lifecycle event occurs (started, processed, failed, etc.).
   */
  onEvent?: (event: string, payload: any) => void
}

/**
 * The Consumer responsible for processing jobs from the queue.
 *
 * It polls the configured queues, retrieves jobs, and delegates execution to a `Worker`.
 * It handles concurrency, rate limiting, adaptive polling, and emits lifecycle events
 * (job:started, job:processed, job:failed, etc.).
 *
 * @public
 * @example
 * ```typescript
 * const consumer = new Consumer(queueManager, {
 *   queues: ['default'],
 *   concurrency: 10
 * });
 *
 * await consumer.start();
 * ```
 *
 * @emits job:started - When a job begins processing. Payload: { job: Job, queue: string }
 * @emits job:processed - When a job completes successfully. Payload: { job: Job, duration: number, queue: string }
 * @emits job:failed - When a job fails an attempt. Payload: { job: Job, error: Error, duration: number, queue: string }
 * @emits job:retried - When a job is scheduled for a retry. Payload: { job: Job, attempt: number, delay: number }
 * @emits job:failed_permanently - When a job fails all attempts. Payload: { job: Job, error: Error }
 */
export class Consumer extends EventEmitter {
  /**
   * Group limiter 的存活時間（毫秒）。
   * 超過此時間未使用的 group limiter 會被清理，避免記憶體洩漏。
   */
  private static readonly GROUP_LIMITER_TTL = 60000

  private running = false
  private stopRequested = false
  private workerId = `worker-${crypto.randomUUID()}`
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null
  private groupLimiters = new Map<string, ReturnType<typeof pLimit>>()
  private groupLimiterLastUsed = new Map<string, number>()
  private stats = {
    processed: 0,
    failed: 0,
    retried: 0,
    active: 0,
  }

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
   * Logs a debug message if debug mode is enabled.
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
   * Starts the consumer loop.
   *
   * Begins polling the queues and processing jobs. This method returns a promise that resolves
   * only when the consumer stops (if `keepAlive` is false) or throws if already running.
   *
   * @throws {Error} If the consumer is already running.
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

    // 啟動 group limiter 清理計時器
    this.startCleanupTimer()

    // Main loop
    while (this.running && !this.stopRequested) {
      // If we are at capacity, wait for a bit
      const capacity = concurrency - this.stats.active
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
              if (!allowed) {
                continue
              }
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
            if (job) {
              jobs.push(job)
            }
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
          this.stats.active += jobs.length
          // Reset adaptive poll interval
          currentPollInterval = minPollInterval

          // Process jobs asynchronously
          for (const job of jobs) {
            this.runJob(job, worker).finally(() => {
              this.stats.active--
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
      if (this.stats.active === 0 && !keepAlive) {
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
    this.stopCleanupTimer()
    if (this.options.monitor) {
      await this.publishLog('info', 'Consumer stopped')
    }
    this.log('Stopped')
  }

  /**
   * Run a job with concurrency controls and group locking.
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

    // 更新 group limiter 的最後使用時間
    this.groupLimiterLastUsed.set(job.groupId, Date.now())

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
      this.groupLimiterLastUsed.delete(job.groupId)
    }
  }

  /**
   * Delegates the actual processing to the worker and handles stats/logging.
   */
  private async handleJob(job: Job, worker: Worker): Promise<void> {
    const currentQueue = job.queueName || 'default'
    const startTime = Date.now()

    this.log(`Processing job ${job.id} from ${currentQueue}`)

    this.emit('job:started', { job, queue: currentQueue })
    this.options.onEvent?.('job:started', { jobId: job.id, queue: currentQueue })

    if (this.options.monitor) {
      await this.publishLog('info', `Processing job: ${job.id}`, job.id)
    }

    try {
      await worker.process(job)
      const duration = Date.now() - startTime
      this.stats.processed++
      this.emit('job:processed', { job, duration, queue: currentQueue })
      this.options.onEvent?.('job:processed', { jobId: job.id, duration, queue: currentQueue })

      this.log(`Completed job ${job.id} in ${duration}ms`)

      if (this.options.monitor) {
        await this.publishLog('success', `Completed job: ${job.id}`, job.id)
      }

      // 檢查是否達到最大請求數量
      if (this.options.maxRequests && this.stats.processed >= this.options.maxRequests) {
        this.log(`Max requests reached: ${this.stats.processed}/${this.options.maxRequests}`)
        this.stopRequested = true
        this.emit('max_requests_reached', {
          processed: this.stats.processed,
          maxRequests: this.options.maxRequests,
        })
        if (this.options.monitor) {
          await this.publishLog('info', `Max requests reached: ${this.stats.processed}`, job.id)
        }
      }
    } catch (err: unknown) {
      const error = err as Error
      const duration = Date.now() - startTime
      this.emit('job:failed', { job, error, duration, queue: currentQueue })
      this.options.onEvent?.('job:failed', {
        jobId: job.id,
        error: error.message,
        duration,
        queue: currentQueue,
      })

      this.log(`Failed job ${job.id} in ${duration}ms`, { error: error.message })
      this.stats.failed++

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

        this.stats.retried++
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
        this.options.onEvent?.('job:failed_permanently', { jobId: job.id, error: error.message })
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
            stats: this.stats,
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

  /**
   * 清理閒置的 group limiters。
   *
   * 定期檢查並移除超過 TTL 且沒有 active/pending jobs 的 group limiters，
   * 避免記憶體洩漏。
   */
  private cleanupGroupLimiters(): void {
    const now = Date.now()
    const groupsToDelete: string[] = []

    for (const [groupId, lastUsed] of this.groupLimiterLastUsed.entries()) {
      const limiter = this.groupLimiters.get(groupId)
      if (!limiter) {
        // Limiter 已被刪除，清理追蹤記錄
        groupsToDelete.push(groupId)
        continue
      }

      // 檢查是否超過 TTL 且沒有 active/pending jobs
      if (
        now - lastUsed > Consumer.GROUP_LIMITER_TTL &&
        limiter.activeCount === 0 &&
        limiter.pendingCount === 0
      ) {
        this.groupLimiters.delete(groupId)
        groupsToDelete.push(groupId)
        this.log(`Cleaned up inactive group limiter: ${groupId}`)
      }
    }

    // 批次刪除追蹤記錄
    for (const groupId of groupsToDelete) {
      this.groupLimiterLastUsed.delete(groupId)
    }
  }

  /**
   * 啟動 group limiter 清理計時器。
   */
  private startCleanupTimer(): void {
    // 每 30 秒清理一次閒置的 group limiters
    this.cleanupTimer = setInterval(() => {
      this.cleanupGroupLimiters()
    }, 30000)
  }

  /**
   * 停止 group limiter 清理計時器。
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
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
   * Gracefully stops the consumer.
   *
   * Signals the consumer to stop accepting new jobs and waits for currently running jobs
   * to complete.
   *
   * @returns A promise that resolves when the consumer has fully stopped.
   */
  async stop(): Promise<void> {
    this.log('Stopping...')
    this.stopRequested = true

    // 立即停止清理計時器
    this.stopCleanupTimer()

    // Wait for current processing to finish
    while (this.running) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  /**
   * Checks if the consumer is currently active.
   *
   * @returns True if the consumer loop is running.
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * Retrieves current operational statistics.
   *
   * @returns An object containing processed, failed, retried, and active job counts.
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * Resets the internal statistics counters.
   */
  resetStats(): void {
    this.stats.processed = 0
    this.stats.failed = 0
    this.stats.retried = 0
  }
}
