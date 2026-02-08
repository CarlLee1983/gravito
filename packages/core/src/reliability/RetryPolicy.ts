/**
 * @gravito/core - Retry Policy
 *
 * 重試策略和退避算法的實現
 * 支持指數和線性退避，包含 Jitter 防止雷鳴羊群
 */

/**
 * 重試策略配置接口
 *
 * @example
 * ```typescript
 * const policy: RetryPolicy = {
 *   maxRetries: 3,
 *   backoff: 'exponential',
 *   initialDelayMs: 1000,
 *   maxDelayMs: 30000,
 *   dlqAfterMaxRetries: true
 * }
 * ```
 */
export interface RetryPolicy {
  /** 最大重試次數 */
  maxRetries: number

  /** 退避策略：指數或線性 */
  backoff: 'exponential' | 'linear'

  /** 初始延遲時間（毫秒） */
  initialDelayMs: number

  /** 最大延遲時間（毫秒） */
  maxDelayMs: number

  /** 超過最大重試次數後是否發送到死信隊列 */
  dlqAfterMaxRetries?: boolean
}

/**
 * 重試引擎
 *
 * 負責計算重試延遲、判斷是否應該重試等邏輯
 *
 * @example
 * ```typescript
 * const engine = new RetryEngine()
 * const delay = engine.calculateDelay(1, policy)
 * const shouldRetry = engine.shouldRetry(3, policy)
 * ```
 */
export class RetryEngine {
  /**
   * 計算下次重試的延遲時間（毫秒）
   *
   * @param attemptCount - 當前嘗試次數（從 1 開始）
   * @param policy - 重試策略配置
   * @returns 延遲時間（毫秒）
   *
   * @description
   * - 指數退避：delay = initialDelay * 2^(attemptCount - 1)
   * - 線性退避：delay = initialDelay * attemptCount
   * - 添加隨機抖動（Jitter），防止雷鳴羊群問題
   * - 結果不超過 maxDelayMs
   *
   * @example
   * ```typescript
   * const policy: RetryPolicy = {
   *   maxRetries: 3,
   *   backoff: 'exponential',
   *   initialDelayMs: 1000,
   *   maxDelayMs: 30000
   * }
   *
   * // 第 1 次重試：1000ms * 2^0 = 1000ms (加抖動)
   * const delay1 = engine.calculateDelay(1, policy)  // ~1100ms
   *
   * // 第 2 次重試：1000ms * 2^1 = 2000ms (加抖動)
   * const delay2 = engine.calculateDelay(2, policy)  // ~2200ms
   *
   * // 第 3 次重試：1000ms * 2^2 = 4000ms (加抖動)
   * const delay3 = engine.calculateDelay(3, policy)  // ~4400ms
   * ```
   */
  calculateDelay(attemptCount: number, policy: RetryPolicy): number {
    const { backoff, initialDelayMs, maxDelayMs } = policy

    // 計算基礎延遲
    let delay: number

    if (backoff === 'exponential') {
      // 指數退避：delay = initialDelay * 2^(attemptCount - 1)
      // 確保 attemptCount >= 1
      const exponent = Math.max(0, attemptCount - 1)
      delay = initialDelayMs * 2 ** exponent
    } else {
      // 線性退避：delay = initialDelay * attemptCount
      delay = initialDelayMs * attemptCount
    }

    // 添加隨機抖動（Jitter），避免雷鳴羊群問題
    // 抖動範圍：0 到 delay 的 10%
    const jitter = Math.random() * delay * 0.1
    delay = delay + jitter

    // 限制最大延遲
    return Math.min(Math.ceil(delay), maxDelayMs)
  }

  /**
   * 判斷是否應該重試
   *
   * @param attemptCount - 當前嘗試次數（從 1 開始）
   * @param policy - 重試策略配置
   * @returns 是否應該重試
   *
   * @description
   * 當 attemptCount < maxRetries 時返回 true
   *
   * @example
   * ```typescript
   * const policy = { maxRetries: 3, ... }
   *
   * engine.shouldRetry(1, policy)  // true（1 < 3）
   * engine.shouldRetry(3, policy)  // false（3 >= 3）
   * engine.shouldRetry(4, policy)  // false（4 >= 3）
   * ```
   */
  shouldRetry(attemptCount: number, policy: RetryPolicy): boolean {
    return attemptCount < policy.maxRetries
  }

  /**
   * 獲取退避時間（包含延遲計算和 Jitter）
   *
   * @param retryCount - 重試次數（從 0 開始）
   * @param policy - 重試策略配置
   * @returns 退避時間（毫秒）
   *
   * @description
   * 這是 calculateDelay 的別名，但接收的是從 0 開始的重試計數
   *
   * @example
   * ```typescript
   * const policy = { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 30000, backoff: 'exponential' }
   *
   * // 第 0 次重試（第 1 次嘗試失敗）
   * const time1 = engine.getBackoffTime(0, policy)  // ~1100ms
   *
   * // 第 1 次重試（第 2 次嘗試失敗）
   * const time2 = engine.getBackoffTime(1, policy)  // ~2200ms
   * ```
   */
  getBackoffTime(retryCount: number, policy: RetryPolicy): number {
    // retryCount 從 0 開始，而 calculateDelay 使用 attemptCount 從 1 開始
    return this.calculateDelay(retryCount + 1, policy)
  }

