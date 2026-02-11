/**
 * 背壓管理器
 *
 * 當隊列堆積或系統負荷過高時，實施背壓策略
 * - 動態延遲：根據隊列深度調整提交延遲
 * - 自適應窗口：根據吞吐量調整聚合窗口
 * - 優雅降級：超限時拒絕低優先級事件
 */

import { EventPriority, PRIORITY_CONFIG } from './types'

/**
 * 背壓統計
 */
export interface BackpressureStats {
  currentQueueDepth: number // 當前隊列深度
  rejectedCount: number // 拒絕的事件數
  delayedCount: number // 延遲的事件數
  throttledCount: number // 限流的事件數
  averageWaitTime: number // 平均等待時間（ms）
  pressureLevel: number // 背壓等級 (0-100)
}

/**
 * 背壓狀態
 */
export enum BackpressureState {
  NORMAL = 'normal', // 正常，無背壓
  MODERATE = 'moderate', // 中度背壓，隊列 > 100
  HIGH = 'high', // 高背壓，隊列 > 500
  CRITICAL = 'critical', // 關鍵背壓，隊列 > 1000
}

/**
 * 背壓配置
 */
export interface BackpressureConfig {
  maxQueueDepth: number // 最大隊列深度，超過此值拒絕新事件
  moderateThreshold: number // 中度背壓閾值
  highThreshold: number // 高背壓閾值
  criticalThreshold: number // 關鍵背壓閾值
  rejectionStrategy: 'drop' | 'delay' | 'adaptive' // 拒絕策略
}

/**
 * 背壓管理器
 */
export class BackpressureManager {
  private stats: BackpressureStats = {
    currentQueueDepth: 0,
    rejectedCount: 0,
    delayedCount: 0,
    throttledCount: 0,
    averageWaitTime: 0,
    pressureLevel: 0,
  }

  private waitTimes: number[] = [] // 用於計算平均等待時間
  private lastResetTime = Date.now()

  private readonly config: BackpressureConfig = {
    maxQueueDepth: 10000,
    moderateThreshold: 1000,
    highThreshold: 2000,
    criticalThreshold: 4000,
    rejectionStrategy: 'adaptive',
  }

  constructor(config?: Partial<BackpressureConfig>) {
    if (config) {
      Object.assign(this.config, config)
    }
  }

  /**
   * 應用背壓策略
   *
   * @returns 如果應該接受事件則返回 true，否則返回 false
   */
  async applyBackpressure(eventPriority: EventPriority, queueDepth: number): Promise<boolean> {
    this.stats.currentQueueDepth = queueDepth

    // 超過最大隊列深度，拒絕低優先級事件
    if (queueDepth > this.config.maxQueueDepth) {
      if (eventPriority === EventPriority.LOW) {
        this.stats.rejectedCount++
        return false
      }
    }

    // 根據背壓狀態應用策略
    const state = this.getBackpressureState(queueDepth)

    // 計算自適應延遲
    const delay = this.calculateAdaptiveDelay(eventPriority, state, queueDepth)

    if (delay > 0) {
      await this.applyDelay(delay)
      this.stats.delayedCount++
    }

    return true
  }

  /**
   * 獲取背壓狀態
   */
  getBackpressureState(queueDepth: number): BackpressureState {
    if (queueDepth > this.config.criticalThreshold) {
      return BackpressureState.CRITICAL
    }
    if (queueDepth > this.config.highThreshold) {
      return BackpressureState.HIGH
    }
    if (queueDepth > this.config.moderateThreshold) {
      return BackpressureState.MODERATE
    }
    return BackpressureState.NORMAL
  }

