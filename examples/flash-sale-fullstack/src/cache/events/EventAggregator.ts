/**
 * 事件聚合器 - 核心組件
 *
 * 協調事件流的端到端處理：
 * 1. 接收事件
 * 2. 應用背壓
 * 3. 去重和聚合
 * 4. 優先級排序
 * 5. 批量輸出失效事件
 */

import { BackpressureManager, BackpressureState } from './BackpressureManager'
import { EventDeduplicator } from './EventDeduplicator'
import { EventQueue } from './EventQueue'
import { PriorityEscalationManager, PriorityStatistics } from './priority'
import { type CacheEvent, EventPriority, PRIORITY_CONFIG } from './types'

/**
 * 聚合器統計
 */
export interface AggregatorStats {
  totalReceived: number // 總接收事件數
  totalProcessed: number // 總處理事件數
  currentQueueDepth: number // 當前隊列深度
  deduplicationRate: number // 去重率 (%)
  aggregationRate: number // 聚合率 (%)
  rejectedCount: number // 拒絕的事件數
  averageLatency: number // 平均延遲（ms）
  isUnderPressure: boolean // 是否在背壓中
  pressureLevel: number // 背壓等級 (0-100)
}

/**
 * 事件聚合器配置
 */
export interface AggregatorConfig {
  maxQueueDepth?: number
  deduplicationEnabled?: boolean
  backgroundFlushIntervalMs?: number
  metricsCollectionIntervalMs?: number
}

/**
 * 事件聚合器
 */
export class EventAggregator {
  private queue: EventQueue
  private deduplicator: EventDeduplicator
  private backpressureManager: BackpressureManager
  private priorityStats: PriorityStatistics

  private config: Required<AggregatorConfig> = {
    maxQueueDepth: 5000,
    deduplicationEnabled: true,
    backgroundFlushIntervalMs: 1000,
    metricsCollectionIntervalMs: 60000,
  }

  private stats: AggregatorStats = {
    totalReceived: 0,
    totalProcessed: 0,
    currentQueueDepth: 0,
    deduplicationRate: 0,
    aggregationRate: 0,
    rejectedCount: 0,
    averageLatency: 0,
    isUnderPressure: false,
    pressureLevel: 0,
  }

