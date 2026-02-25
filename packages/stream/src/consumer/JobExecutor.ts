import type { EventEmitter } from 'node:events'
import type { Job } from '../Job'
import type { QueueManager } from '../QueueManager'
import type { Worker } from '../Worker'
import type { HeartbeatManager } from './HeartbeatManager'
import type { ConsumerStats, ExecutionResult, ExecutorOptions } from './types'

/**
 * JobExecutor 負責完整的 Job 執行生命週期。
 *
 * 從原始 Consumer.handleJob() 提取，封裝以下邏輯：
 * - 發射生命週期事件（job:started, job:processed, job:failed 等）
 * - 呼叫 worker.process(job)
 * - 成功後呼叫 queueManager.complete()
 * - 失敗後執行重試邏輯（指數退避 + re-push）
 * - 超出 maxAttempts 後發射 job:failed_permanently 並移入 DLQ
 * - maxRequests 達到時設定 shouldStop = true
 *
 * 所有異常均被捕獲，不拋出（確保管線繼續執行）。
 *
 * @example
 * ```typescript
 * const executor = new JobExecutor(queueManager, emitter, stats, heartbeat, options)
 * const result = await executor.execute(job, worker)
 *
 * if (result.shouldStop) {
 *   // 停止 consumer
 * }
 * ```
 */
export class JobExecutor {
  constructor(
    private readonly queueManager: QueueManager,
    private readonly emitter: EventEmitter,
    private readonly stats: ConsumerStats,
    private readonly heartbeat: HeartbeatManager | null,
    private readonly options: ExecutorOptions
  ) {}

  /**
   * 執行單一 Job 的完整生命週期。
   *
   * @param job - 要執行的 Job
   * @param worker - Worker 實例
   * @returns ExecutionResult，包含成功/失敗狀態、耗時、shouldStop 旗標
   */
  async execute(job: Job, worker: Worker): Promise<ExecutionResult> {
    const currentQueue = job.queueName ?? 'default'
    const startTime = Date.now()

    this.log(`Processing job ${job.id} from ${currentQueue}`)

    // 發射 job:started 事件
    this.emitter.emit('job:started', { job, queue: currentQueue })
    this.options.onEvent?.('job:started', { jobId: job.id, queue: currentQueue })

    if (this.heartbeat) {
      await this.heartbeat.publishLog('info', `Processing job: ${job.id}`, job.id)
    }

    try {
      await worker.process(job)

      const duration = Date.now() - startTime
      this.stats.processed++

      this.emitter.emit('job:processed', { job, duration, queue: currentQueue })
      this.options.onEvent?.('job:processed', { jobId: job.id, duration, queue: currentQueue })

      this.log(`Completed job ${job.id} in ${duration}ms`)

      if (this.heartbeat) {
        await this.heartbeat.publishLog('success', `Completed job: ${job.id}`, job.id)
      }

      // 完成後呼叫 complete（通知 driver 清理）
      await this.queueManager.complete(job).catch((err) => {
        // complete 失敗不影響主流程
        this.emitter.emit('error', err)
      })

      // 檢查是否達到 maxRequests
      const shouldStop = this.checkMaxRequests(job)

      return { success: true, duration, shouldStop }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      const duration = Date.now() - startTime

      this.stats.failed++
      this.emitter.emit('job:failed', { job, error, duration, queue: currentQueue })
      this.options.onEvent?.('job:failed', {
        jobId: job.id,
        error: error.message,
        duration,
        queue: currentQueue,
      })

      this.log(`Failed job ${job.id} in ${duration}ms`, { error: error.message })

      if (this.heartbeat) {
        await this.heartbeat.publishLog('error', `Job failed: ${job.id} - ${error.message}`, job.id)
      }

      // 重試邏輯
      const attempts = job.attempts ?? 1
      const maxAttempts = job.maxAttempts ?? this.options.workerOptions?.maxAttempts ?? 3

      if (attempts < maxAttempts) {
        await this.scheduleRetry(job, attempts, maxAttempts)
      } else {
        await this.handlePermanentFailure(job, error)
      }

      // 完成後呼叫 complete（通知 driver 清理）
      await this.queueManager.complete(job).catch((completeErr) => {
        this.emitter.emit('error', completeErr)
      })

      return { success: false, duration, shouldStop: false, error }
    }
  }

  /**
   * 安排 job 重試，使用指數退避策略。
   */
  private async scheduleRetry(job: Job, attempts: number, maxAttempts: number): Promise<void> {
    job.attempts = attempts + 1
    const delayMs = job.getRetryDelay(job.attempts)
    const delaySec = Math.ceil(delayMs / 1000)
    job.delay(delaySec)

    await this.queueManager.push(job)

    this.stats.retried++
    this.emitter.emit('job:retried', { job, attempt: job.attempts, delay: delaySec })

    this.log(`Retrying job ${job.id} in ${delaySec}s (Attempt ${job.attempts}/${maxAttempts})`)

    if (this.heartbeat) {
      await this.heartbeat.publishLog(
        'warning',
        `Job retrying in ${delaySec}s (Attempt ${job.attempts}/${maxAttempts})`,
        job.id
      )
    }
  }

  /**
   * 處理永久失敗的 job，移入 DLQ 並發射事件。
   */
  private async handlePermanentFailure(job: Job, error: Error): Promise<void> {
    this.emitter.emit('job:failed_permanently', { job, error })
    this.options.onEvent?.('job:failed_permanently', { jobId: job.id, error: error.message })

    this.log(`Job ${job.id} failed permanently`)

    await this.queueManager.fail(job, error).catch((dlqErr) => {
      // DLQ 操作失敗不影響主流程
      this.emitter.emit('error', dlqErr)
    })
  }

  /**
   * 檢查是否達到 maxRequests，若達到則發射事件並回傳 shouldStop=true。
   */
  private checkMaxRequests(job: Job): boolean {
    if (!this.options.maxRequests) {
      return false
    }
    if (this.stats.processed < this.options.maxRequests) {
      return false
    }

    this.log(`Max requests reached: ${this.stats.processed}/${this.options.maxRequests}`)
    this.emitter.emit('max_requests_reached', {
      processed: this.stats.processed,
      maxRequests: this.options.maxRequests,
    })

    if (this.heartbeat) {
      this.heartbeat
        .publishLog('info', `Max requests reached: ${this.stats.processed}`, job.id)
        .catch(() => {
          // 靜默忽略
        })
    }

    return true
  }

  /**
   * 輸出 debug 日誌（僅在 debug=true 時）。
   */
  private log(message: string, data?: unknown): void {
    if (!this.options.debug) {
      return
    }

    const timestamp = new Date().toISOString()
    const prefix = `[JobExecutor:${this.options.workerId}] [${timestamp}]`
    if (data) {
      // biome-ignore lint/suspicious/noConsole: debug 模式下允許輸出
      console.log(prefix, message, data)
    } else {
      // biome-ignore lint/suspicious/noConsole: debug 模式下允許輸出
      console.log(prefix, message)
    }
  }
}
