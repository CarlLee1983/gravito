/**
 * Security Headers Middleware
 *
 * 設置安全相關的 HTTP 響應頭，防止常見攻擊
 */

import type { GravitoContext, GravitoNext } from '@gravito/core'

export interface SecurityHeadersConfig {
  enableHsts?: boolean
  enableContentSecurityPolicy?: boolean
  enableXFrameOptions?: boolean
  enableXContentTypeOptions?: boolean
  enableXXssProtection?: boolean
  enableReferrerPolicy?: boolean
}

/**
 * 安全頭中間件
 *
 * 設置以下安全頭：
 * - HSTS: 強制 HTTPS
 * - Content-Security-Policy: 防止 XSS
 * - X-Frame-Options: 防止點擊劫持
 * - X-Content-Type-Options: 防止 MIME 嗅探
 * - X-XSS-Protection: 瀏覽器 XSS 過濾
 * - Referrer-Policy: 控制 Referrer 信息
 *
 * @example
 * ```typescript
 * app.use(securityHeaders({
 *   enableHsts: true,
 *   enableContentSecurityPolicy: true,
 *   enableXFrameOptions: true,
 *   enableXContentTypeOptions: true,
 *   enableXXssProtection: true,
 *   enableReferrerPolicy: true
 * }))
 * ```
 */
export function securityHeaders(config: SecurityHeadersConfig = {}) {
  const {
    enableHsts = true,
    enableContentSecurityPolicy = true,
    enableXFrameOptions = true,
    enableXContentTypeOptions = true,
    enableXXssProtection = true,
    enableReferrerPolicy = true,
  } = config

  return async (ctx: GravitoContext, next: GravitoNext) => {
    // HSTS: 強制 HTTPS（30 天）
    if (enableHsts) {
      ctx.header('Strict-Transport-Security', 'max-age=2592000; includeSubDomains')
    }

    // Content-Security-Policy: 防止 XSS
    if (enableContentSecurityPolicy) {
      ctx.header(
        'Content-Security-Policy',
        "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline'; " +
          'img-src *; ' +
          "font-src 'self'; " +
          "connect-src 'self'; " +
          "frame-ancestors 'none'"
      )
    }

    // X-Frame-Options: 防止點擊劫持（ClickJacking）
    if (enableXFrameOptions) {
      ctx.header('X-Frame-Options', 'DENY')
    }

    // X-Content-Type-Options: 防止 MIME 嗅探
    if (enableXContentTypeOptions) {
      ctx.header('X-Content-Type-Options', 'nosniff')
    }

    // X-XSS-Protection: 啟用瀏覽器 XSS 過濾
    if (enableXXssProtection) {
      ctx.header('X-XSS-Protection', '1; mode=block')
    }

    // Referrer-Policy: 控制 Referrer 信息洩露
    if (enableReferrerPolicy) {
      ctx.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    }

    // 移除 Server header（隱藏伺服器信息）
    ctx.header('Server', 'GravitoAPI/1.0')

    // 禁用 MIME 類型猜測
    ctx.header('X-Content-Type-Options', 'nosniff')

    // 啟用 HTTPS
    ctx.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

    return await next()
  }
}

/**
 * CORS 頭中間件
 *
 * 配置跨域資源共享（CORS）
 *
 * @example
 * ```typescript
 * app.use(corsHeaders({
 *   origin: ['http://localhost:3000', 'https://example.com'],
 *   credentials: true,
 *   methods: ['GET', 'POST', 'PUT', 'DELETE'],
 *   allowedHeaders: ['Content-Type', 'Authorization']
 * }))
 * ```
 */
export interface CorsConfig {
  origin?: string | string[]
  credentials?: boolean
  methods?: string[]
  allowedHeaders?: string[]
  exposedHeaders?: string[]
  maxAge?: number
}

export function corsHeaders(config: CorsConfig = {}) {
  const {
    origin = '*',
    credentials = false,
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = ['X-Total-Count', 'X-Page-Number'],
    maxAge = 86400,
  } = config

  return async (ctx: GravitoContext, next: GravitoNext) => {
    const originHeader = ctx.req.header('Origin')
    const allowedOrigin = isOriginAllowed(originHeader || '', origin)

    if (allowedOrigin) {
      ctx.header('Access-Control-Allow-Origin', allowedOrigin)
    }

    if (credentials) {
      ctx.header('Access-Control-Allow-Credentials', 'true')
    }

    ctx.header('Access-Control-Allow-Methods', methods.join(', '))
    ctx.header('Access-Control-Allow-Headers', allowedHeaders.join(', '))

    if (exposedHeaders.length > 0) {
      ctx.header('Access-Control-Expose-Headers', exposedHeaders.join(', '))
    }

    ctx.header('Access-Control-Max-Age', maxAge.toString())

    // 處理 preflight 請求
    if (ctx.req.method === 'OPTIONS') {
      return ctx.text('OK')
    }

    return await next()
  }
}

/**
 * 檢查 origin 是否被允許
 */
function isOriginAllowed(origin: string, allowedOrigins: string | string[]): string | null {
  if (allowedOrigins === '*') {
    return origin || '*'
  }

  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins]
  return origins.includes(origin) ? origin : null
}

export default {
  securityHeaders,
  corsHeaders,
}
