/**
 * @gravito/core - Event System Backpressure Management
 *
 * Implements a backpressure management system to prevent high-priority events
 * from starving low-priority events when the queue is under resource constraints.
 *
 * 背壓管理器：在資源受限時進行智慧型流量控制，防止優先級飢餓。
 */

/**
 * 背壓狀態枚舉。
 *
 * 狀態轉換：Normal → Warning → Critical → Overflow
 * 恢復方向：遲滯設計（需降至觸發閾值的 80%）
 *
 * @public
 */
export enum BackpressureState {
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

  /** OVERFLOW 時的 DLQ 路由回呼 */
  onOverflowRejection?: (eventName: string, priority: string) => void | Promise<void>

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
  depthByPriority: { high: number; normal: number; low: number }
  enqueueRate: number
  rejectedCount: number
  degradedCount: number
  stateTransitions: number
}

/**
 * 預設背壓配置。
 */
const DEFAULT_BACKPRESSURE_CONFIG = {
  enabled: true,
  maxQueueSize: Number.POSITIVE_INFINITY,
  maxSizeByPriority: {
    high: Number.POSITIVE_INFINITY,
    normal: Number.POSITIVE_INFINITY,
    low: Number.POSITIVE_INFINITY,
  },
  maxEnqueueRate: Number.POSITIVE_INFINITY,
  rateLimitWindowMs: 1000,
  thresholds: { warning: 0.6, critical: 0.85, overflow: 1.0 } as Required<
    NonNullable<BackpressureConfig['thresholds']>
  >,
  rejectionPolicy: 'drop-with-callback' as const,
  lowPriorityDelayMs: 100,
  enableStarvationProtection: true,
  starvationTimeoutMs: 5000,
  dlqOnOverflow: false,
  onOverflowRejection: undefined,
  overflowRetryStrategy: 'dlq-only' as const,
  overflowRetryDelayMs: 5000,
}

/**
 * 滑動視窗速率計數器。
 *
 * 使用環形緩衝區記錄固定時間窗內的事件計數。
 * 計算滑動窗口內的事件速率（events/sec）。
 */
class SlidingWindowCounter {
  private readonly windowMs: number
  private readonly bucketMs: number
  private readonly buckets: number[]
  private currentBucketIndex: number
  private lastBucketTime: number

  constructor(windowMs = 1000, bucketCount = 10) {
    this.windowMs = windowMs
    this.bucketMs = windowMs / bucketCount
    this.buckets = new Array(bucketCount).fill(0)
    this.currentBucketIndex = 0
    this.lastBucketTime = Date.now()
  }

  /**
   * 記錄一個事件。
   */
  increment(): void {
    const now = Date.now()
    const timePassed = now - this.lastBucketTime

    // 推進到當前時間桶
    const bucketsToAdvance = Math.floor(timePassed / this.bucketMs)
    if (bucketsToAdvance > 0) {
      for (let i = 0; i < Math.min(bucketsToAdvance, this.buckets.length); i++) {
        this.currentBucketIndex = (this.currentBucketIndex + 1) % this.buckets.length
        this.buckets[this.currentBucketIndex] = 0
      }
      this.lastBucketTime = now
    }

    // 增加當前桶的計數
    this.buckets[this.currentBucketIndex]++
  }

  /**
   * 獲取當前滑動視窗的速率（events/sec）。
   */
  getRate(): number {
    const now = Date.now()
    const timePassed = now - this.lastBucketTime

    // Note: timePassed could be used to advance buckets if needed
    // For now, we just calculate the current rate from existing buckets
    void timePassed // Intentionally unused
    let totalCount = 0
    for (let i = 0; i < this.buckets.length; i++) {
      totalCount += this.buckets[i]
    }

    return (totalCount / this.windowMs) * 1000 // 轉換為 events/sec
  }

  /**
   * 重置計數器。
   */
  reset(): void {
    this.buckets.fill(0)
    this.currentBucketIndex = 0
    this.lastBucketTime = Date.now()
  }
}

/**
 * 背壓管理器。
 *
 * 根據隊列深度、速率、優先級等因素，決定是否允許新事件入隊，
 * 以及是否需要降級優先級或延遲入隊。
 *
 * @public
 */
export class BackpressureManager {
  private enabled: boolean
  private config: Omit<
    Required<BackpressureConfig>,
    'onRejected' | 'onStateChange' | 'onOverflowRejection'
  > & {
    dlqOnOverflow: boolean
  }
  private onRejected?: BackpressureConfig['onRejected']
  private onStateChange?: BackpressureConfig['onStateChange']
  private onOverflowRejection?: BackpressureConfig['onOverflowRejection']

