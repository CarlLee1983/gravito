/**
 * 批量提交管理器 - Phase 3 優化核心組件
 *
 * 通過微批量提交（microbatching）優化事件吞吐量
 * 實現原理：
 * 1. 收集事件到臨時隊列
 * 2. 當達到批大小或刷新間隔時，提交到主隊列
 * 3. 減少單個事件的往返次數
 * 預期性能改進：10-15%
 *
 * 適用場景：
 * - 高頻、低優先級事件提交
 * - 異步非阻塞場景
 * - 需要控制延遲的場景
 */

import type { CacheEvent } from './types.js'

/**
 * 批量提交統計
 */
export interface BatchStats {
  // 提交的批次總數
  totalBatches: number

  // 累計提交的事件總數
  totalEvents: number

  // 平均批大小
  averageBatchSize: number

  // 平均批延遲（ms）
  averageBatchLatency: number

  // 最後一次刷新時間戳
  lastFlushTime: number

  // 當前待提交的事件數
  pendingEvents: number

  // 自動刷新總次數
  autoFlushCount: number

  // 手動刷新總次數
  manualFlushCount: number
}

/**
 * 批量提交處理器
 * 用於優化高頻事件提交的吞吐量
 */
export class BatchSubmitter {
  // 事件提交隊列
  private queue: CacheEvent[] = []

  // 批大小（觸發自動提交的臨界值）
  private readonly batchSize: number

  // 刷新間隔（ms）
  private readonly flushIntervalMs: number

  // 刷新定時器
  private flushTimer: NodeJS.Timeout | null = null

  // 統計信息
  private stats = {
    totalBatches: 0,
    totalEvents: 0,
    totalLatency: 0,
    autoFlushCount: 0,
    manualFlushCount: 0,
    lastFlushTime: Date.now(),
  }

  // 提交回調函數
  private submitFn: (events: CacheEvent[]) => Promise<void>

  /**
   * 創建批量提交管理器
   *
   * @param batchSize 批大小（默認 50）
   * @param flushIntervalMs 刷新間隔毫秒（默認 50ms）
   * @param submitFn 提交函數
   */
  constructor(
    batchSize = 50,
    flushIntervalMs = 50,
    submitFn: (events: CacheEvent[]) => Promise<void>
  ) {
    this.batchSize = batchSize
    this.flushIntervalMs = flushIntervalMs
    this.submitFn = submitFn
  }

  /**
   * 入隊事件
   *
   * 自動檢查是否需要刷新：
   * 1. 如果隊列已滿 -> 立即刷新
   * 2. 如果隊列非空且無定時器 -> 啟動定時器
   */
  async enqueue(event: CacheEvent): Promise<void> {
    this.queue.push(event)

    // 如果達到批大小，立即刷新
    if (this.queue.length >= this.batchSize) {
      await this.flush(true) // 標記為自動刷新
    } else if (this.flushTimer === null && this.queue.length > 0) {
      // 啟動定時刷新計時器
      this.startTimer()
    }
  }

  /**
   * 批量入隊事件
   */
  async enqueueBatch(events: CacheEvent[]): Promise<void> {
    for (const event of events) {
      await this.enqueue(event)
    }
  }

  /**
   * 刷新隊列中的事件
   * 提交當前隊列中的所有事件
   */
  async flush(auto = false): Promise<CacheEvent[]> {
    if (this.queue.length === 0) {
      return []
    }

    // 清除定時器
    this.clearTimer()

    // 取出所有事件
    const events = this.queue.splice(0, this.queue.length)

    // 記錄統計信息
    const latency = Date.now() - this.stats.lastFlushTime
    this.stats.totalBatches++
    this.stats.totalEvents += events.length
    this.stats.totalLatency += latency
    this.stats.lastFlushTime = Date.now()

    if (auto) {
      this.stats.autoFlushCount++
    } else {
      this.stats.manualFlushCount++
    }

    // 提交事件
    try {
      await this.submitFn(events)
    } catch (error) {
      // 如果提交失敗，將事件放回隊列
      this.queue.unshift(...events)
      throw error
    }

    return events
  }

  /**
   * 獲取統計信息
   */
  getStats(): BatchStats {
    const avgBatchSize =
      this.stats.totalBatches > 0 ? this.stats.totalEvents / this.stats.totalBatches : 0
    const avgLatency =
      this.stats.totalBatches > 0 ? this.stats.totalLatency / this.stats.totalBatches : 0

    return {
      totalBatches: this.stats.totalBatches,
      totalEvents: this.stats.totalEvents,
      averageBatchSize: Math.round(avgBatchSize * 100) / 100,
      averageBatchLatency: Math.round(avgLatency * 100) / 100,
      lastFlushTime: this.stats.lastFlushTime,
      pendingEvents: this.queue.length,
      autoFlushCount: this.stats.autoFlushCount,
      manualFlushCount: this.stats.manualFlushCount,
    }
  }

  /**
   * 獲取待提交事件數
   */
  getPendingCount(): number {
    return this.queue.length
  }

  /**
   * 檢查是否有待提交的事件
   */
  hasPending(): boolean {
    return this.queue.length > 0
  }

  /**
   * 清空隊列
   */
  clear(): void {
    this.queue = []
    this.clearTimer()
  }

  /**
   * 重置統計信息
   */
  resetStats(): void {
    this.stats = {
      totalBatches: 0,
      totalEvents: 0,
      totalLatency: 0,
      autoFlushCount: 0,
      manualFlushCount: 0,
      lastFlushTime: Date.now(),
    }
  }

  /**
   * 停止批提交管理器
   * 清空所有待提交的事件
   */
  async stop(): Promise<CacheEvent[]> {
    this.clearTimer()
    if (this.queue.length > 0) {
      return this.flush(false)
    }
    return []
  }

  /**
   * 啟動定時刷新
   */
  private startTimer(): void {
    if (this.flushTimer !== null) {
      return
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      if (this.queue.length > 0) {
        // 異步刷新，不阻塞
        this.flush(true).catch((error) => {
          console.error('[BatchSubmitter] Flush error:', error)
        })
      }
    }, this.flushIntervalMs)
  }

  /**
   * 清除定時器
   */
  private clearTimer(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * 調整批大小
   */
  setBatchSize(newSize: number): void {
    // 批大小調整後，檢查是否需要立即刷新
    if (this.queue.length >= newSize && newSize < this.batchSize) {
      this.flush(true).catch((error) => {
        console.error('[BatchSubmitter] Flush error:', error)
      })
    }
  }

  /**
   * 調整刷新間隔
   */
  setFlushInterval(newIntervalMs: number): void {
    // 重新啟動定時器
    this.clearTimer()
    if (this.queue.length > 0) {
      this.startTimer()
    }
  }

  /**
   * 獲取批大小
   */
  getBatchSize(): number {
    return this.batchSize
  }

  /**
   * 獲取刷新間隔
   */
  getFlushInterval(): number {
    return this.flushIntervalMs
  }
}

/**
 * 批量提交工廠函數
 */
export function createBatchSubmitter(
  submitFn: (events: CacheEvent[]) => Promise<void>,
  batchSize = 50,
  flushIntervalMs = 50
): BatchSubmitter {
  return new BatchSubmitter(batchSize, flushIntervalMs, submitFn)
}
