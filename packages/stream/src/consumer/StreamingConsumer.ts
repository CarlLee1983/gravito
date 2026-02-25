import { EventEmitter } from 'node:events'
import type { ConsumerOptions } from '../Consumer'
import type { QueueManager } from '../QueueManager'
import { Worker } from '../Worker'
import { ConcurrencyGate } from './ConcurrencyGate'
import { GroupSequencer } from './GroupSequencer'
import { HeartbeatManager } from './HeartbeatManager'
import { JobExecutor } from './JobExecutor'
import { jobSourceGenerator } from './JobSourceGenerator'
import type { ConsumerStats } from './types'

/**
 * StreamingConsumer 是 Consumer 管線的核心實作。
 *
 * 組合以下元件，提供高效能、可測試的 job 消費管線：
 * - JobSourceGenerator：抓取 job 的 Async Generator
 * - ConcurrencyGate：Promise-based Semaphore，取代 busy-wait
 * - GroupSequencer：確保相同 groupId 的 job 依序執行
 * - JobExecutor：完整的 job 執行生命週期
 * - HeartbeatManager：定時心跳與監控日誌
 *
 * 主管線採用 `for await...of` 模式，
 * 完全消除原始 Consumer 中的 `setTimeout(50)` busy-wait。
 *
 * @example
 * ```typescript
 * const streaming = new StreamingConsumer(queueManager, options)
 * streaming.on('job:processed', (payload) => console.log('Done:', payload.job.id))
 *
 * await streaming.start()
 * ```
 */
export class StreamingConsumer extends EventEmitter {
  private running = false
  private stopRequested = false
  private readonly workerId: string
  private readonly stats: ConsumerStats = {
    processed: 0,
    failed: 0,
    retried: 0,
    active: 0,
  }

  private gate: ConcurrencyGate | null = null
  private sequencer: GroupSequencer | null = null
  private heartbeat: HeartbeatManager | null = null
  private abortController: AbortController | null = null

  constructor(
    private readonly queueManager: QueueManager,
    private readonly options: ConsumerOptions
  ) {
    super()
    this.workerId = `worker-${crypto.randomUUID()}`
  }

