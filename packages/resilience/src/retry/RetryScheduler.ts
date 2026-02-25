/**
 * @gravito/core - Retry Scheduler
 *
 * 分佈式重試排程器，使用 Bull Queue 進行異步延遲重試。
 * 支援指數回退、Redis 持久化、重試失敗回呼。
 *
 * Distributed retry scheduler using Bull Queue for async delayed retries.
 * Supports exponential backoff, Redis persistence, and failure callbacks.
 */

import type { EventOptions } from '@gravito/core'

/**
 * 重試排程器配置介面
 */
export interface RetrySchedulerConfig {
  /** 是否啟用 Bull Queue 重試（預設 true） */
  enabled?: boolean

  /** Redis 連接配置（可選，使用全域 Redis） */
  redisUrl?: string

  /** 預設最大重試次數（預設 5） */
  maxRetries?: number

  /** 初始延遲時間（ms，預設 1000） */
  initialDelayMs?: number

  /** 指數回退倍數（預設 2.0） */
  backoffMultiplier?: number

  /** 最大延遲時間（ms，預設 1h） */
  maxDelayMs?: number

  /** 重試失敗回呼 */
  onRetryFailed?: (eventName: string, error: Error, retryCount: number) => void
}

/**
 * 隊列統計資訊
 */
export interface QueueStats {
  name: string
  jobCounts: { waiting: number; active: number; delayed: number; failed: number }
  completedCount: number
  failedCount: number
}

/**
 * 重試排程器
 *
 * 提供異步分佈式重試機制，利用 Bull Queue 進行延遲重試。
 * 支援指數回退、Redis 持久化、隊列統計。
 */
export class RetryScheduler {
  private enabled: boolean
  private config: Required<RetrySchedulerConfig>
  private queues: Map<string, unknown> = new Map() // Queue instances
  // biome-ignore lint/suspicious/noExplicitAny: bullmq is optional peer dependency
  private bullmqModule: any = null
  private bullmqLoadError: Error | null = null

  constructor(config: RetrySchedulerConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      redisUrl: config.redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379',
      maxRetries: config.maxRetries ?? 5,
      initialDelayMs: config.initialDelayMs ?? 1000,
      backoffMultiplier: config.backoffMultiplier ?? 2.0,
      maxDelayMs: config.maxDelayMs ?? 3600000, // 1 hour
      onRetryFailed: config.onRetryFailed ?? (() => {}),
    }

    this.enabled = this.config.enabled

    // 嘗試動態加載 bullmq（可選 peerDependency）
    if (this.enabled) {
      this.loadBullmq()
    }
  }

  /**
   * 動態加載 bullmq 模組
   */
  private loadBullmq(): void {
    try {
      // 使用動態 require 讓 bullmq 成為可選依賴
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      // biome-ignore lint: Optional peer dependency
      const bullmq = require('bullmq') as any
      this.bullmqModule = bullmq
    } catch (error) {
      this.enabled = false
      this.bullmqLoadError = error instanceof Error ? error : new Error(String(error))
      console.warn(
        '[RetryScheduler] bullmq 模組未安裝，已禁用 Bull Queue 重試',
        this.bullmqLoadError.message
      )
    }
  }

  /**
   * 檢查排程器是否啟用
   */
  isEnabled(): boolean {
    return this.enabled && this.bullmqModule !== null
  }

  /**
   * 計算指數回退延遲時間
   *
   * @param retryCount 當前重試次數（從 0 開始）
   * @returns 延遲時間（毫秒）
   */
  private calculateDelay(retryCount: number): number {
    const baseDelay = this.config.initialDelayMs * this.config.backoffMultiplier ** retryCount
    return Math.min(baseDelay, this.config.maxDelayMs)
  }

  /**
   * 獲取或創建隊列
   *
   * @param eventName 事件名稱
   * @returns Queue 實例
   */
  private getOrCreateQueue(eventName: string): unknown {
    const queueName = `gravito:event:retries:${eventName}`

    if (this.queues.has(queueName)) {
      return this.queues.get(queueName)!
    }

    if (!this.bullmqModule) {
      throw new Error('bullmq 模組未加載')
    }

    const { Queue } = this.bullmqModule
    const connection = { url: this.config.redisUrl }

    const queue = new Queue(queueName, { connection })
    this.queues.set(queueName, queue)

    return queue
  }

  /**
   * 排程重試任務
   *
   * @param eventName 事件名稱
   * @param payload 事件負載
   * @param options 事件選項
   * @param error 原始錯誤
   * @param retryCount 當前重試次數
   */
  async scheduleRetry(
    eventName: string,
    payload: unknown,
    _options: EventOptions,
    error: Error,
    retryCount: number
  ): Promise<void> {
    if (!this.isEnabled()) {
      throw new Error('RetryScheduler 未啟用或 bullmq 模組不可用')
    }

    try {
      const queue = this.getOrCreateQueue(eventName)
      const delay = this.calculateDelay(retryCount)

      // 使用反射呼叫 add() 方法（因為 Queue 類型未導出）
      const addMethod = (queue as any).add
      if (typeof addMethod === 'function') {
        await addMethod.call(
          queue,
          'retry',
          { payload, error: error.message, retryCount },
          { delay }
        )
      }
    } catch (schedulerError) {
      const err =
        schedulerError instanceof Error ? schedulerError : new Error(String(schedulerError))
      console.error(`[RetryScheduler] 排程重試失敗: ${eventName}`, err)
      throw err
    }
  }

  /**
   * 獲取特定事件的隊列
   *
   * @param eventName 事件名稱
   * @returns Queue 實例或 undefined
   */
  getQueue(eventName: string): unknown {
    const queueName = `gravito:event:retries:${eventName}`
    return this.queues.get(queueName)
  }

  /**
   * 取得所有隊列統計
   */
  getStats(): Map<string, QueueStats> {
    const stats = new Map<string, QueueStats>()

    for (const [queueName, queue] of this.queues.entries()) {
      const queueObj = queue as any

      stats.set(queueName, {
        name: queueName,
        jobCounts: {
          waiting: queueObj.count?.waiting ?? 0,
          active: queueObj.count?.active ?? 0,
          delayed: queueObj.count?.delayed ?? 0,
          failed: queueObj.count?.failed ?? 0,
        },
        completedCount: queueObj.count?.completed ?? 0,
        failedCount: queueObj.count?.failed ?? 0,
      })
    }

    return stats
  }

  /**
   * 關閉所有隊列並清理資源
   */
  async shutdown(): Promise<void> {
    const closePromises: Promise<void>[] = []

    for (const queue of this.queues.values()) {
      const queueObj = queue as any
      if (typeof queueObj.close === 'function') {
        closePromises.push(queueObj.close())
      }
    }

    await Promise.all(closePromises)
    this.queues.clear()
  }
}