  /**
   * 計算下次重試的絕對時間
   *
   * @param retryCount - 重試次數（從 0 開始）
   * @param policy - 重試策略配置
   * @param baseTime - 基礎時間戳（默認為當前時間）
   * @returns 下次重試的時間戳（毫秒）
   *
   * @example
   * ```typescript
   * const policy = { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 30000, backoff: 'exponential' }
   *
   * const now = Date.now()
   * const nextRetryTime = engine.getNextRetryTime(0, policy, now)
   * // 返回大約 now + 1000 + jitter
   * ```
   */
  getNextRetryTime(retryCount: number, policy: RetryPolicy, baseTime: number = Date.now()): number {
    const delay = this.getBackoffTime(retryCount, policy)
    return baseTime + delay
  }

  /**
   * 驗證重試策略配置
   *
   * @param policy - 重試策略配置
   * @returns 是否有效
   *
   * @description
   * 檢查配置是否合理：
   * - maxRetries >= 0
   * - initialDelayMs > 0
   * - maxDelayMs >= initialDelayMs
   *
   * @example
   * ```typescript
   * const validPolicy = { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 30000, backoff: 'exponential' }
   * engine.isValidPolicy(validPolicy)  // true
   *
   * const invalidPolicy = { maxRetries: 3, initialDelayMs: 5000, maxDelayMs: 1000, backoff: 'exponential' }
   * engine.isValidPolicy(invalidPolicy)  // false (maxDelayMs < initialDelayMs)
   * ```
   */
  isValidPolicy(policy: RetryPolicy): boolean {
    if (policy.maxRetries < 0) {
      return false
    }

    if (policy.initialDelayMs <= 0) {
      return false
    }

    if (policy.maxDelayMs < policy.initialDelayMs) {
      return false
    }

    if (!['exponential', 'linear'].includes(policy.backoff)) {
      return false
    }

    return true
  }

  /**
   * 獲取人類可讀的重試信息
   *
   * @param attemptCount - 當前嘗試次數（從 1 開始）
   * @param policy - 重試策略配置
   * @returns 描述性文本
   *
   * @example
   * ```typescript
   * const policy = { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 30000, backoff: 'exponential' }
   *
   * engine.getRetryInfo(1, policy)  // "Retry 1 of 3, will retry in ~1100ms"
   * engine.getRetryInfo(3, policy)  // "Retry 3 of 3 (final attempt), will retry in ~4400ms"
   * engine.getRetryInfo(4, policy)  // "Max retries exceeded (4 >= 3)"
   * ```
   */
  getRetryInfo(attemptCount: number, policy: RetryPolicy): string {
    if (attemptCount > policy.maxRetries) {
      return `Max retries exceeded (${attemptCount} > ${policy.maxRetries})`
    }

    if (!this.shouldRetry(attemptCount, policy)) {
      return `Max retries reached (${attemptCount} of ${policy.maxRetries})`
    }

    const delay = this.calculateDelay(attemptCount, policy)
    const isFinal = attemptCount === policy.maxRetries - 1
    const finalNote = isFinal ? ' (final attempt)' : ''

    return `Retry ${attemptCount} of ${policy.maxRetries}${finalNote}, will retry in ~${delay}ms`
  }
}

/**
 * 創建默認的重試策略
 *
 * @returns 默認重試策略
 *
 * @description
 * 默認配置：
 * - 最多重試 3 次
 * - 指數退避
 * - 初始延遲 1 秒
 * - 最大延遲 30 秒
 * - 超過最大重試後發送 DLQ
 *
 * @example
 * ```typescript
 * const policy = getDefaultRetryPolicy()
 * // { maxRetries: 3, backoff: 'exponential', initialDelayMs: 1000, maxDelayMs: 30000, dlqAfterMaxRetries: true }
 * ```
 */
export function getDefaultRetryPolicy(): RetryPolicy {
  return {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    dlqAfterMaxRetries: true,
  }
}

/**
 * 為不同類型的操作獲取預設的重試策略
 *
 * @param type - 操作類型
 * @returns 推薦的重試策略
 *
 * @example
 * ```typescript
 * // 外部 API 調用：更多重試，更長延遲
 * const apiPolicy = getPresetRetryPolicy('external-api')
 *
 * // 數據庫操作：較少重試，短延遲
 * const dbPolicy = getPresetRetryPolicy('database')
 *
 * // 消息隊列：適中重試
 * const mqPolicy = getPresetRetryPolicy('message-queue')
 * ```
 */
export function getPresetRetryPolicy(
  type: 'external-api' | 'database' | 'message-queue' | 'default'
): RetryPolicy {
  switch (type) {
    case 'external-api':
      // 外部 API 調用：更多重試，更長延遲
      return {
        maxRetries: 5,
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 60000,
        dlqAfterMaxRetries: true,
      }

    case 'database':
      // 數據庫操作：較少重試，短延遲
      return {
        maxRetries: 2,
        backoff: 'linear',
        initialDelayMs: 100,
        maxDelayMs: 1000,
        dlqAfterMaxRetries: false,
      }

    case 'message-queue':
      // 消息隊列：適中重試，指數退避
      return {
        maxRetries: 3,
        backoff: 'exponential',
        initialDelayMs: 500,
        maxDelayMs: 15000,
        dlqAfterMaxRetries: true,
      }
    default:
      return getDefaultRetryPolicy()
  }
}