  /**
   * 啟動主消費管線。
   *
   * 初始化所有元件，然後進入 `for await...of` 管線迴圈：
   * 1. 從 jobSourceGenerator 取得 FetchResult
   * 2. 對每個 job，acquire ConcurrencyGate
   * 3. 透過 GroupSequencer 確保 group 序列
   * 4. 由 JobExecutor 執行 job
   * 5. release ConcurrencyGate
   *
   * @throws {Error} 如果 consumer 已在執行中
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Consumer is already running')
    }

    this.running = true
    this.stopRequested = false
    this.abortController = new AbortController()

    const concurrency = this.options.concurrency ?? 1
    const batchSize = this.options.batchSize ?? 1
    const useBlocking = this.options.useBlocking ?? true
    const blockingTimeout = this.options.blockingTimeout ?? 5
    const keepAlive = this.options.keepAlive ?? true
    const minPollInterval = this.options.minPollInterval ?? 100
    const maxPollInterval = this.options.maxPollInterval ?? 5000
    const backoffMultiplier = this.options.backoffMultiplier ?? 1.5
    const connectionName = this.options.connection ?? this.queueManager.getDefaultConnection()

    // 初始化元件
    this.gate = new ConcurrencyGate(concurrency)
    this.sequencer = new GroupSequencer()

    // 初始化心跳管理器（若啟用監控）
    if (this.options.monitor) {
      const monitorOptions = typeof this.options.monitor === 'object' ? this.options.monitor : {}

      this.heartbeat = new HeartbeatManager(
        this.queueManager,
        {
          workerId: this.workerId,
          queues: this.options.queues,
          connectionName,
          interval: monitorOptions.interval,
          extraInfo: monitorOptions.extraInfo,
          prefix: monitorOptions.prefix,
        },
        () => this.getStats()
      )
      this.heartbeat.start()
      await this.heartbeat.publishLog(
        'info',
        `Consumer started on [${this.options.queues.join(', ')}] with concurrency ${concurrency}`
      )
    }

    // 建立 JobExecutor
    const executor = new JobExecutor(this.queueManager, this, this.stats, this.heartbeat, {
      debug: this.options.debug ?? false,
      workerId: this.workerId,
      workerOptions: this.options.workerOptions,
      monitor: this.options.monitor,
      maxRequests: this.options.maxRequests,
      onEvent: this.options.onEvent,
    })

    // 建立 Worker
    const worker = new Worker(this.options.workerOptions)

    this.log('Started', {
      queues: this.options.queues,
      connection: this.options.connection,
      workerId: this.workerId,
      concurrency,
      batchSize,
    })

    // 建立 job 來源 generator
    const jobSource = jobSourceGenerator(
      this.queueManager,
      {
        queues: this.options.queues,
        connection: this.options.connection,
        batchSize,
        useBlocking,
        blockingTimeout,
        keepAlive,
        minPollInterval,
        maxPollInterval,
        backoffMultiplier,
        rateLimits: this.options.rateLimits,
        getCapacity: () => this.gate?.available ?? 0,
      },
      this.abortController.signal
    )

    try {
      // 主管線迴圈
      for await (const fetchResult of jobSource) {
        if (this.stopRequested) {
          break
        }

        for (const job of fetchResult.jobs) {
          if (this.stopRequested) {
            break
          }

          // 等待並發許可（Promise-based，不 busy-wait）
          await this.gate.acquire()
          // 更新 active 計數
          this.stats.active++

          // 非同步執行（不 await），確保並發
          this.sequencer
            .run(this.options.groupJobsSequential !== false ? job.groupId : undefined, async () => {
              const result = await executor.execute(job, worker)
              if (result.shouldStop) {
                this.stopRequested = true
                // 通知 generator 停止
                this.abortController?.abort()
              }
            })
            .finally(() => {
              this.stats.active--
              this.gate?.release()
            })
        }
      }

      // 等待所有正在執行的 job 完成
      await this.waitForAllJobsToComplete()
    } finally {
      this.cleanup()
    }
  }

  /**
   * 請求優雅停止。
   *
   * 設定 stopRequested 旗標，並中止 generator，
   * 等待目前執行中的 job 完成後停止。
   *
   * @returns 等待完全停止的 Promise
   */
  async requestStop(): Promise<void> {
    this.log('Stopping...')
    this.stopRequested = true
    this.abortController?.abort()

    // 等待 running 變為 false
    while (this.running) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  /**
   * 檢查是否仍有 job 在執行中。
   */
  isActive(): boolean {
    return this.stats.active > 0
  }

  /**
   * 取得目前的統計資料快照。
   */
  getStats(): ConsumerStats {
    return { ...this.stats }
  }

  /**
   * 重置統計計數器。
   */
  resetStats(): void {
    this.stats.processed = 0
    this.stats.failed = 0
    this.stats.retried = 0
    // active 不重置，因為它反映即時狀態
  }

  /**
   * Consumer 是否正在執行中。
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * 等待所有正在執行的 job 完成。
   */
  private async waitForAllJobsToComplete(): Promise<void> {
    while (this.stats.active > 0) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  /**
   * 清理所有資源。
   */
  private cleanup(): void {
    this.running = false
    this.sequencer?.destroy()
    this.sequencer = null
    this.heartbeat?.stop()

    if (this.options.monitor && this.heartbeat) {
      this.heartbeat.publishLog('info', 'Consumer stopped').catch(() => {
        // 靜默忽略
      })
    }

    this.heartbeat = null
    this.gate = null
    this.abortController = null
    this.log('Stopped')
  }

  /**
   * 輸出 debug 日誌（僅在 debug=true 時）。
   */
  private log(message: string, data?: unknown): void {
    if (!this.options.debug) {
      return
    }

    const timestamp = new Date().toISOString()
    const prefix = `[StreamingConsumer:${this.workerId}] [${timestamp}]`
    if (data) {
      // biome-ignore lint/suspicious/noConsole: debug 模式下允許輸出
      console.log(prefix, message, data)
    } else {
      // biome-ignore lint/suspicious/noConsole: debug 模式下允許輸出
      console.log(prefix, message)
    }
  }
}
