/**
 * 異步失效引擎
 *
 * 協調異步快取失效操作
 * - 非阻塞失效執行
 * - 優先級調度
 * - 重試機制
 * - DLQ 支持
 * - 統計追蹤
 */

import type { CacheEvent } from '../events'
import { CacheEventType, EventPriority, EventSource } from '../events'
import { InvalidationScheduler, type ScheduledTask } from './InvalidationScheduler'
import { type RetryPolicy, RetryPolicyFactory } from './RetryPolicy'

/**
 * 失效結果
 */
export interface InvalidationResult {
  success: boolean // 是否成功
  pattern: string // 失效模式
  attemptCount: number // 嘗試次數
  duration: number // 耗時（毫秒）
  error?: Error // 錯誤信息
}

/**
 * 失效統計
 */
export interface InvalidationStats {
  totalAttempts: number // 總嘗試次數
  successCount: number // 成功次數
  failureCount: number // 失敗次數
  dlqCount: number // DLQ 計數
  averageLatency: number // 平均延遲
  successRate: number // 成功率 (%)
}

/**
 * DLQ 事件
 */
export interface DLQEvent {
  id: string
  pattern: string
  errorCount: number
  lastError: Error
  firstAttempt: number
  lastAttempt: number
}

/**
 * 異步失效引擎配置
 */
export interface AsyncInvalidationConfig {
  maxRetries?: number
  dlqEnabled?: boolean
  dlqMaxSize?: number
  metricsIntervalMs?: number
}

/**
 * 異步失效引擎
 */
export class AsyncInvalidationEngine {
  private scheduler: InvalidationScheduler
  private retryPolicies: Map<EventPriority, RetryPolicy>
  private stats: InvalidationStats = {
    totalAttempts: 0,
    successCount: 0,
    failureCount: 0,
    dlqCount: 0,
    averageLatency: 0,
    successRate: 0,
  }

  private dlqMap: Map<string, DLQEvent> = new Map()
  private latencies: number[] = []
  private invalidationHandlers: Map<EventPriority, (pattern: string) => Promise<void>> = new Map()
  private metricsTimer: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(_config?: AsyncInvalidationConfig) {
    this.scheduler = new InvalidationScheduler()

    // 初始化重試策略
    this.retryPolicies = new Map([
      [EventPriority.CRITICAL, RetryPolicyFactory.createFastRetry()],
      [EventPriority.HIGH, RetryPolicyFactory.createStandardRetry()],
      [EventPriority.NORMAL, RetryPolicyFactory.createStandardRetry()],
      [EventPriority.LOW, RetryPolicyFactory.createSlowRetry()],
    ])

    // 設置全局執行回調
    this.scheduler.onAnyExecution((task) => this.handleTaskExecution(task))
  }

  /**
   * 啟動引擎
   */
  start(): void {
    if (this.isRunning) {
      return
    }

    this.isRunning = true

    // 啟動指標收集
    this.metricsTimer = setInterval(
      () => this.updateMetrics(),
      60000 // 每 60 秒更新一次
    )
  }

  /**
   * 停止引擎
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
    }

    await this.scheduler.shutdown()
  }

  /**
   * 註冊失效處理器
   */
  registerHandler(priority: EventPriority, handler: (pattern: string) => Promise<void>): void {
    this.invalidationHandlers.set(priority, handler)
  }

