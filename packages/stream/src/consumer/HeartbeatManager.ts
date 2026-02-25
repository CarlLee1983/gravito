import type { QueueManager } from '../QueueManager'
import type { ConsumerStats } from './types'

/**
 * HeartbeatManager 設定選項。
 */
export interface HeartbeatManagerOptions {
  /** Worker ID */
  workerId: string
  /** 要監控的佇列列表 */
  queues: string[]
  /** 連線名稱 */
  connectionName: string
  /** 心跳間隔（毫秒），預設 5000 */
  interval?: number
  /** 額外資訊，包含在心跳 payload 中 */
  extraInfo?: Record<string, unknown>
  /** 監控 key prefix */
  prefix?: string
}

/**
 * 管理 Consumer 的心跳與監控日誌。
 *
 * 定時向 driver 發送心跳信號（reportHeartbeat），
 * 並在支援時發送監控日誌（publishLog）。
 * 所有異常均被靜默捕獲，不影響主流程。
 *
 * @example
 * ```typescript
 * const heartbeat = new HeartbeatManager(queueManager, options, () => stats)
 * heartbeat.start()
 * // ... consumer running ...
 * heartbeat.stop()
 * ```
 */
export class HeartbeatManager {
  private timer: ReturnType<typeof setInterval> | null = null
  private readonly intervalMs: number

  constructor(
    private readonly queueManager: QueueManager,
    private readonly options: HeartbeatManagerOptions,
    /** getter 函數，每次心跳時取得最新統計 */
    private readonly getStats: () => ConsumerStats
  ) {
    this.intervalMs = options.interval ?? 5000
  }

  /**
   * 啟動心跳定時器。
   */
  start(): void {
    if (this.timer) return

    this.timer = setInterval(async () => {
      await this.sendHeartbeat()
    }, this.intervalMs)

    // 允許 timer 不阻止 process 退出
    if (this.timer.unref) {
      this.timer.unref()
    }
  }

  /**
   * 停止心跳定時器。
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * 發送一次心跳。
   */
  async sendHeartbeat(): Promise<void> {
    try {
      const driver = this.queueManager.getDriver(this.options.connectionName)
      if (!driver.reportHeartbeat) return

      const os = require('node:os')
      const mem = process.memoryUsage()
      const stats = this.getStats()

      const metrics = {
        cpu: os.loadavg()[0],
        cores: os.cpus().length,
        ram: {
          rss: Math.floor(mem.rss / 1024 / 1024),
          heapUsed: Math.floor(mem.heapUsed / 1024 / 1024),
          total: Math.floor(os.totalmem() / 1024 / 1024),
        },
        stats,
      }

      await driver.reportHeartbeat(
        {
          id: this.options.workerId,
          status: 'online',
          hostname: os.hostname(),
          pid: process.pid,
          uptime: Math.floor(process.uptime()),
          last_ping: new Date().toISOString(),
          queues: this.options.queues,
          metrics,
          ...(this.options.extraInfo ?? {}),
        },
        this.options.prefix
      )
    } catch (_e) {
      // 靜默跳過，不影響 consumer 主流程
    }
  }

  /**
   * 發送監控日誌。
   *
   * @param level - 日誌等級（info, success, warning, error）
   * @param message - 日誌訊息
   * @param jobId - 相關的 job ID（可選）
   */
  async publishLog(level: string, message: string, jobId?: string): Promise<void> {
    try {
      const driver = this.queueManager.getDriver(this.options.connectionName)
      if (!driver.publishLog) return

      await driver.publishLog(
        {
          level,
          message,
          workerId: this.options.workerId,
          jobId,
          timestamp: new Date().toISOString(),
        },
        this.options.prefix
      )
    } catch (_e) {
      // 靜默跳過，監控日誌失敗不影響 consumer
    }
  }
}
