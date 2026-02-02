/**
 * Queue Consumer Service
 *
 * 隊列消費者服務 - 負責從隊列中取出 Job 並執行
 */

import { Consumer, type QueueManager } from '@gravito/stream'

export interface ConsumerServiceOptions {
  queues: string[]
  concurrency?: number
  maxAttempts?: number
  pollInterval?: number
}

/**
 * Consumer 服務實例
 */
let consumerService: ConsumerService | null = null

/**
 * Consumer 服務類
 */
export class ConsumerService {
  private consumer: Consumer | null = null
  private isRunning = false

  constructor(
    private queueManager: QueueManager,
    private options: ConsumerServiceOptions,
    private logger: any
  ) {}

  /**
   * 啟動 Consumer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('[Consumer] Consumer is already running')
      return
    }

    try {
      this.logger.info('[Consumer] ▶️  啟動 Consumer 服務...')
      this.logger.info(`[Consumer] 監聽隊列: ${this.options.queues.join(', ')}`)
      this.logger.info(`[Consumer] 並發度: ${this.options.concurrency || 1}`)

      this.consumer = new Consumer(this.queueManager, {
        queues: this.options.queues,
        pollInterval: this.options.pollInterval || 100,
        workerOptions: {
          maxAttempts: this.options.maxAttempts || 3,
        },
      })

      // 監聽事件
      this.setupEventListeners()

      // 啟動 Consumer
      await this.consumer.start()
      this.isRunning = true

      this.logger.info('[Consumer] ✅ Consumer 服務已啟動')
    } catch (error) {
      this.logger.error('[Consumer] ❌ 啟動失敗:', error)
      throw error
    }
  }

  /**
   * 停止 Consumer
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.consumer) {
      this.logger.warn('[Consumer] Consumer is not running')
      return
    }

    try {
      this.logger.info('[Consumer] ⏹️  停止 Consumer 服務...')
      await this.consumer.stop()
      this.isRunning = false
      this.logger.info('[Consumer] ✅ Consumer 服務已停止')
    } catch (error) {
      this.logger.error('[Consumer] ❌ 停止失敗:', error)
      throw error
    }
  }

  /**
   * 設置事件監聽
   */
  private setupEventListeners(): void {
    if (!this.consumer) return

    // Job 開始執行
    this.consumer.on('started', (job: any) => {
      this.logger.info(`[Consumer] ▶️  開始處理: ${job.constructor.name} (queue: ${job.queueName})`)
    })

    // Job 成功完成
    this.consumer.on('processed', (job: any, duration: number) => {
      this.logger.info(`[Consumer] ✅ 完成: ${job.constructor.name} (${duration}ms)`)
    })

    // Job 失敗但會重試
    this.consumer.on('retried', (job: any, attempt: number) => {
      this.logger.warn(`[Consumer] 🔄 重試: ${job.constructor.name} (第 ${attempt} 次嘗試)`)
    })

    // Job 永久失敗（進入 DLQ）
    this.consumer.on('failed', (job: any, error: Error) => {
      this.logger.error(`[Consumer] 🔴 失敗: ${job.constructor.name}`, error)
    })
  }

  /**
   * 檢查 Consumer 是否正在運行
   */
  isActive(): boolean {
    return this.isRunning
  }
}

/**
 * 啟動 Consumer 服務
 */
export async function startConsumerService(
  queueManager: QueueManager,
  logger: any,
  options?: Partial<ConsumerServiceOptions>
): Promise<ConsumerService> {
  const defaultOptions: ConsumerServiceOptions = {
    queues: ['inventory', 'orders'],
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '3', 10),
    maxAttempts: parseInt(process.env.QUEUE_MAX_ATTEMPTS || '3', 10),
    pollInterval: 100,
    ...options,
  }

  consumerService = new ConsumerService(queueManager, defaultOptions, logger)
  await consumerService.start()

  return consumerService
}

/**
 * 取得 Consumer 服務實例
 */
export function getConsumerService(): ConsumerService | null {
  return consumerService
}

/**
 * 關閉 Consumer 服務
 */
export async function stopConsumerService(): Promise<void> {
  if (consumerService) {
    await consumerService.stop()
    consumerService = null
  }
}
