/**
 * @gravito/core - Event System Backpressure Management
 *
 * Implements a backpressure management system to prevent high-priority events
 * from starving low-priority events when the queue is under resource constraints.
 *
 * 背壓管理器：在資源受限時進行智慧型流量控制，防止優先級飢餓。
 *
 * FS-103 增強：
 * - 多優先級隊列深度監控
 * - 背壓反饋迴路支持
 * - 智能 DLQ 路由決策
 */
import type { DeadLetterDecision, MultiPriorityQueueDepth } from './types'
/**
 * 背壓狀態枚舉。
 *
 * 狀態轉換：Normal → Warning → Critical → Overflow
 * 恢復方向：遲滯設計（需降至觸發閾值的 80%）
 *
 * @public
 */
export declare enum BackpressureState {
  /** 正常運作，無背壓 */
  NORMAL = 'NORMAL',
  /** 警告狀態，開始限制低優先級事件 */
  WARNING = 'WARNING',
  /** 危急狀態，僅允許高優先級事件 */
  CRITICAL = 'CRITICAL',
  /** 溢位狀態，全部拒絕 */
  OVERFLOW = 'OVERFLOW',
}
/**
 * 背壓配置選項。
 *
 * @public
 */
export interface BackpressureConfig {
  /** 是否啟用背壓管理器（預設 true） */
  enabled?: boolean
  /** 總隊列深度限制（預設無限） */
  maxQueueSize?: number
  /** 分優先級隊列深度限制 */
  maxSizeByPriority?: {
    critical?: number
    high?: number
    normal?: number
    low?: number
  }
  /** 每秒最大入隊速率（events/sec，預設無限） */
  maxEnqueueRate?: number
  /** 速率限制滑動視窗大小（ms，預設 1000） */
  rateLimitWindowMs?: number
  /** 背壓狀態閾值（佔 maxQueueSize 的百分比） */
  thresholds?: {
    /** WARNING 觸發百分比（預設 0.6 = 60%） */
    warning?: number
    /** CRITICAL 觸發百分比（預設 0.85 = 85%） */
    critical?: number
    /** OVERFLOW 觸發百分比（預設 1.0 = 100%） */
    overflow?: number
  }
  /** 被拒絕事件的處理策略（預設 'drop-with-callback'） */
  rejectionPolicy?: 'throw' | 'drop-silent' | 'drop-with-callback'
  /** 當 rejectionPolicy 為 'drop-with-callback' 時的回呼 */
  onRejected?: (eventName: string, priority: string, reason: string) => void
  /** 背壓狀態變更回呼 */
  onStateChange?: (from: BackpressureState, to: BackpressureState) => void
  /** 低優先級事件在 WARNING 狀態下的延遲入隊時間（ms，預設 100） */
  lowPriorityDelayMs?: number
  /** 是否啟用優先級反轉防護（預設 true） */
  enableStarvationProtection?: boolean
  /** 低優先級事件最大等待時間，超過則提升優先級（ms，預設 5000） */
  starvationTimeoutMs?: number
  /** 當進入 OVERFLOW 狀態時，是否將被拒絕事件路由到 DLQ（預設 false） */
  dlqOnOverflow?: boolean
  /** OVERFLOW 時的重試策略（預設 'dlq-only'） */
  overflowRetryStrategy?: 'immediate' | 'delayed' | 'dlq-only'
  /** OVERFLOW 延遲重試的基礎延遲時間（ms，預設 5000） */
  overflowRetryDelayMs?: number
}
/**
 * 背壓決策結果。
 *
 * @public
 */
export interface BackpressureDecision {
  /** 是否允許入隊 */
  allowed: boolean
  /** 拒絕原因（若不允許） */
  reason?: string
  /** 是否需要延遲入隊 */
  delayed?: boolean
  /** 延遲時間（ms） */
  delayMs?: number
  /** 建議降級後的優先級（若降級） */
  degradedPriority?: 'high' | 'normal' | 'low'
  /** 是否是由於 OVERFLOW 狀態被拒絕 */
  isOverflow?: boolean
  /** OVERFLOW 時的重試策略建議（'immediate'、'delayed'、'dlq-only'） */
  retryStrategy?: 'immediate' | 'delayed' | 'dlq-only'
}
/**
 * 背壓指標快照。
 *
 * @public
 */
export interface BackpressureMetricsSnapshot {
  state: BackpressureState
  totalDepth: number
  depthByPriority: {
    critical: number
    high: number
    normal: number
    low: number
  }
  enqueueRate: number
  rejectedCount: number
  degradedCount: number
  stateTransitions: number
  dlqRouteCount?: number
  windowAdjustmentCount?: number
}
/**
 * 背壓管理器。
 *
 * 根據隊列深度、速率、優先級等因素，決定是否允許新事件入隊，
 * 以及是否需要降級優先級或延遲入隊。
 *
 * @public
 */
export declare class BackpressureManager {
  private enabled
  private config
  private onRejected?
  private onStateChange?
  private state
  private rejectedCount
  private degradedCount
  private stateTransitions
  private rateCounter
  private depthByPriority
  private windowAdjustmentHistory
  private dlqRouteCount
  constructor(config?: BackpressureConfig)
  /**
   * 評估是否允許新事件入隊。
   *
   * @param eventName 事件名稱
   * @param priority 事件優先級
   * @param queueDepth 當前隊列深度
   * @param depthByPriority 分優先級隊列深度
   * @returns 背壓決策結果
   */
  evaluate(
    eventName: string,
    priority: 'critical' | 'high' | 'normal' | 'low',
    queueDepth: number,
    depthByPriority: {
      critical: number
      high: number
      normal: number
      low: number
    }
  ): BackpressureDecision
  /**
   * 獲取當前背壓狀態。
   */
  getState(): BackpressureState
  /**
   * 獲取背壓指標快照。
   */
  getMetrics(): BackpressureMetricsSnapshot
  /**
   * 重置背壓管理器狀態。
   */
  reset(): void
  /**
   * 同步隊列深度（由 EventPriorityQueue 調用）。
   * FS-103：多優先級隊列深度監控
   */
  updateQueueDepth(depths: MultiPriorityQueueDepth): void
  /**
   * 獲取各優先級的隊列深度。
   * FS-103：提供實時隊列深度快照
   */
  getQueueDepthByPriority(): MultiPriorityQueueDepth
  /**
   * 獲取總隊列深度。
   */
  getTotalQueueDepth(): number
  /**
   * 接收來自 AggregationWindow 的窗口調整通知。
   * FS-103：背壓反饋迴路
   */
  notifyWindowAdjustment(oldWindowMs: number, newWindowMs: number): void
  /**
   * 檢查是否可以從 CRITICAL 或更高級別降級。
   * FS-103：自動狀態恢復機制
   */
  private checkStateRecovery
  /**
   * 決定是否應該將事件路由到死信隊列。
   * FS-103：智能 DLQ 路由決策
   */
  makeDeadLetterDecision(
    _eventName: string,
    priority: 'critical' | 'high' | 'normal' | 'low'
  ): DeadLetterDecision
  /**
   * 更新背壓狀態。
   * 使用遲滯設計（80% 回復比例）避免邊界震盪。
   */
  private updateState
  /**
   * 執行狀態轉換。
   */
  private transitionTo
  /**
   * 建立決策結果並記錄拒絕。
   */
  private createDecision
}
