/**
 * @fileoverview Circuit Breaker Middleware for Photon
 *
 * 實作三態熔斷器（CLOSED/OPEN/HALF_OPEN）中間件，
 * 防止對下游服務的連鎖故障傳播。
 *
 * 狀態轉換：
 * - CLOSED → OPEN：失敗次數超過閾值
 * - OPEN → HALF_OPEN：超時後允許探測請求
 * - HALF_OPEN → CLOSED：探測請求成功
 * - HALF_OPEN → OPEN：探測請求失敗
 *
 * @module @gravito/photon/middleware/circuit-breaker
 * @since 1.0.0
 */

import type { Context, MiddlewareHandler, Next } from '@gravito/photon'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 熔斷器三態狀態
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerConfig {
  /**
   * 觸發熔斷的連續失敗次數閾值
   * @default 5
   */
  failureThreshold: number

  /**
   * 熔斷器從 OPEN 進入 HALF_OPEN 狀態前的等待時間（毫秒）
   * @default 30000 (30 秒)
   */
  resetTimeoutMs: number

  /**
   * HALF_OPEN 狀態下允許通過的最大請求數（探測請求）
   * @default 1
   */
  halfOpenMaxRequests?: number

  /**
   * 判斷請求是否失敗的函數
   * @default (res) => res.status >= 500
   */
  isFailure?: (response: Response) => boolean | Promise<boolean>

  /**
   * 熔斷器開路時的自定義處理器
   * @default (c) => c.json({ error: 'Service Unavailable', ... }, 503)
   */
  onOpen?: (c: Context, state: CircuitBreakerState) => Response | Promise<Response>

  /**
   * 熔斷器名稱（用於識別多個熔斷器實例）
   * @default 'default'
   */
  name?: string

  /**
   * 成功請求數閾值（HALF_OPEN 狀態下，達此數量後轉為 CLOSED）
   * @default 1
   */
  successThreshold?: number
}

export interface CircuitBreakerState {
  /** 當前熔斷器狀態 */
  state: CircuitState
  /** 連續失敗次數 */
  failureCount: number
  /** 連續成功次數（用於 HALF_OPEN 狀態） */
  successCount: number
  /** 最後一次失敗的時間戳（毫秒） */
  lastFailureTime: number
  /** HALF_OPEN 狀態下當前進行中的請求數 */
  halfOpenRequests: number
  /** 熔斷器名稱 */
  name: string
}

