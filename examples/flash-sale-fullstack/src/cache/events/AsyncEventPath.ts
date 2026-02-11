/**
 * 異步快速路徑管理器 - Phase 3 優化核心組件
 *
 * 實現事件優先級分級處理：
 * - 高優先級：同步提交（立即）
 * - 低優先級：異步提交（非阻塞）
 * 預期性能改進：5-10%
 *
 * 適用場景：
 * - 非阻塞操作所需的場景
 * - 高優先級事件優先處理
 * - 減少高優先級的延遲
 */

import type { CacheEvent } from './types.js'
import { EventPriority } from './types.js'

/**
 * 異步路徑配置
 */
export interface AsyncPathConfig {
  // 異步提交的優先級閾值（高於此優先級同步，低於此優先級異步）
  asyncThreshold?: EventPriority

  // 異步隊列最大深度
  maxAsyncQueueDepth?: number

  // 異步隊列的檢查間隔（ms）
  asyncCheckIntervalMs?: number
}

/**
 * 異步路徑統計
 */
export interface AsyncPathStats {
  // 同步提交事件數
  syncSubmitted: number

  // 異步提交事件數
  asyncSubmitted: number

  // 當前異步隊列深度
  asyncQueueDepth: number

  // 異步隊列最大深度
  maxAsyncQueueDepth: number

  // 當前優先級閾值
  currentThreshold: EventPriority

  // 異步批次總數
  asyncBatchCount: number

  // 平均異步延遲（ms）
  averageAsyncLatency: number
}

/**
 * 異步快速路徑管理器
 */
export class AsyncEventPath {
  // 異步隊列
  private asyncQueue: CacheEvent[] = []

  // 優先級閾值（高於此優先級同步，低於同步）
  private asyncThreshold: EventPriority

  // 最大異步隊列深度
  private readonly maxAsyncQueueDepth: number

  // 異步隊列檢查間隔
  private readonly asyncCheckIntervalMs: number

  // 異步批處理定時器
  private asyncTimer: NodeJS.Timeout | null = null

  // 統計信息
  private stats = {
    syncSubmitted: 0,
    asyncSubmitted: 0,
    asyncBatchCount: 0,
    totalAsyncLatency: 0,
  }

  // 回調函數
  private syncSubmitFn: (event: CacheEvent) => Promise<void>
  private asyncSubmitFn: (events: CacheEvent[]) => Promise<void>

  /**
   * 創建異步快速路徑管理器
   */
  constructor(
    syncSubmitFn: (event: CacheEvent) => Promise<void>,
    asyncSubmitFn: (events: CacheEvent[]) => Promise<void>,
    config?: AsyncPathConfig
  ) {
    this.syncSubmitFn = syncSubmitFn
    this.asyncSubmitFn = asyncSubmitFn

    this.asyncThreshold = config?.asyncThreshold ?? EventPriority.NORMAL
    this.maxAsyncQueueDepth = config?.maxAsyncQueueDepth ?? 1000
    this.asyncCheckIntervalMs = config?.asyncCheckIntervalMs ?? 100
  }

  /**
   * 提交事件到正確的路徑
   */
  async submit(event: CacheEvent): Promise<void> {
    // 判斷優先級
    const priorityValue = this.getPriorityValue(event.priority)
    const thresholdValue = this.getPriorityValue(this.asyncThreshold)

    if (priorityValue < thresholdValue) {
      // 同步提交（高優先級）
      await this.submitSync(event)
    } else {
      // 異步提交（低優先級或等於閾值）
      this.submitAsync(event)
    }
  }

  /**
   * 批量提交事件
   */
  async submitBatch(events: CacheEvent[]): Promise<void> {
    for (const event of events) {
      await this.submit(event)
    }
  }

  /**
   * 同步提交
   */
  private async submitSync(event: CacheEvent): Promise<void> {
    this.stats.syncSubmitted++
    await this.syncSubmitFn(event)
  }

