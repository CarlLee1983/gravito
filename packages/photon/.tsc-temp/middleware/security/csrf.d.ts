/**
 * @fileoverview CSRF Protection Middleware for Photon
 *
 * Cross-Site Request Forgery protection middleware migrated from @gravito/core.
 * This is the canonical location for CSRF middleware in the Gravito ecosystem.
 *
 * 注意：CookieJar 依賴移至使用 Hono 原生 context，cookie 解析改用內建實作
 *
 * @module @gravito/photon/middleware/security
 * @since 1.1.0
 */
import type { Context, MiddlewareHandler } from 'hono'
/**
 * Cookie 設定選項（從 @gravito/core CookieOptions 提取，避免循環依賴）
 * @public
 */
export type CsrfCookieOptions = {
  path?: string
  domain?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
  maxAge?: number
  expires?: Date
}
/**
 * Configuration for CSRF Protection
 * @public
 */
export type CsrfOptions = {
  cookieName?: string
  headerName?: string
  formFieldName?: string
  cookie?: CsrfCookieOptions
  safeMethods?: string[]
}
/**
 * Generate (or retrieve existing) CSRF token for the session.
 * @public
 */
export declare function getCsrfToken(c: Context, options?: CsrfOptions): string
/**
 * Middleware that validates CSRF tokens on unsafe requests.
 * @public
 */
export declare function csrfProtection(options?: CsrfOptions): MiddlewareHandler