// ─────────────────────────────────────────────────────────────────────────────
// CircuitBreaker 核心類別
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 三態熔斷器狀態機
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime = 0
  private halfOpenRequests = 0

  private readonly failureThreshold: number
  private readonly resetTimeoutMs: number
  private readonly halfOpenMaxRequests: number
  private readonly successThreshold: number
  private readonly name: string

  constructor(config: CircuitBreakerConfig) {
    this.failureThreshold = config.failureThreshold
    this.resetTimeoutMs = config.resetTimeoutMs
    this.halfOpenMaxRequests = config.halfOpenMaxRequests ?? 1
    this.successThreshold = config.successThreshold ?? 1
    this.name = config.name ?? 'default'
  }

  /**
   * 取得當前熔斷器狀態快照
   */
  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenRequests: this.halfOpenRequests,
      name: this.name,
    }
  }

  /**
   * 判斷請求是否可以通過熔斷器
   * @returns true 表示允許通過，false 表示拒絕（熔斷器開路）
   */
  canRequest(): boolean {
    if (this.state === 'CLOSED') {
      return true
    }

    if (this.state === 'OPEN') {
      // 檢查是否應轉換至 HALF_OPEN
      const now = Date.now()
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.transitionToHalfOpen()
        return this.halfOpenRequests < this.halfOpenMaxRequests
      }
      return false
    }

    // HALF_OPEN 狀態：只允許有限數量的探測請求
    return this.halfOpenRequests < this.halfOpenMaxRequests
  }

  /**
   * 記錄請求開始（HALF_OPEN 狀態下增加計數器）
   */
  onRequestStart(): void {
    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequests++
    }
  }

  /**
   * 記錄請求成功
   */
  onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++
      this.halfOpenRequests = Math.max(0, this.halfOpenRequests - 1)
      if (this.successCount >= this.successThreshold) {
        this.transitionToClosed()
      }
    } else if (this.state === 'CLOSED') {
      // CLOSED 狀態成功不需特別處理（已在 CLOSED 狀態）
      this.failureCount = 0
    }
  }

  /**
   * 記錄請求失敗
   */
  onFailure(): void {
    this.lastFailureTime = Date.now()
    this.failureCount++

    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequests = Math.max(0, this.halfOpenRequests - 1)
      this.transitionToOpen()
    } else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      this.transitionToOpen()
    }
  }

  /**
   * 強制重置熔斷器至 CLOSED 狀態
   */
  reset(): void {
    this.transitionToClosed()
  }

  private transitionToOpen(): void {
    this.state = 'OPEN'
    this.successCount = 0
    this.halfOpenRequests = 0
  }

  private transitionToHalfOpen(): void {
    this.state = 'HALF_OPEN'
    this.successCount = 0
    this.halfOpenRequests = 0
  }

  private transitionToClosed(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.successCount = 0
    this.halfOpenRequests = 0
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 預設判斷失敗的函數：HTTP 5xx 狀態碼視為失敗
 */
const defaultIsFailure = (response: Response): boolean => response.status >= 500

/**
 * 預設熔斷器開路處理器
 */
const defaultOnOpen = (c: Context, state: CircuitBreakerState): Response => {
  return c.json(
    {
      error: 'Service Unavailable',
      message: 'Circuit breaker is open. Service temporarily unavailable.',
      circuitBreaker: {
        name: state.name,
        state: state.state,
        failureCount: state.failureCount,
      },
    },
    503
  )
}

/**
 * 建立 Circuit Breaker 中間件
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { circuitBreaker } from '@gravito/photon/middleware/circuit-breaker'
 *
 * const app = new Photon()
 *
 * // 基本用法
 * app.use('/api/*', circuitBreaker({
 *   failureThreshold: 5,
 *   resetTimeoutMs: 30000,
 * }))
 *
 * // 使用預設配置
 * import { circuitBreakerPresets } from '@gravito/photon/middleware/circuit-breaker'
 * app.use('/payment/*', circuitBreakerPresets.sensitive())
 * ```
 */
export function circuitBreaker(config: CircuitBreakerConfig): MiddlewareHandler {
  const { isFailure = defaultIsFailure, onOpen = defaultOnOpen } = config

  const breaker = new CircuitBreaker(config)

  return async (c: Context, next: Next): Promise<Response | undefined> => {
    // 檢查熔斷器是否允許請求通過
    if (!breaker.canRequest()) {
      return await onOpen(c, breaker.getState())
    }

    // 記錄請求開始（HALF_OPEN 計數器）
    breaker.onRequestStart()

    try {
      await next()

      // 取得回應並判斷是否為失敗
      const response = c.res
      if (response && (await isFailure(response.clone()))) {
        breaker.onFailure()
      } else {
        breaker.onSuccess()
      }
    } catch (error) {
      // 例外也視為失敗
      breaker.onFailure()
      throw error
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Presets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Circuit Breaker 預設配置集合
 */
export const circuitBreakerPresets = {
  /**
   * 敏感型：低閾值，適用於金融、支付等關鍵服務
   * - 失敗閾值：3 次
   * - 重置超時：60 秒
   * - 半開探測：1 個請求
   */
  sensitive: (overrides?: Partial<CircuitBreakerConfig>): MiddlewareHandler =>
    circuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 60000,
      halfOpenMaxRequests: 1,
      successThreshold: 1,
      name: 'sensitive',
      ...overrides,
    }),

  /**
   * 標準型：中等閾值，適用於一般 API 服務
   * - 失敗閾值：5 次
   * - 重置超時：30 秒
   * - 半開探測：2 個請求
   */
  standard: (overrides?: Partial<CircuitBreakerConfig>): MiddlewareHandler =>
    circuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      halfOpenMaxRequests: 2,
      successThreshold: 1,
      name: 'standard',
      ...overrides,
    }),

  /**
   * 韌性型：高閾值，適用於非關鍵服務或容錯要求高的場景
   * - 失敗閾值：10 次
   * - 重置超時：10 秒
   * - 半開探測：3 個請求
   */
  resilient: (overrides?: Partial<CircuitBreakerConfig>): MiddlewareHandler =>
    circuitBreaker({
      failureThreshold: 10,
      resetTimeoutMs: 10000,
      halfOpenMaxRequests: 3,
      successThreshold: 2,
      name: 'resilient',
      ...overrides,
    }),
}
