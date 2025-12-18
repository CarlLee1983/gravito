import type { QueueManager } from './QueueManager'
import type { WorkerOptions } from './Worker'
import { Worker } from './Worker'

/**
 * Consumer 選項
 */
export interface ConsumerOptions {
  /**
   * 要監聽的隊列列表
   */
  queues: string[]

  /**
   * 連接名稱
   */
  connection?: string

  /**
   * Worker 選項
   */
  workerOptions?: WorkerOptions

  /**
   * 輪詢間隔（毫秒）
   */
  pollInterval?: number

  /**
   * 是否在空隊列時繼續輪詢
   */
  keepAlive?: boolean
}

/**
 * Consumer
 *
 * 消費隊列中的 Job 並執行。
 * 支援內嵌模式（在主應用中運行）和獨立模式（作為微服務運行）。
 *
 * @example
 * ```typescript
 * // 內嵌模式
 * const consumer = new Consumer(queueManager, {
 *   queues: ['default', 'emails'],
 *   pollInterval: 1000
 * })
 *
 * consumer.start()
 *
 * // 獨立模式（CLI）
 * // 透過 CLI 工具啟動，支援優雅關閉
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
   * 啟動 Consumer
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

    // 主循環
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

      // 如果沒有處理任何 Job 且不保持存活，退出
      if (!processed && !keepAlive) {
        break
      }

      // 等待後繼續輪詢
      if (!this.stopRequested) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
      }
    }

    this.running = false
    console.log('[Consumer] Stopped')
  }

  /**
   * 停止 Consumer（優雅關閉）
   */
  async stop(): Promise<void> {
    console.log('[Consumer] Stopping...')
    this.stopRequested = true

    // 等待當前處理完成
    while (this.running) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  /**
   * 檢查是否正在運行
   */
  isRunning(): boolean {
    return this.running
  }
}