  /**
   * 執行失效操作
   *
   * @param pattern 失效模式
   * @param priority 優先級
   * @param delayMs 延遲時間
   */
  async invalidate(
    pattern: string,
    priority: EventPriority = EventPriority.NORMAL,
    delayMs = 0
  ): Promise<InvalidationResult> {
    const startTime = Date.now()
    const event: CacheEvent = {
      id: `invalidate:${pattern}:${Date.now()}`,
      type: CacheEventType.BATCH_INVALIDATION,
      priority,
      patterns: [pattern],
      timestamp: Date.now(),
      source: EventSource.SYSTEM,
    }

    // 調度任務
    this.scheduler.schedule(event, delayMs)

    // 如果是 CRITICAL，等待執行完成
    if (priority === EventPriority.CRITICAL) {
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.scheduler.hasTask(event.id)) {
            clearInterval(checkInterval)
            resolve(null)
          }
        }, 10)

        // 超時保護
        setTimeout(() => {
          clearInterval(checkInterval)
          resolve(null)
        }, 5000)
      })
    }

    const duration = Date.now() - startTime
    this.latencies.push(duration)

    return {
      success: true,
      pattern,
      attemptCount: 1,
      duration,
    }
  }

  /**
   * 批量失效
   */
  async invalidateBatch(
    patterns: string[],
    priority: EventPriority = EventPriority.NORMAL
  ): Promise<InvalidationResult[]> {
    return Promise.all(patterns.map((p) => this.invalidate(p, priority)))
  }

  /**
   * 條件失效 - 只有滿足條件時才失效
   */
  async invalidateIf(
    pattern: string,
    condition: () => Promise<boolean>,
    priority: EventPriority = EventPriority.NORMAL
  ): Promise<number> {
    const shouldInvalidate = await condition()
    if (shouldInvalidate) {
      await this.invalidate(pattern, priority)
      return 1
    }
    return 0
  }

  /**
   * 處理任務執行
   */
  private async handleTaskExecution(task: ScheduledTask): Promise<void> {
    const startTime = Date.now()

    try {
      // 獲取對應優先級的重試策略
      const retryPolicy =
        this.retryPolicies.get(task.priority) || this.retryPolicies.get(EventPriority.NORMAL)!

      // 獲取失效處理器
      const handler = this.invalidationHandlers.get(task.priority)

      if (!handler) {
        throw new Error(`No handler registered for priority ${task.priority}`)
      }

      // 執行帶重試的失效操作
      const { retryResult } = await retryPolicy.executeWithRetry(() =>
        handler(task.event.patterns[0])
      )

      if (retryResult.success) {
        this.stats.successCount++
      } else {
        this.stats.failureCount++

        // 添加到 DLQ
        if (retryResult.lastError) {
          this.addToDLQ(task.event.patterns[0], retryResult.lastError)
        }
      }

      this.stats.totalAttempts += retryResult.attempt
    } catch (error) {
      this.stats.failureCount++

      if (error instanceof Error) {
        this.addToDLQ(task.event.patterns[0], error)
      }
    } finally {
      const duration = Date.now() - startTime
      this.latencies.push(duration)
    }
  }

  /**
   * 添加到 DLQ
   */
  private addToDLQ(pattern: string, error: Error): void {
    const existing = this.dlqMap.get(pattern)

    if (existing) {
      existing.errorCount++
      existing.lastError = error
      existing.lastAttempt = Date.now()
    } else {
      this.dlqMap.set(pattern, {
        id: `dlq:${pattern}:${Date.now()}`,
        pattern,
        errorCount: 1,
        lastError: error,
        firstAttempt: Date.now(),
        lastAttempt: Date.now(),
      })
      this.stats.dlqCount++
    }
  }

  /**
   * 重試 DLQ 中的操作
   */
  async retryDLQ(maxRetries = 3): Promise<number> {
    let retried = 0

    for (const [pattern, dlqEvent] of this.dlqMap.entries()) {
      if (dlqEvent.errorCount <= maxRetries) {
        try {
          const priority = this.getPriorityForPattern(pattern)
          await this.invalidate(pattern, priority)
          this.dlqMap.delete(pattern)
          retried++
        } catch (_error) {
          // 重試失敗，保留在 DLQ 中
        }
      }
    }

    return retried
  }

  /**
   * 獲取 DLQ 內容
   */
  getDLQEvents(): DLQEvent[] {
    return Array.from(this.dlqMap.values())
  }

  /**
   * 清空 DLQ
   */
  clearDLQ(): number {
    const count = this.dlqMap.size
    this.dlqMap.clear()
    return count
  }

  /**
   * 獲取統計信息
   */
  getStats(): InvalidationStats {
    return { ...this.stats }
  }

  /**
   * 重置統計信息
   */
  resetStats(): void {
    this.stats.totalAttempts = 0
    this.stats.successCount = 0
    this.stats.failureCount = 0
    this.stats.dlqCount = 0
    this.stats.averageLatency = 0
    this.stats.successRate = 0
    this.latencies = []
  }

  /**
   * 獲取調度器統計
   */
  getSchedulerStats() {
    return this.scheduler.getStats()
  }

  /**
   * 更新指標
   */
  private updateMetrics(): void {
    if (this.latencies.length > 0) {
      const sum = this.latencies.reduce((a, b) => a + b, 0)
      this.stats.averageLatency = sum / this.latencies.length
    }

    const total = this.stats.successCount + this.stats.failureCount
    if (total > 0) {
      this.stats.successRate = Math.round((this.stats.successCount / total) * 100)
    }
  }

  /**
   * 根據模式獲取優先級（簡單邏輯）
   */
  private getPriorityForPattern(pattern: string): EventPriority {
    // 根據模式名稱判斷優先級
    if (pattern.includes('inventory') || pattern.includes('reserved')) {
      return EventPriority.CRITICAL
    }
    if (pattern.includes('price') || pattern.includes('promotion')) {
      return EventPriority.HIGH
    }
    return EventPriority.NORMAL
  }
}
