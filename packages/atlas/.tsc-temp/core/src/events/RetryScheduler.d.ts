/**
 * @gravito/core - Retry Scheduler
 *
 * 分佈式重試排程器，使用 Bull Queue 進行異步延遲重試。
 * 支援指數回退、Redis 持久化、重試失敗回呼。
 *
 * Distributed retry scheduler using Bull Queue for async delayed retries.
 * Supports exponential backoff, Redis persistence, and failure callbacks.
 */
import type { EventOptions } from './EventOptions'
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
  jobCounts: {
    waiting: number
    active: number
    delayed: number
    failed: number
  }
  completedCount: number
  failedCount: number
}
/**
 * 重試排程器
 *
 * 提供異步分佈式重試機制，利用 Bull Queue 進行延遲重試。
 * 支援指數回退、Redis 持久化、隊列統計。
 */
export declare class RetryScheduler {
  private enabled
  private config
  private queues
  private bullmqModule
  private bullmqLoadError
  constructor(config?: RetrySchedulerConfig)
  /**
   * 動態加載 bullmq 模組
   */
  private loadBullmq
  /**
   * 檢查排程器是否啟用
   */
  isEnabled(): boolean
  /**
   * 計算指數回退延遲時間
   *
   * @param retryCount 當前重試次數（從 0 開始）
   * @returns 延遲時間（毫秒）
   */
  private calculateDelay
  /**
   * 獲取或創建隊列
   *
   * @param eventName 事件名稱
   * @returns Queue 實例
   */
  private getOrCreateQueue
  /**
   * 排程重試任務
   *
   * @param eventName 事件名稱
   * @param payload 事件負載
   * @param options 事件選項
   * @param error 原始錯誤
   * @param retryCount 當前重試次數
   */
  scheduleRetry(
    eventName: string,
    payload: unknown,
    _options: EventOptions,
    error: Error,
    retryCount: number
  ): Promise<void>
  /**
   * 獲取特定事件的隊列
   *
   * @param eventName 事件名稱
   * @returns Queue 實例或 undefined
   */
  getQueue(eventName: string): unknown
  /**
   * 取得所有隊列統計
   */
  getStats(): Map<string, QueueStats>
  /**
   * 關閉所有隊列並清理資源
   */
  shutdown(): Promise<void>
}
