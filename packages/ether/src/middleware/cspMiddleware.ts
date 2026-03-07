/**
 * @gravito/ether - CSP (Content Security Policy) Middleware
 *
 * 自動為 HTML 內容生成和注入 CSP nonce，並設定相應的 CSP header
 * 支援自訂 nonce 產生器和 CSP 指令
 */

import { createSecurityRule } from '../rules/SecurityRule'
import { etherMiddleware } from './etherMiddleware'

/**
 * CSP Middleware 配置選項
 */
export interface CSPMiddlewareOptions {
  /**
   * CSP 指令對應表
   * 鍵為 CSP 指令名稱，值為該指令的值
   * 值中可以使用 {nonce} 佔位符，會被替換為實際的 nonce 值
   *
   * 預設值:
   * ```
   * {
   *   'script-src': "'self' 'nonce-{nonce}'",
   *   'style-src': "'self' 'nonce-{nonce}'",
   *   'default-src': "'self'"
   * }
   * ```
   */
  readonly directives?: Record<string, string>

  /**
   * CSP Nonce 值產生器
   * 如果不提供，使用 crypto.randomUUID()
   */
  readonly nonceGenerator?: () => string

  /**
   * 調試模式
   * 啟用時會設定 Content-Security-Policy-Report-Only header
   * 用於開發中檢測 CSP 違規
   */
  readonly debug?: boolean

  /**
   * 報告 URI
   * 用於 Report-Only 模式下接收 CSP 違規報告
   * 預設: '/csp-report'
   */
  readonly reportUri?: string
}

/**
 * 建立 CSP Middleware
 *
 * 該中介軟體會：
 * 1. 為此次請求生成一個隨機 nonce 值
 * 2. 使用 etherMiddleware 將 nonce 注入到 HTML 的 script/style 標籤中
 * 3. 在回應 header 中設定 Content-Security-Policy header
 * 4. 可選：在開發模式設定 Content-Security-Policy-Report-Only header
 *
 * @param options - CSP 中介軟體配置選項
 * @returns Photon 中介軟體處理函式
 *
 * @example
 * ```typescript
 * import { Photon } from '@gravito/photon'
 * import { cspMiddleware } from '@gravito/ether'
 *
 * const app = new Photon()
 *
 * // 使用預設設定
 * app.use('*', cspMiddleware())
 *
 * // 使用自訂 CSP 指令
 * app.use('*', cspMiddleware({
 *   directives: {
 *     'script-src': "'self' 'nonce-{nonce}' https://cdn.example.com",
 *     'style-src': "'self' 'nonce-{nonce}' https://fonts.googleapis.com",
 *     'img-src': "'self' data: https:",
 *     'default-src': "'self'"
 *   },
 *   debug: process.env.NODE_ENV === 'development'
 * }))
 * ```
 *
 * @remarks
 * 在 HTML 中，script 和 style 標籤會自動添加 nonce 屬性：
 *
 * ```html
 * <!-- 轉換前 -->
 * <script>console.log('hello')</script>
 *
 * <!-- 轉換後 -->
 * <script nonce="abc-123-def-456">console.log('hello')</script>
 * ```
 */
export function cspMiddleware(options: CSPMiddlewareOptions = {}) {
  // 準備 CSP 配置
  const defaultDirectives = {
    'script-src': "'self' 'nonce-{nonce}'",
    'style-src': "'self' 'nonce-{nonce}'",
    'default-src': "'self'",
  }
  const cspDirectives = options.directives ?? defaultDirectives

  // Nonce 產生器
  const nonceGenerator = options.nonceGenerator ?? (() => crypto.randomUUID())

  // 報告 URI
  const reportUri = options.reportUri ?? '/csp-report'

  // 調試模式
  const debug = options.debug ?? false

  // 回傳中介軟體處理函式
  return async (c: any, next: any) => {
    // 為此次請求生成 nonce
    const nonce = nonceGenerator()

    // 建立安全規則，自動注入 nonce
    const securityRule = createSecurityRule({
      cspNonce: true,
      nonceValue: nonce,
    })

    // 執行 ether middleware（進行 HTML 轉換）
    const handler = etherMiddleware({
      rules: [securityRule],
      debug,
    })

    await handler(c, next)

    // 產生 CSP header 值
    const cspValue = Object.entries(cspDirectives)
      .map(([key, value]) => {
        // 替換 {nonce} 佔位符為實際的 nonce 值
        const directive = value.replace('{nonce}', nonce)
        return `${key} ${directive}`
      })
      .join('; ')

    // 設定 Content-Security-Policy header
    c.res.headers.set('Content-Security-Policy', cspValue)

    // 開發環境：設定 Report-Only 版本用於測試
    if (debug) {
      const reportOnlyValue = `${cspValue}; report-uri ${reportUri}`
      c.res.headers.set('Content-Security-Policy-Report-Only', reportOnlyValue)
    }
  }
}
