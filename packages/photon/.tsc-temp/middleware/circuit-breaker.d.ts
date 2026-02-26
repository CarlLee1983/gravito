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
import type { Context, MiddlewareHandler } from '@gravito/photon'
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
/**
 * 三態熔斷器狀態機
 */
export declare class CircuitBreaker {
  private state
  private failureCount
  private successCount
  private lastFailureTime
  private halfOpenRequests
  private readonly failureThreshold
  private readonly resetTimeoutMs
  private readonly halfOpenMaxRequests
  private readonly successThreshold
  private readonly name
  constructor(config: CircuitBreakerConfig)
  /**
   * 取得當前熔斷器狀態快照
   */
  getState(): CircuitBreakerState
  /**
   * 判斷請求是否可以通過熔斷器
   * @returns true 表示允許通過，false 表示拒絕（熔斷器開路）
   */
  canRequest(): boolean
  /**
   * 記錄請求開始（HALF_OPEN 狀態下增加計數器）
   */
  onRequestStart(): void
  /**
   * 記錄請求成功
   */
  onSuccess(): void
  /**
   * 記錄請求失敗
   */
  onFailure(): void
  /**
   * 強制重置熔斷器至 CLOSED 狀態
   */
  reset(): void
  private transitionToOpen
  private transitionToHalfOpen
  private transitionToClosed
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
export declare function circuitBreaker(config: CircuitBreakerConfig): MiddlewareHandler
/**
 * Circuit Breaker 預設配置集合
 */
export declare const circuitBreakerPresets: {
  /**
   * 敏感型：低閾值，適用於金融、支付等關鍵服務
   * - 失敗閾值：3 次
   * - 重置超時：60 秒
   * - 半開探測：1 個請求
   */
  sensitive: (overrides?: Partial<CircuitBreakerConfig>) => MiddlewareHandler
  /**
   * 標準型：中等閾值，適用於一般 API 服務
   * - 失敗閾值：5 次
   * - 重置超時：30 秒
   * - 半開探測：2 個請求
   */
  standard: (overrides?: Partial<CircuitBreakerConfig>) => MiddlewareHandler
  /**
   * 韌性型：高閾值，適用於非關鍵服務或容錯要求高的場景
   * - 失敗閾值：10 次
   * - 重置超時：10 秒
   * - 半開探測：3 個請求
   */
  resilient: (overrides?: Partial<CircuitBreakerConfig>) => MiddlewareHandler
}
