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
   * Default: 1000
   */
  pollInterval?: number

  /**
   * Minimum polling interval (milliseconds).
   * Default: 100
   */
  minPollInterval?: number

  /**
   * Maximum polling interval (milliseconds).
   * Default: 5000
   */
  maxPollInterval?: number

  /**
   * Backoff multiplier for adaptive polling.
   * Default: 1.5
   */
  backoffMultiplier?: number

  /**
   * Whether to use blocking polling (BLPOP) if supported by driver.
   * Default: true
   */
  useBlocking?: boolean

  /**
   * Timeout for blocking polling in seconds.
   * Default: 5
   */
  blockingTimeout?: number

  /**
   * Batch size for processing jobs.
   * If > 1, tries to pop multiple jobs at once.
   * Default: 1
   */
  batchSize?: number

  /**
   * Whether to process batched jobs in parallel.
   * Default: false (sequential)
   */
  parallelBatch?: boolean

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
  private currentPollInterval: number

  constructor(
    private queueManager: QueueManager,
    private options: ConsumerOptions
  ) {
      this.currentPollInterval = options.pollInterval ?? 1000
  }

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

    // Adaptive polling configuration
    const minPollInterval = this.options.minPollInterval ?? 100
    const maxPollInterval = this.options.maxPollInterval ?? 5000
    const backoffMultiplier = this.options.backoffMultiplier ?? 1.5
    const keepAlive = this.options.keepAlive ?? true

    // Blocking configuration
    const useBlocking = this.options.useBlocking ?? true
    const blockingTimeout = this.options.blockingTimeout ?? 5

    // Batch configuration
    const batchSize = this.options.batchSize ?? 1
    const parallelBatch = this.options.parallelBatch ?? false

    console.log('[Consumer] Started', {
      queues: this.options.queues,
      connection: this.options.connection,
      workerId: this.workerId,
      blocking: useBlocking,
      batchSize
    })

    if (this.options.monitor) {
      this.startHeartbeat()
      await this.publishLog('info', `Consumer started on [${this.options.queues.join(', ')}]`)
    }

    // Main loop
    while (this.running && !this.stopRequested) {
      let processedAny = false

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
          const driver = this.queueManager.getDriver(this.connectionName)
          let jobs: any[] = []

          // 1. Try Batch Pop
          if (batchSize > 1 && driver.popMany) {
              // Note: popMany doesn't support blocking yet in drivers (unless we upgrade popBlocking to support many)
              // So for batching, we usually default to polling or script
              const popped = await driver.popMany(queue, batchSize)
              if (popped && popped.length > 0) {
                  // Deserialize jobs
                   const serializer = this.queueManager.getSerializer()
                   jobs = popped.map(p => {
                       try { return serializer.deserialize(p) } catch(e) { return null }
                   }).filter(j => j !== null)
              }
          } else {
             // 2. Try Blocking Pop (if enabled and driver supports it)
             // Only block if we haven't processed anything in this cycle yet?
             // Or block on the first queue?
             // Blocking on multiple queues in loop is tricky because first queue blocks others.
             // Usually BLPOP takes multiple keys so one call is enough.
             // But our `popBlocking` abstraction is per queue.
             // For now, if multiple queues are monitored, blocking might be inefficient unless driver supports multi-queue block.
             // RedisDriver.popBlocking currently accepts one queue name but internally we could pass array?
             // But `QueueManager` API is `pop(queue)`.

             // Strategy: If multiple queues, we probably shouldn't block on individual queue unless we cycle rapidly with low timeout,
             // or use a driver feature that listens to all.
             // For simplicity: If queues > 1, disable blocking to avoid starvation, or use very short timeout?
             // Let's stick to non-blocking if multiple queues are present for now, OR rely on driver to handle it.
             // Redis BLPOP handles multiple keys.

             // If we really want to use blocking with multiple queues, we need `driver.popBlocking(queues, timeout)`.
             // But `QueueDriver` interface defines `pop(queue)`.
             // Let's assume for now `popBlocking` is per queue.

             // If we have multiple queues, blocking on the first one prevents checking the second one until timeout or job.
             // This is acceptable if we round-robin or if we really want to wait.

             let job = null
             if (useBlocking && driver.popBlocking && this.options.queues.length === 1) {
                  const serialized = await driver.popBlocking(queue, blockingTimeout)
                  if (serialized) {
                       const serializer = this.queueManager.getSerializer()
                       try { job = serializer.deserialize(serialized) } catch(e) { console.error(e) }
                  }
             } else {
                 // Fallback to standard pop
                 job = await this.queueManager.pop(queue, this.options.connection)
             }

             if (job) {
                 jobs.push(job)
             }
          }

          if (jobs.length > 0) {
            processedAny = true

            // Process jobs
            const processJob = async (job: any) => {
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

            if (parallelBatch) {
                await Promise.all(jobs.map(processJob))
            } else {
                for (const job of jobs) {
                    await processJob(job)
                }
            }
          }
        } catch (error) {
          console.error(`[Consumer] Error polling queue "${queue}":`, error)
        }
      }

      // If nothing was processed and keepAlive is disabled, exit
      if (!processedAny && !keepAlive) {
        break
      }

      // Adaptive Polling Strategy
      if (processedAny) {
          // Reset to minimum interval
          this.currentPollInterval = minPollInterval
          // Yield to event loop but don't sleep long
          await new Promise((resolve) => setTimeout(resolve, 0))
      } else {
          // No jobs found, back off
          // If we used blocking pop and it timed out, we effectively already slept for `blockingTimeout`.
          // So we should check if we blocked.
          const driver = this.queueManager.getDriver(this.connectionName)
          const didBlock = useBlocking && driver.popBlocking && this.options.queues.length === 1

          if (!didBlock) {
              // Increase interval
              this.currentPollInterval = Math.min(
                  this.currentPollInterval * backoffMultiplier,
                  maxPollInterval
              )
              if (!this.stopRequested) {
                  await new Promise((resolve) => setTimeout(resolve, this.currentPollInterval))
              }
          } else {
              // If we blocked, we don't need to sleep extra, unless we want to pace the blocking calls?
              // Usually we loop immediately back to blocking.
              this.currentPollInterval = minPollInterval // Reset for next valid poll
              await new Promise((resolve) => setTimeout(resolve, 0))
          }
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
