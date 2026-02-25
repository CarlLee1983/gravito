import { EventEmitter } from 'node:events'
import type { ErrorRecoveryConfig, ErrorRecoveryState, KafkaCircuitState } from './types'

/**
 * 管理 Kafka 操作的錯誤恢復。
 *
 * 結合電路斷路器模式與指數退避，
 * 在持續失敗時保護系統，並在恢復後自動復原。
 *
 * 電路狀態機:
 * - CLOSED (正常) → OPEN (超過失敗閾值)
 * - OPEN → HALF_OPEN (重置逾時後)
 * - HALF_OPEN → CLOSED (探測成功)
 * - HALF_OPEN → OPEN (探測失敗)
 *
 * 事件:
 * - 'circuit:open' - 電路打開（失敗太多）
 * - 'circuit:half-open' - 允許探測
 * - 'circuit:closed' - 電路恢復
 * - 'recovery:backoff' - 進入退避期
 * - 'recovery:success' - 成功恢復
 *
 * @public
 */
export class ErrorRecoveryManager extends EventEmitter {
  private readonly failureThreshold: number
  private readonly resetTimeoutMs: number
  private readonly halfOpenMaxRequests: number
  private readonly initialBackoffMs: number
  private readonly maxBackoffMs: number
  private readonly backoffMultiplier: number
  private readonly jitter: boolean
  private readonly maxRetries: number

  private circuitState: KafkaCircuitState = 'CLOSED'
  private consecutiveFailures = 0
  private lastFailureTime = 0
  private totalRecoveries = 0
  private halfOpenRequests = 0
  private resetTimer: ReturnType<typeof setTimeout> | null = null

  constructor(config?: ErrorRecoveryConfig) {
    super()
    this.failureThreshold = config?.failureThreshold ?? 5
    this.resetTimeoutMs = config?.resetTimeoutMs ?? 30000
    this.halfOpenMaxRequests = config?.halfOpenMaxRequests ?? 1
    this.initialBackoffMs = config?.initialBackoffMs ?? 1000
    this.maxBackoffMs = config?.maxBackoffMs ?? 60000
    this.backoffMultiplier = config?.backoffMultiplier ?? 2
    this.jitter = config?.jitter ?? true
    this.maxRetries = config?.maxRetries ?? 10
  }

  /**
   * 記錄操作成功。
   *
   * 重置連續失敗計數，如果在 HALF_OPEN 狀態則轉換到 CLOSED。
   */
  recordSuccess(): void {
    if (this.circuitState === 'HALF_OPEN') {
      this.transitionTo('CLOSED')
      this.totalRecoveries++
      this.emit('recovery:success')
    }

    this.consecutiveFailures = 0
    this.halfOpenRequests = 0
  }

  /**
   * 記錄操作失敗。
   *
   * 增加失敗計數，在 CLOSED 狀態超過閾值時打開電路，
   * 在 HALF_OPEN 狀態失敗時重新打開電路。
   */
  recordFailure(error: Error): void {
    this.consecutiveFailures++
    this.lastFailureTime = Date.now()

    if (this.circuitState === 'HALF_OPEN') {
      this.transitionTo('OPEN')
      this.scheduleHalfOpen()
      return
    }

    if (this.circuitState === 'CLOSED' && this.consecutiveFailures >= this.failureThreshold) {
      this.transitionTo('OPEN')
      this.scheduleHalfOpen()
      this.emit('recovery:backoff', { error, delay: this.getBackoffDelay() })
    }
  }

  /**
   * 檢查是否可以繼續操作。
   *
   * - CLOSED: 總是允許
   * - OPEN: 不允許
   * - HALF_OPEN: 限制探測請求數量
   */
  canProceed(): boolean {
    if (this.circuitState === 'CLOSED') {
      return true
    }
    if (this.circuitState === 'OPEN') {
      return false
    }

    // HALF_OPEN: 限制探測請求
    if (this.halfOpenRequests < this.halfOpenMaxRequests) {
      this.halfOpenRequests++
      return true
    }
    return false
  }

  /**
   * 計算當前退避延遲。
   *
   * 使用指數退避: delay = min(initial * multiplier^attempt, maxBackoff)
   * 抖動: delay * (0.5 + random * 0.5)
   */
  getBackoffDelay(): number {
    const attempt = Math.min(this.consecutiveFailures, this.maxRetries)
    const exponentialDelay = this.initialBackoffMs * this.backoffMultiplier ** (attempt - 1)
    const clampedDelay = Math.min(exponentialDelay, this.maxBackoffMs)

    if (this.jitter) {
      return clampedDelay * (0.5 + Math.random() * 0.5)
    }

    return clampedDelay
  }

  /**
   * 等待退避期間。
   */
  async waitForBackoff(): Promise<void> {
    const delay = this.getBackoffDelay()
    await new Promise<void>((resolve) => setTimeout(resolve, delay))
  }

  /**
   * 返回當前錯誤恢復狀態快照（不可變）。
   */
  getState(): ErrorRecoveryState {
    return {
      circuitState: this.circuitState,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      currentBackoffMs: this.consecutiveFailures > 0 ? this.getBackoffDelay() : 0,
      totalRecoveries: this.totalRecoveries,
      isRecovering: this.circuitState !== 'CLOSED',
    }
  }

  /**
   * 強制重置為 CLOSED 狀態。
   */
  reset(): void {
    if (this.resetTimer !== null) {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
    }

    this.consecutiveFailures = 0
    this.lastFailureTime = 0
    this.halfOpenRequests = 0

    if (this.circuitState !== 'CLOSED') {
      this.transitionTo('CLOSED')
    }
  }

  /**
   * 清理所有計時器。
   */
  destroy(): void {
    if (this.resetTimer !== null) {
      clearTimeout(this.resetTimer)
      this.resetTimer = null
    }
    this.removeAllListeners()
  }

  /**
   * 檢查是否已達最大重試次數。
   */
  hasExceededMaxRetries(): boolean {
    return this.consecutiveFailures >= this.maxRetries
  }

  /**
   * 內部：執行狀態轉換並發射事件。
   */
  private transitionTo(newState: KafkaCircuitState): void {
    const previousState = this.circuitState
    this.circuitState = newState

    switch (newState) {
      case 'OPEN':
        this.emit('circuit:open', { previousState })
        break
      case 'HALF_OPEN':
        this.halfOpenRequests = 0
        this.emit('circuit:half-open', { previousState })
        break
      case 'CLOSED':
        this.emit('circuit:closed', { previousState })
        break
    }
  }

  /**
   * 內部：排程從 OPEN 到 HALF_OPEN 的轉換。
   */
  private scheduleHalfOpen(): void {
    if (this.resetTimer !== null) {
      clearTimeout(this.resetTimer)
    }

    this.resetTimer = setTimeout(() => {
      this.resetTimer = null
      if (this.circuitState === 'OPEN') {
        this.transitionTo('HALF_OPEN')
      }
    }, this.resetTimeoutMs)
  }
}
