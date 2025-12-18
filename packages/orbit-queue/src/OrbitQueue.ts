import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import type { ConsumerOptions } from './Consumer'
import { Consumer } from './Consumer'
import { QueueManager } from './QueueManager'
import type { QueueConfig } from './types'

/**
 * Orbit Queue 配置選項
 */
export interface OrbitQueueOptions extends QueueConfig {
  /**
   * 是否在開發模式下自動啟動內嵌 Consumer
   */
  autoStartWorker?: boolean

  /**
   * 內嵌 Consumer 選項
   */
  workerOptions?: ConsumerOptions
}

/**
 * Orbit Queue
 *
 * Gravito Orbit 實作，提供隊列功能。
 * 整合到 PlanetCore，注入 queue 服務到 Context。
 *
 * @example
 * ```typescript
 * const core = await PlanetCore.boot({
 *   orbits: [
 *     OrbitQueue.configure({
 *       default: 'database',
 *       connections: {
 *         database: { driver: 'database', table: 'jobs' }
 *       }
 *     })
 *   ]
 * })
 *
 * // 在 Controller 中使用
 * const queue = c.get('queue')
 * await queue.push(new SendEmail('user@example.com'))
 * ```
 */
export class OrbitQueue implements GravitoOrbit {
  private queueManager?: QueueManager
  private consumer?: Consumer

  constructor(private options: OrbitQueueOptions = {}) {}

  /**
   * 靜態配置方法
   */
  static configure(options: OrbitQueueOptions): OrbitQueue {
    return new OrbitQueue(options)
  }

  /**
   * 安裝到 PlanetCore
   */
  install(core: PlanetCore): void {
    // 建立 QueueManager
    // 注意：database 驅動的 dbService 會在第一次請求時從 Context 動態取得
    this.queueManager = new QueueManager(this.options)

    // 注入 queue 服務到 Context
    // 如果配置了 database 連接但沒有提供 dbService，會在第一次使用時從 Context 取得
    core.app.use('*', async (c, next) => {
      // 處理 database 連接的動態 dbService 解析
      if (this.queueManager && this.options.connections) {
        for (const [name, config] of Object.entries(this.options.connections)) {
          if (
            (config as { driver: string }).driver === 'database' &&
            !(config as { dbService?: unknown }).dbService
          ) {
            try {
              // 嘗試從 Context 取得 dbService
              const dbService = c.get('db')
              if (dbService) {
                // 檢查是否已經註冊過
                try {
                  this.queueManager.getDriver(name)
                } catch {
                  // 尚未註冊，現在註冊
                  this.queueManager.registerConnection(name, {
                    ...config,
                    dbService,
                  })
                }
              }
            } catch {
              // db 服務不存在，忽略（可能尚未安裝 OrbitDB）
            }
          }
        }
      }

      c.set('queue', this.queueManager!)
      await next()
    })

    core.logger.info('[OrbitQueue] Installed')

    // 如果啟用自動啟動 Worker，且是開發模式
    if (
      this.options.autoStartWorker &&
      process.env.NODE_ENV === 'development' &&
      this.options.workerOptions
    ) {
      this.startWorker(this.options.workerOptions)
    }
  }

  /**
   * 啟動內嵌 Worker
   */
  startWorker(options: ConsumerOptions): void {
    if (!this.queueManager) {
      throw new Error('QueueManager not initialized. Call install() first.')
    }

    if (this.consumer?.isRunning()) {
      throw new Error('Worker is already running')
    }

    this.consumer = new Consumer(this.queueManager, options)
    this.consumer.start().catch((error) => {
      console.error('[OrbitQueue] Worker error:', error)
    })
  }

  /**
   * 停止內嵌 Worker
   */
  async stopWorker(): Promise<void> {
    if (this.consumer) {
      await this.consumer.stop()
    }
  }

  /**
   * 取得 QueueManager 實例
   */
  getQueueManager(): QueueManager | undefined {
    return this.queueManager
  }
}
