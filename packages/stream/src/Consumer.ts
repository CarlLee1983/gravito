import { EventEmitter } from 'node:events'
import { StreamingConsumer } from './consumer/StreamingConsumer'
import type { ConsumerStats } from './consumer/types'
import type { QueueManager } from './QueueManager'
import type { WorkerOptions } from './Worker'

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
  onEvent?: (event: string, payload: unknown) => void
}

/**
 * Consumer 門面類別（Facade），提供向後相容的公開 API。
 *
 * 內部委派給 StreamingConsumer 實作，所有事件都通過 passthrough。
 * 公開 API 與原始 Consumer 完全一致，不破壞現有使用者程式碼。
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
 * @emits max_requests_reached - When maxRequests limit is reached. Payload: { processed: number, maxRequests: number }
 */
export class Consumer extends EventEmitter {
  /** 內部 StreamingConsumer 實例 */
  private streaming: StreamingConsumer

  constructor(
    private readonly queueManager: QueueManager,
    private readonly options: ConsumerOptions
  ) {
    super()
    this.streaming = new StreamingConsumer(queueManager, options)
    this.forwardEvents()
  }

  /**
   * 將 StreamingConsumer 的所有事件轉發給 Consumer。
   */
  private forwardEvents(): void {
    const events = [
      'job:started',
      'job:processed',
      'job:failed',
      'job:retried',
      'job:failed_permanently',
      'max_requests_reached',
      'error',
    ]

    for (const event of events) {
      this.streaming.on(event, (payload: unknown) => {
        this.emit(event, payload)
      })
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
    return this.streaming.start()
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
    return this.streaming.requestStop()
  }

  /**
   * Checks if the consumer is currently active.
   *
   * @returns True if the consumer loop is running.
   */
  isRunning(): boolean {
    return this.streaming.isRunning()
  }

  /**
   * Retrieves current operational statistics.
   *
   * @returns An object containing processed, failed, retried, and active job counts.
   */
  getStats(): ConsumerStats {
    return this.streaming.getStats()
  }

  /**
   * Resets the internal statistics counters.
   */
  resetStats(): void {
    this.streaming.resetStats()
  }
}