  private state: BackpressureState = BackpressureState.NORMAL
  private rejectedCount = 0
  private degradedCount = 0
  private stateTransitions = 0
  private rateCounter: SlidingWindowCounter

  constructor(config: BackpressureConfig = {}) {
    this.enabled = config.enabled !== false
    this.config = {
      enabled: config.enabled ?? DEFAULT_BACKPRESSURE_CONFIG.enabled,
      maxQueueSize: config.maxQueueSize ?? DEFAULT_BACKPRESSURE_CONFIG.maxQueueSize,
      maxSizeByPriority: {
        ...DEFAULT_BACKPRESSURE_CONFIG.maxSizeByPriority,
        ...config.maxSizeByPriority,
      },
      maxEnqueueRate: config.maxEnqueueRate ?? DEFAULT_BACKPRESSURE_CONFIG.maxEnqueueRate,
      rateLimitWindowMs: config.rateLimitWindowMs ?? DEFAULT_BACKPRESSURE_CONFIG.rateLimitWindowMs,
      thresholds: { ...DEFAULT_BACKPRESSURE_CONFIG.thresholds, ...config.thresholds },
      rejectionPolicy: (config.rejectionPolicy ?? DEFAULT_BACKPRESSURE_CONFIG.rejectionPolicy) as
        | 'throw'
        | 'drop-silent'
        | 'drop-with-callback',
      lowPriorityDelayMs:
        config.lowPriorityDelayMs ?? DEFAULT_BACKPRESSURE_CONFIG.lowPriorityDelayMs,
      enableStarvationProtection:
        config.enableStarvationProtection ?? DEFAULT_BACKPRESSURE_CONFIG.enableStarvationProtection,
      starvationTimeoutMs:
        config.starvationTimeoutMs ?? DEFAULT_BACKPRESSURE_CONFIG.starvationTimeoutMs,
      dlqOnOverflow: config.dlqOnOverflow ?? DEFAULT_BACKPRESSURE_CONFIG.dlqOnOverflow,
      overflowRetryStrategy: (config.overflowRetryStrategy ??
        DEFAULT_BACKPRESSURE_CONFIG.overflowRetryStrategy) as 'immediate' | 'delayed' | 'dlq-only',
      overflowRetryDelayMs:
        config.overflowRetryDelayMs ?? DEFAULT_BACKPRESSURE_CONFIG.overflowRetryDelayMs,
    }
    this.onRejected = config.onRejected
    this.onStateChange = config.onStateChange
    this.onOverflowRejection = config.onOverflowRejection
    this.rateCounter = new SlidingWindowCounter(this.config.rateLimitWindowMs, 10)
  }

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
    priority: 'high' | 'normal' | 'low',
    queueDepth: number,
    depthByPriority: { high: number; normal: number; low: number }
  ): BackpressureDecision {
    if (!this.enabled) {
      return { allowed: true }
    }

    // 更新速率計數器
    this.rateCounter.increment()

    // 重新計算背壓狀態
    this.updateState(queueDepth)

    // 檢查分優先級深度限制
    const maxSizeForPriority = this.config.maxSizeByPriority[priority] ?? Number.POSITIVE_INFINITY
    if (depthByPriority[priority] >= maxSizeForPriority) {
      return this.createDecision(false, `Priority queue full for ${priority}`, eventName, priority)
    }

    // 根據狀態進行決策
    switch (this.state) {
      case BackpressureState.OVERFLOW:
        return {
          ...this.createDecision(false, 'Backpressure OVERFLOW', eventName, priority),
          isOverflow: true,
          retryStrategy: this.config.overflowRetryStrategy,
          delayMs:
            this.config.overflowRetryStrategy === 'delayed'
              ? this.config.overflowRetryDelayMs
              : undefined,
        }

      case BackpressureState.CRITICAL:
        // 僅允許高優先級
        if (priority === 'high') {
          return { allowed: true }
        }
        if (priority === 'normal') {
          return { allowed: true, delayed: true, delayMs: this.config.lowPriorityDelayMs }
        }
        return this.createDecision(false, 'Backpressure CRITICAL', eventName, priority)

      case BackpressureState.WARNING:
        // 低優先級延遲或拒絕
        if (priority === 'low') {
          // 檢查速率
          const rate = this.rateCounter.getRate()
          if (rate > this.config.maxEnqueueRate) {
            return this.createDecision(false, 'Rate limit exceeded', eventName, priority)
          }
          return { allowed: true, delayed: true, delayMs: this.config.lowPriorityDelayMs }
        }
        break
      default: {
        // 檢查速率限制
        const rate = this.rateCounter.getRate()
        if (rate > this.config.maxEnqueueRate) {
          if (priority === 'low') {
            return this.createDecision(false, 'Rate limit exceeded', eventName, priority)
          }
          if (priority === 'normal') {
            return { allowed: true, delayed: true, delayMs: this.config.lowPriorityDelayMs }
          }
        }
        return { allowed: true }
      }
    }

    return { allowed: true }
  }

  /**
   * 獲取當前背壓狀態。
   */
  getState(): BackpressureState {
    return this.state
  }

  /**
   * 獲取背壓指標快照。
   */
  getMetrics(): BackpressureMetricsSnapshot {
    return {
      state: this.state,
      totalDepth: 0, // 需由呼叫者提供
      depthByPriority: { high: 0, normal: 0, low: 0 }, // 需由呼叫者提供
      enqueueRate: this.rateCounter.getRate(),
      rejectedCount: this.rejectedCount,
      degradedCount: this.degradedCount,
      stateTransitions: this.stateTransitions,
    }
  }

  /**
   * 重置背壓管理器狀態。
   */
  reset(): void {
    this.state = BackpressureState.NORMAL
    this.rejectedCount = 0
    this.degradedCount = 0
    this.stateTransitions = 0
    this.rateCounter.reset()
  }

  /**
   * 更新背壓狀態。
   * 使用遲滯設計（80% 回復比例）避免邊界震盪。
   */
  private updateState(totalDepth: number): void {
    if (this.config.maxQueueSize === Number.POSITIVE_INFINITY) {
      return // 無限隊列，不進行狀態管理
    }

    const depthRatio = totalDepth / this.config.maxQueueSize
    const warning = this.config.thresholds?.warning ?? 0.6
    const critical = this.config.thresholds?.critical ?? 0.85
    const overflow = this.config.thresholds?.overflow ?? 1.0
    const hysteresisRatio = 0.8 // 80% 回復比例

    let newState = this.state

    // 升級路徑：總是立即升級（無遲滯）
    if (depthRatio >= overflow) {
      newState = BackpressureState.OVERFLOW
    } else if (depthRatio >= critical) {
      newState = BackpressureState.CRITICAL
    } else if (depthRatio >= warning) {
      // 在 warning 到 critical 之間
      // 檢查是否應該從 CRITICAL 或更高級別降級
      if (depthRatio < critical * hysteresisRatio && this.state === BackpressureState.CRITICAL) {
        // 從 CRITICAL 降級到 WARNING
        newState = BackpressureState.WARNING
      } else if (
        depthRatio < overflow * hysteresisRatio &&
        this.state === BackpressureState.OVERFLOW
      ) {
        // 從 OVERFLOW 降級到 CRITICAL
        newState = BackpressureState.CRITICAL
      } else if (this.state === BackpressureState.NORMAL) {
        // 從 NORMAL 升級到 WARNING
        newState = BackpressureState.WARNING
      }
      // 否則保持當前狀態（WARNING、CRITICAL、OVERFLOW 保持）
    } else {
      // depthRatio < warning，檢查進一步降級（遲滯設計）
      if (this.state === BackpressureState.WARNING && depthRatio < warning * hysteresisRatio) {
        newState = BackpressureState.NORMAL
      } else if (
        this.state === BackpressureState.CRITICAL &&
        depthRatio < critical * hysteresisRatio
      ) {
        newState = BackpressureState.WARNING
      } else if (
        this.state === BackpressureState.OVERFLOW &&
        depthRatio < overflow * hysteresisRatio
      ) {
        newState = BackpressureState.CRITICAL
      }
      // 否則保持當前狀態
    }

    if (newState !== this.state) {
      this.transitionTo(newState)
    }
  }

  /**
   * 執行狀態轉換。
   */
  private transitionTo(newState: BackpressureState): void {
    const oldState = this.state
    this.state = newState
    this.stateTransitions++

    if (this.onStateChange) {
      this.onStateChange(oldState, newState)
    }
  }

  /**
   * 建立決策結果並記錄拒絕。
   */
  private createDecision(
    allowed: boolean,
    reason: string,
    eventName: string,
    priority: string
  ): BackpressureDecision {
    if (!allowed) {
      this.rejectedCount++
      if (this.onRejected) {
        this.onRejected(eventName, priority, reason)
      }
    }
    return { allowed, reason }
  }
}