  /**
   * 計算自適應延遲（漸進式背壓）
   * 根據隊列深度和優先級線性計算延遲，避免固定延遲跳躍
   */
  private calculateAdaptiveDelay(
    eventPriority: EventPriority,
    state: BackpressureState,
    queueDepth: number
  ): number {
    // 優先級延遲因子（相對基礎延遲）
    const delayFactors: Record<EventPriority, number> = {
      [EventPriority.CRITICAL]: 0,
      [EventPriority.HIGH]: 1,
      [EventPriority.NORMAL]: 2,
      [EventPriority.LOW]: 4,
    }

    const baseFactor = delayFactors[eventPriority]

    // 根據背壓狀態計算基礎延遲
    switch (state) {
      case BackpressureState.NORMAL:
        return 0

      case BackpressureState.MODERATE: {
        // 隊列從 moderateThreshold 到 highThreshold
        // 延遲從 0 到 2ms（減少至 1/5）
        const ratio =
          (queueDepth - this.config.moderateThreshold) /
          (this.config.highThreshold - this.config.moderateThreshold)
        const baseDelay = Math.max(0, ratio * 2)
        return baseDelay * baseFactor
      }

      case BackpressureState.HIGH: {
        // 隊列從 highThreshold 到 criticalThreshold
        // 延遲從 2ms 到 4ms
        const ratio =
          (queueDepth - this.config.highThreshold) /
          (this.config.criticalThreshold - this.config.highThreshold)
        const baseDelay = 2 + Math.max(0, ratio * 2)
        return baseDelay * baseFactor
      }

      case BackpressureState.CRITICAL: {
        // 隊列從 criticalThreshold 到 maxQueueDepth
        // 延遲從 4ms 到 10ms
        const ratio =
          (queueDepth - this.config.criticalThreshold) /
          (this.config.maxQueueDepth - this.config.criticalThreshold)
        const baseDelay = 4 + Math.max(0, ratio * 6)
        return baseDelay * baseFactor
      }
    }
  }

  /**
   * 計算動態聚合窗口大小
   * 背壓增加時，增大窗口以增加聚合效果
   */
  calculateDynamicWindow(basePriority: EventPriority, queueDepth: number): number {
    const baseWindow = PRIORITY_CONFIG[basePriority].windowMs
    const state = this.getBackpressureState(queueDepth)

    switch (state) {
      case BackpressureState.NORMAL:
        return baseWindow
      case BackpressureState.MODERATE:
        return baseWindow + 50 // 額外 50ms
      case BackpressureState.HIGH:
        return baseWindow + 100 // 額外 100ms
      case BackpressureState.CRITICAL:
        return Math.min(baseWindow * 2, 1000) // 最多 1000ms
    }
  }

  /**
   * 記錄事件等待時間
   */
  recordWaitTime(waitTimeMs: number): void {
    this.waitTimes.push(waitTimeMs)

    // 保持最近 100 個測量
    if (this.waitTimes.length > 100) {
      this.waitTimes.shift()
    }

    // 每 60 秒更新一次統計
    if (Date.now() - this.lastResetTime > 60000) {
      this.updateAverageWaitTime()
      this.lastResetTime = Date.now()
    }
  }

  /**
   * 獲取壓力等級 (0-100)
   */
  getPressureLevel(queueDepth: number): number {
    const maxDepth = this.config.maxQueueDepth
    const pressure = Math.min((queueDepth / maxDepth) * 100, 100)
    this.stats.pressureLevel = Math.round(pressure)
    return this.stats.pressureLevel
  }

  /**
   * 檢查是否應該啟動背壓
   */
  isUnderPressure(queueDepth: number): boolean {
    return this.getBackpressureState(queueDepth) !== BackpressureState.NORMAL
  }

  /**
   * 檢查是否處於關鍵背壓狀態
   */
  isCritical(queueDepth: number): boolean {
    return this.getBackpressureState(queueDepth) === BackpressureState.CRITICAL
  }

  /**
   * 獲取統計信息
   */
  getStats(): BackpressureStats {
    return { ...this.stats }
  }

  /**
   * 重置統計信息
   */
  resetStats(): void {
    this.stats.rejectedCount = 0
    this.stats.delayedCount = 0
    this.stats.throttledCount = 0
  }

  /**
   * 應用延遲（指數退避）
   */
  private async applyDelay(baseDelayMs: number): Promise<void> {
    const jitter = Math.random() * baseDelayMs * 0.1 // 10% 抖動
    const delayMs = baseDelayMs + jitter
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  /**
   * 更新平均等待時間
   */
  private updateAverageWaitTime(): void {
    if (this.waitTimes.length === 0) {
      this.stats.averageWaitTime = 0
    } else {
      const sum = this.waitTimes.reduce((a, b) => a + b, 0)
      this.stats.averageWaitTime = sum / this.waitTimes.length
    }
  }

  /**
   * 計算指數退避延遲
   * 每次重試時延遲加倍，最大 10000ms
   */
  static exponentialBackoff(retryCount: number): number {
    const baseDelay = 100 // 100ms 基礎延遲
    const maxDelay = 10000 // 最大 10 秒
    const delay = Math.min(baseDelay * 2 ** retryCount, maxDelay)
    // 添加隨機抖動，減少重試風暴
    const jitter = Math.random() * delay * 0.1
    return delay + jitter
  }
}
