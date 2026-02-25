import { EventEmitter } from 'node:events'
import type { HeartbeatConfig, HeartbeatStatus } from './types'

/**
 * 管理 Kafka 消費者的心跳偵測。
 *
 * 定期檢查消費者是否活躍，如果連續遺漏心跳達到閾值，
 * 則發出 'stale' 事件通知上層元件。
 *
 * 事件:
 * - 'heartbeat': 每次心跳檢查時發出
 * - 'stale': 當遺漏計數達到 maxMissed 時發出
 *
 * @public
 */
export class HeartbeatManager extends EventEmitter {
  private readonly interval: number
  private readonly sessionTimeout: number
  private readonly maxMissed: number

  private consumerId = ''
  private queues: string[] = []
  private lastHeartbeat = 0
  private missedCount = 0
  private startTime = 0
  private running = false
  private checkTimer: ReturnType<typeof setInterval> | null = null

  constructor(config?: HeartbeatConfig) {
    super()
    this.interval = config?.interval ?? 3000
    this.sessionTimeout = config?.sessionTimeout ?? 30000
    this.maxMissed = config?.maxMissed ?? 3
  }

  /**
   * 開始心跳迴圈。
   *
   * 冪等操作：如果已經在執行中，不會重複啟動。
   */
  async start(consumerId: string, queues: string[]): Promise<void> {
    if (this.running) {
      return
    }

    this.consumerId = consumerId
    this.queues = [...queues]
    this.lastHeartbeat = Date.now()
    this.missedCount = 0
    this.startTime = Date.now()
    this.running = true

    this.checkTimer = setInterval(() => {
      this.check()
    }, this.interval)
  }

  /**
   * 停止心跳迴圈並清理計時器。
   *
   * 冪等操作：重複呼叫不會出錯。
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return
    }

    this.running = false

    if (this.checkTimer !== null) {
      clearInterval(this.checkTimer)
      this.checkTimer = null
    }
  }

  /**
   * 手動心跳（重置遺漏計數）。
   *
   * 由外部元件在成功處理訊息後呼叫。
   */
  beat(): void {
    this.lastHeartbeat = Date.now()
    this.missedCount = 0
  }

  /**
   * 返回當前心跳狀態快照。
   */
  getStatus(): HeartbeatStatus {
    const now = Date.now()
    return {
      consumerId: this.consumerId,
      lastHeartbeat: this.lastHeartbeat,
      missedCount: this.missedCount,
      isAlive: this.running && this.missedCount < this.maxMissed,
      uptime: this.running ? now - this.startTime : 0,
      queues: [...this.queues],
    }
  }

  /**
   * 註冊心跳狀態變更監聽器。
   */
  onStateChange(listener: (status: HeartbeatStatus) => void): void {
    this.on('stateChange', listener)
  }

  /**
   * 內部：定期檢查心跳狀態。
   */
  private check(): void {
    const now = Date.now()
    const elapsed = now - this.lastHeartbeat

    // 檢查是否超過心跳間隔（遺漏一次心跳）
    if (elapsed >= this.interval) {
      this.missedCount += 1
    }

    // 發出心跳事件
    const status = this.getStatus()
    this.emit('heartbeat', status)

    // 檢查工作階段逾時
    if (elapsed >= this.sessionTimeout) {
      this.emit('stale', status)
      this.emit('stateChange', status)
      return
    }

    // 檢查是否達到最大遺漏次數
    if (this.missedCount >= this.maxMissed) {
      this.emit('stale', status)
      this.emit('stateChange', status)
    }
  }
}