  private latencies: number[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private metricsTimer: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(config?: AggregatorConfig) {
    this.queue = new EventQueue()
    this.deduplicator = new EventDeduplicator()
    this.backpressureManager = new BackpressureManager({
      maxQueueDepth: config?.maxQueueDepth ?? 5000,
    })
    this.priorityStats = new PriorityStatistics()

    if (config) {
      Object.assign(this.config, config)
    }
  }

  /**
   * 啟動聚合器
   */
  start(): void {
    if (this.isRunning) return

    this.isRunning = true

    // 啟動後台清空計時器
    this.flushTimer = setInterval(() => this.flushInternal(), this.config.backgroundFlushIntervalMs)

    // 啟動指標收集計時器
    this.metricsTimer = setInterval(
      () => this.updateMetrics(),
      this.config.metricsCollectionIntervalMs
    )
  }

  /**
   * 停止聚合器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    this.isRunning = false

    // 清除計時器
    if (this.flushTimer) clearInterval(this.flushTimer)
    if (this.metricsTimer) clearInterval(this.metricsTimer)

    // 清空剩餘事件
    await this.flush()
  }

  /**
   * 提交事件
   *
   * @returns 如果接受返回 true，否則返回 false
   */
  async submit(event: CacheEvent): Promise<boolean> {
    this.stats.totalReceived++

    // 應用背壓
    const accepted = await this.backpressureManager.applyBackpressure(
      event.priority,
      this.queue.size()
    )

    if (!accepted) {
      this.stats.rejectedCount++
      return false
    }

    // 添加到隊列
    this.queue.enqueue(event)

    // 如果是 CRITICAL，立即處理
    if (event.priority === EventPriority.CRITICAL) {
      await this.flush(1)
    }

    return true
  }

  /**
   * 批量提交事件
   */
  async submitBatch(events: CacheEvent[]): Promise<number> {
    let accepted = 0
    for (const event of events) {
      if (await this.submit(event)) {
        accepted++
      }
    }
    return accepted
  }

  /**
   * 獲取下一批事件進行處理
   *
   * @param maxSize 最多返回多少個事件
   * @param timeoutMs 最多等待多少毫秒
   */
  async getNextBatch(maxSize = 100, timeoutMs = 0): Promise<CacheEvent[]> {
    const startTime = Date.now()

    // 如果隊列為空，等待事件到達
    while (this.queue.isEmpty()) {
      if (timeoutMs > 0 && Date.now() - startTime > timeoutMs) {
        return []
      }
      // 等待 10ms 後重試
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    // 獲取下一批事件
    const events = this.queue.dequeueByPriority(maxSize)

    // 應用去重
    if (this.config.deduplicationEnabled) {
      this.deduplicator.addEvents(events)
      const deduplicated = this.deduplicator.getDeduplicated()

      // 記錄統計
      this.stats.aggregationRate =
        Math.round((deduplicated.length / events.length) * 100 * 100) / 100

      // 更新隊列深度
      this.stats.currentQueueDepth = this.queue.size()

      return deduplicated
    } else {
      this.stats.currentQueueDepth = this.queue.size()
      return events
    }
  }

  /**
   * 清空隊列中的所有事件
   *
   * @param maxSize 每次返回的最大事件數
   */
  async flush(maxSize = 100): Promise<CacheEvent[]> {
    if (this.queue.isEmpty()) {
      return []
    }

    return this.getNextBatch(maxSize, 0)
  }

  /**
   * 獲取隊列統計
   */
  getQueueStats(): ReturnType<EventQueue['getStats']> {
    return this.queue.getStats()
  }

  /**
   * 檢查隊列是否為空
   */
  isEmpty(): boolean {
    return this.queue.isEmpty()
  }

  /**
   * 獲取隊列大小
   */
  getQueueSize(): number {
    return this.queue.size()
  }

  /**
   * 檢查是否在背壓中
   */
  isUnderPressure(): boolean {
    const state = this.backpressureManager.getBackpressureState(this.queue.size())
    return state !== BackpressureState.NORMAL
  }

  /**
   * 獲取背壓等級
   */
  getPressureLevel(): number {
    return this.backpressureManager.getPressureLevel(this.queue.size())
  }

  /**
   * 記錄事件處理時間
   */
  recordLatency(latencyMs: number): void {
    this.latencies.push(latencyMs)
    this.backpressureManager.recordWaitTime(latencyMs)

    // 保持最近 1000 個測量
    if (this.latencies.length > 1000) {
      this.latencies.shift()
    }
  }

  /**
   * 獲取聚合器統計
   */
  getStats(): AggregatorStats {
    return { ...this.stats }
  }

  /**
   * 重置聚合器統計
   */
  resetStats(): void {
    this.stats.totalReceived = 0
    this.stats.totalProcessed = 0
    this.stats.rejectedCount = 0
    this.stats.averageLatency = 0
    this.latencies = []
    this.deduplicator.resetStats()
    this.backpressureManager.resetStats()
  }

  /**
   * 獲取去重統計
   */
  getDeduplicationStats() {
    return this.deduplicator.getStats()
  }

  /**
   * 獲取背壓統計
   */
  getBackpressureStats() {
    return this.backpressureManager.getStats()
  }

  /**
   * 獲取優先級分布
   */
  getPriorityDistribution() {
    return this.priorityStats.getDistribution()
  }

  /**
   * 清空聚合器
   */
  clear(): void {
    this.queue.clear()
    this.deduplicator.clear()
    this.latencies = []
  }

  /**
   * 內部清空方法
   */
  private async flushInternal(): Promise<void> {
    if (!this.isRunning) return

    try {
      const events = await this.flush()
      this.stats.totalProcessed += events.length
    } catch (error) {
      console.error('[EventAggregator] Flush error:', error)
    }
  }

  /**
   * 更新指標
   */
  private updateMetrics(): void {
    // 更新平均延遲
    if (this.latencies.length > 0) {
      const sum = this.latencies.reduce((a, b) => a + b, 0)
      this.stats.averageLatency = sum / this.latencies.length
    }

    // 更新去重率
    const dedupStats = this.deduplicator.getStats()
    if (dedupStats.totalEvents > 0) {
      this.stats.deduplicationRate = dedupStats.deduplicationRate
    }

    // 更新背壓狀態
    this.stats.isUnderPressure = this.isUnderPressure()
    this.stats.pressureLevel = this.getPressureLevel()
  }
}