  /**
   * 異步提交
   */
  private submitAsync(event: CacheEvent): void {
    // 檢查異步隊列是否已滿
    if (this.asyncQueue.length >= this.maxAsyncQueueDepth) {
      // 隊列滿，降級為同步提交
      this.submitSync(event).catch((error) => {
        console.error('[AsyncEventPath] Sync fallback error:', error)
      })
      return
    }

    this.asyncQueue.push(event)
    this.stats.asyncSubmitted++

    // 如果沒有待處理的異步批次，啟動定時器
    if (this.asyncTimer === null) {
      this.startAsyncTimer()
    }
  }

  /**
   * 刷新異步隊列
   */
  private async flushAsyncQueue(): Promise<void> {
    if (this.asyncQueue.length === 0) {
      return
    }

    // 取出所有異步事件
    const events = this.asyncQueue.splice(0, this.asyncQueue.length)

    // 記錄統計
    this.stats.asyncBatchCount++
    const latency = this.asyncCheckIntervalMs
    this.stats.totalAsyncLatency += latency

    try {
      await this.asyncSubmitFn(events)
    } catch (error) {
      // 如果異步提交失敗，將事件放回隊列
      this.asyncQueue.unshift(...events)
      console.error('[AsyncEventPath] Async submit error:', error)
    }
  }

  /**
   * 啟動異步定時器
   */
  private startAsyncTimer(): void {
    this.asyncTimer = setTimeout(async () => {
      this.asyncTimer = null

      try {
        await this.flushAsyncQueue()
      } catch (error) {
        console.error('[AsyncEventPath] Async flush error:', error)
      }

      // 如果還有待提交的事件，重新啟動定時器
      if (this.asyncQueue.length > 0) {
        this.startAsyncTimer()
      }
    }, this.asyncCheckIntervalMs)
  }

  /**
   * 停止異步路徑
   */
  async stop(): Promise<CacheEvent[]> {
    if (this.asyncTimer !== null) {
      clearTimeout(this.asyncTimer)
      this.asyncTimer = null
    }

    const remaining = [...this.asyncQueue]
    this.asyncQueue = []

    if (remaining.length > 0) {
      try {
        await this.asyncSubmitFn(remaining)
      } catch (error) {
        console.error('[AsyncEventPath] Final flush error:', error)
      }
    }

    return remaining
  }

  /**
   * 設置優先級閾值
   */
  setAsyncThreshold(threshold: EventPriority): void {
    this.asyncThreshold = threshold
  }

  /**
   * 獲取統計信息
   */
  getStats(): AsyncPathStats {
    const avgLatency =
      this.stats.asyncBatchCount > 0 ? this.stats.totalAsyncLatency / this.stats.asyncBatchCount : 0

    return {
      syncSubmitted: this.stats.syncSubmitted,
      asyncSubmitted: this.stats.asyncSubmitted,
      asyncQueueDepth: this.asyncQueue.length,
      maxAsyncQueueDepth: this.maxAsyncQueueDepth,
      currentThreshold: this.asyncThreshold,
      asyncBatchCount: this.stats.asyncBatchCount,
      averageAsyncLatency: Math.round(avgLatency * 100) / 100,
    }
  }

  /**
   * 清空異步隊列
   */
  clear(): void {
    if (this.asyncTimer !== null) {
      clearTimeout(this.asyncTimer)
      this.asyncTimer = null
    }
    this.asyncQueue = []
  }

  /**
   * 獲取優先級數值
   */
  private getPriorityValue(priority: EventPriority): number {
    switch (priority) {
      case EventPriority.CRITICAL:
        return 0
      case EventPriority.HIGH:
        return 1
      case EventPriority.NORMAL:
        return 2
      case EventPriority.LOW:
        return 3
      default:
        return 2
    }
  }

  /**
   * 獲取待處理異步事件數
   */
  getAsyncQueueDepth(): number {
    return this.asyncQueue.length
  }

  /**
   * 檢查是否有待處理的異步事件
   */
  hasPendingAsync(): boolean {
    return this.asyncQueue.length > 0
  }
}

/**
 * 異步快速路徑工廠函數
 */
export function createAsyncEventPath(
  syncSubmitFn: (event: CacheEvent) => Promise<void>,
  asyncSubmitFn: (events: CacheEvent[]) => Promise<void>,
  config?: AsyncPathConfig
): AsyncEventPath {
  return new AsyncEventPath(syncSubmitFn, asyncSubmitFn, config)
}
