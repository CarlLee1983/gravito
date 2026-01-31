/**
 * Circuit Breaker Implementation
 *
 * 實作熔斷器模式，用於保護下游服務免於雪崩效應。
 * 當失敗率超過閾值時自動切斷請求，在一段時間後嘗試恢復。
 *
 * @module @gravito/echo/resilience
 * @since v1.1
 */

import type { CircuitBreakerConfig, CircuitBreakerMetrics, CircuitBreakerState } from '../types'

/**
 * 預設配置
 */
const DEFAULT_CONFIG: Required<CircuitBreakerConfig> = {
  enabled: true,
  failureThreshold: 5,
  successThreshold: 2,
  windowSize: 60000, // 1 minute
  openTimeout: 30000, // 30 seconds
  onOpen: () => {},
  onHalfOpen: () => {},
  onClose: () => {},
}

/**
 * Circuit Breaker 實作
 *
 * 狀態機：
 * - CLOSED: 正常運作，所有請求通過
 * - OPEN: 失敗過多，立即拒絕所有請求
 * - HALF_OPEN: 測試服務是否恢復，允許有限的請求
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker('api.example.com', {
 *   failureThreshold: 5,
 *   openTimeout: 30000,
 * })
 *
 * try {
 *   const result = await breaker.execute(async () => {
 *     return await fetch('https://api.example.com/data')
 *   })
 * } catch (error) {
 *   if (error.message.includes('Circuit breaker is OPEN')) {
 *     // 熔斷器已開啟，服務暫時不可用
 *   }
 * }
 * ```
 *
 * @public
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED'
  private failures = 0
  private successes = 0
  private lastFailureAt?: Date
  private lastSuccessAt?: Date
  private openedAt?: Date
  private halfOpenAttempts = 0

  private config: Required<CircuitBreakerConfig>

  constructor(
    private readonly name: string,
    config: CircuitBreakerConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 執行函式並提供熔斷器保護
   *
   * @param fn - 要執行的非同步函式
   * @returns 函式執行結果
   * @throws Error 當熔斷器處於 OPEN 狀態時
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return await fn()
    }

    this.checkStateTransition()

    if (this.state === 'OPEN') {
      throw new Error(`Circuit breaker is OPEN for ${this.name}`)
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * 記錄成功執行
   */
  private onSuccess(): void {
    this.lastSuccessAt = new Date()
    this.successes++

    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++
      if (this.halfOpenAttempts >= this.config.successThreshold) {
        this.transitionTo('CLOSED')
        this.reset()
      }
    } else if (this.state === 'CLOSED') {
      // 在 CLOSED 狀態下成功時重置失敗計數
      this.failures = 0
    }
  }

  /**
   * 記錄失敗執行
   */
  private onFailure(): void {
    this.lastFailureAt = new Date()
    this.failures++

    if (this.state === 'HALF_OPEN') {
      // HALF_OPEN 狀態下失敗立即轉為 OPEN
      this.transitionTo('OPEN')
      this.openedAt = new Date()
    } else if (this.state === 'CLOSED') {
      // CLOSED 狀態下達到失敗閾值轉為 OPEN
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo('OPEN')
        this.openedAt = new Date()
      }
    }
  }

  /**
   * 檢查是否應該從 OPEN 轉換到 HALF_OPEN
   */
  private checkStateTransition(): void {
    if (this.state === 'OPEN' && this.openedAt) {
      const elapsed = Date.now() - this.openedAt.getTime()
      if (elapsed >= this.config.openTimeout) {
        this.transitionTo('HALF_OPEN')
        this.halfOpenAttempts = 0
      }
    }

    // 時間窗口過期後重置失敗計數
    if (this.lastFailureAt) {
      const elapsed = Date.now() - this.lastFailureAt.getTime()
      if (elapsed >= this.config.windowSize) {
        this.failures = 0
      }
    }
  }

  /**
   * 轉換到新狀態並觸發回調
   */
  private transitionTo(newState: CircuitBreakerState): void {
    this.state = newState

    switch (newState) {
      case 'OPEN':
        this.config.onOpen(this.name)
        break
      case 'HALF_OPEN':
        this.config.onHalfOpen(this.name)
        break
      case 'CLOSED':
        this.config.onClose(this.name)
        break
    }
  }

  /**
   * 重置所有計數器
   */
  private reset(): void {
    this.failures = 0
    this.successes = 0
    this.halfOpenAttempts = 0
    this.openedAt = undefined
  }

  /**
   * 獲取當前指標
   *
   * @returns 熔斷器指標
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      openedAt: this.openedAt,
    }
  }

  /**
   * 手動重置熔斷器
   *
   * 強制將熔斷器轉換為 CLOSED 狀態並重置所有計數器。
   * 通常用於手動干預或系統恢復後。
   */
  manualReset(): void {
    this.transitionTo('CLOSED')
    this.reset()
  }

  /**
   * 獲取當前狀態
   */
  getState(): CircuitBreakerState {
    return this.state
  }

  /**
   * 獲取熔斷器名稱
   */
  getName(): string {
    return this.name
  }
}
