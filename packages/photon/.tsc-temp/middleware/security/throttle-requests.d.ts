/**
 * @fileoverview Throttle Requests Middleware for Photon
 *
 * Rate limiting middleware migrated from @gravito/core.
 * API 重構：類別基底（需 PlanetCore 注入）→ 函數基底（配置注入）
 *
 * 原始設計使用 `new ThrottleRequests(core).handle(max, decay)` 模式，
 * 需要 PlanetCore 容器提供 logger 和 config。
 * 新設計使用 `throttleRequests(options)` 函數模式，
 * 透過選項物件直接注入配置，不依賴 IoC 容器。
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 */
import type { MiddlewareHandler } from 'hono'
/**
 * Options for throttle requests middleware
 * @public
 */
export type ThrottleRequestsOptions = {
  /** Max requests allowed in the time window. @default 60 */
  maxAttempts?: number
  /** Time window in seconds. @default 60 */
  decaySeconds?: number
  /** Whether to trust X-Forwarded-For header for IP. @default false */
  trustProxy?: boolean
  /**
   * Custom logger warning callback.
   * Called when cache service is not available.
   * @default console.warn
   */
  onMissingCache?: (message: string) => void
}
/**
 * Rate limiting middleware using Orbit Cache context variable.
 * Requires a CacheService to be bound to `c.get('cache')` by an upstream middleware.
 *
 * @example
 * ```typescript
 * // 基本用法
 * app.use('*', throttleRequests())
 *
 * // 自訂配置
 * app.use('/api/*', throttleRequests({
 *   maxAttempts: 100,
 *   decaySeconds: 60,
 *   trustProxy: true,
 * }))
 * ```
 * @public
 */
export declare function throttleRequests(options?: ThrottleRequestsOptions): MiddlewareHandler
