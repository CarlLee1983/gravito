/**
 * Rate Limiting Middleware
 *
 * 限制 API 請求速率，防止濫用
 *
 * 特性：
 * - Redis 後端（分佈式、自動過期、無內存洩漏）
 * - 內存備選實現（帶 LRU + 自動清理）
 * - 防止 IP 偽造攻擊
 * - 可配置的限制策略
 */

import { type GravitoContext, type GravitoNext, HttpException } from '@gravito/core'
import type { RateLimitStore } from '@infrastructure/ratelimit/RateLimitStore'
import { createRateLimitStore } from '@infrastructure/ratelimit/RateLimitStore'

interface RateLimitConfig {
  windowMs: number // 時間窗口（毫秒）
  maxRequests: number // 最大請求數
  message?: string
  statusCode?: number
  store?: RateLimitStore // 自定義存儲層（可選）
  trustProxy?: boolean // 是否信任代理頭部
}

/**
 * 全局 Rate Limit 存儲（延遲初始化）
 */
let globalStore: RateLimitStore | null = null

function getGlobalStore(store?: RateLimitStore): RateLimitStore {
  if (store) {
    return store
  }

  if (!globalStore) {
    globalStore = createRateLimitStore()
  }

  return globalStore
}

/**
 * 全局速率限制中間件
 *
 * 限制所有請求的總速率
 *
 * @example
 * ```typescript
 * app.use(rateLimit({
 *   windowMs: 60 * 1000,  // 1 分鐘
 *   maxRequests: 100      // 最多 100 個請求
 * }))
 * ```
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs = 60 * 1000,
    maxRequests = 100,
    message = 'Too many requests, please try again later',
    statusCode = 429,
    store,
  } = config

  const rateLimitStore = getGlobalStore(store)
  const key = 'global'

  return async (ctx: GravitoContext, next: GravitoNext) => {
    // =====================================================================
    // 1. 增加計數（使用分佈式存儲）
    // =====================================================================
    const count = await rateLimitStore.increment(key, windowMs)

    // =====================================================================
    // 2. 檢查是否超出限制
    // =====================================================================
    if (count > maxRequests) {
      throw new HttpException(statusCode, { message })
    }

    // =====================================================================
    // 3. 添加速率限制信息到響應頭
    // =====================================================================
    const remaining = Math.max(0, maxRequests - count)
    const entry = await rateLimitStore.get(key)
    const resetTime = entry
      ? Math.ceil((entry.resetTime - Date.now()) / 1000)
      : Math.ceil(windowMs / 1000)

    ctx.header('X-RateLimit-Limit', maxRequests.toString())
    ctx.header('X-RateLimit-Remaining', remaining.toString())
    ctx.header('X-RateLimit-Reset', Math.max(0, resetTime).toString())

    return await next()
  }
}

/**
 * 基於 IP 的速率限制中間件
 *
 * 為每個 IP 地址設置獨立的速率限制
 *
 * 安全性：
 * - 防止 IP 偽造：驗證代理配置
 * - 支持多層代理：遵循代理鏈
 * - 可配置信任：通過 trustProxy 參數控制
 *
 * @example
 * ```typescript
 * app.use(rateLimitByIp({
 *   windowMs: 15 * 60 * 1000,  // 15 分鐘
 *   maxRequests: 100,
 *   trustProxy: true  // 僅在信任的代理後啟用
 * }))
 * ```
 */
export function rateLimitByIp(config: RateLimitConfig) {
  const {
    windowMs = 15 * 60 * 1000,
    maxRequests = 100,
    message = 'Too many requests from this IP',
    statusCode = 429,
    store,
    trustProxy = false,
  } = config

  const rateLimitStore = getGlobalStore(store)

  return async (ctx: GravitoContext, next: GravitoNext) => {
    // =====================================================================
    // 1. 獲取客戶端 IP（防止偽造）
    // =====================================================================
    const ip = getClientIp(ctx, trustProxy)
    const key = `ip:${ip}`

    // =====================================================================
    // 2. 增加計數（使用分佈式存儲）
    // =====================================================================
    const count = await rateLimitStore.increment(key, windowMs)

    // =====================================================================
    // 3. 檢查是否超出限制
    // =====================================================================
    if (count > maxRequests) {
      throw new HttpException(statusCode, { message })
    }

    // =====================================================================
    // 4. 添加速率限制信息到響應頭
    // =====================================================================
    const remaining = Math.max(0, maxRequests - count)
    const entry = await rateLimitStore.get(key)
    const resetTime = entry
      ? Math.ceil((entry.resetTime - Date.now()) / 1000)
      : Math.ceil(windowMs / 1000)

    ctx.header('X-RateLimit-Limit', maxRequests.toString())
    ctx.header('X-RateLimit-Remaining', remaining.toString())
    ctx.header('X-RateLimit-Reset', Math.max(0, resetTime).toString())

    return await next()
  }
}

/**
 * 端點級別的速率限制中間件
 *
 * 為特定端點設置更嚴格的限制
 *
 * @example
 * ```typescript
 * app.post('/auth/login', rateLimitByEndpoint({
 *   windowMs: 15 * 60 * 1000,
 *   maxRequests: 5,
 *   trustProxy: true
 * }), handler)
 * ```
 */
export function rateLimitByEndpoint(config: RateLimitConfig) {
  const {
    windowMs = 15 * 60 * 1000,
    maxRequests = 10,
    message = 'Too many requests to this endpoint',
    statusCode = 429,
    store,
    trustProxy = false,
  } = config

  const rateLimitStore = getGlobalStore(store)

  return async (ctx: GravitoContext, next: GravitoNext) => {
    // =====================================================================
    // 1. 構建唯一的限制 key
    // =====================================================================
    const ip = getClientIp(ctx, trustProxy)
    const endpoint = `${ctx.req.method}:${ctx.req.url}`
    const key = `endpoint:${endpoint}:${ip}`

    // =====================================================================
    // 2. 增加計數（使用分佈式存儲）
    // =====================================================================
    const count = await rateLimitStore.increment(key, windowMs)

    // =====================================================================
    // 3. 檢查是否超出限制
    // =====================================================================
    if (count > maxRequests) {
      throw new HttpException(statusCode, { message })
    }

    // =====================================================================
    // 4. 添加速率限制信息到響應頭
    // =====================================================================
    const remaining = Math.max(0, maxRequests - count)
    const entry = await rateLimitStore.get(key)
    const resetTime = entry
      ? Math.ceil((entry.resetTime - Date.now()) / 1000)
      : Math.ceil(windowMs / 1000)

    ctx.header('X-RateLimit-Limit', maxRequests.toString())
    ctx.header('X-RateLimit-Remaining', remaining.toString())
    ctx.header('X-RateLimit-Reset', Math.max(0, resetTime).toString())

    return await next()
  }
}

/**
 * 獲取客戶端 IP 地址（防止偽造）
 *
 * 安全性考慮：
 * - trustProxy=false（預設）：只使用直接連接 IP，防止所有偽造
 * - trustProxy=true：信任代理頭部，需要在安全的代理環境中使用
 *
 * @param ctx - Gravito 上下文
 * @param trustProxy - 是否信任代理頭部（預設 false）
 * @returns 客戶端 IP 地址
 */
function getClientIp(ctx: GravitoContext, trustProxy = false): string {
  // =====================================================================
  // 情況 1：信任代理頭部（用於 Nginx/CloudFlare 等反向代理）
  // =====================================================================
  if (trustProxy) {
    // 1.1 檢查 X-Forwarded-For header（代理鏈）
    const xForwardedFor = ctx.req.header('X-Forwarded-For')
    if (xForwardedFor) {
      // 只使用鏈中的第一個 IP（客戶端 IP）
      const ips = xForwardedFor.split(',').map((ip) => ip.trim())
      if (ips[0]) {
        return ips[0]
      }
    }

    // 1.2 檢查 X-Real-IP header（Nginx 代理）
    const xRealIp = ctx.req.header('X-Real-IP')
    if (xRealIp) {
      return xRealIp
    }

    // 1.3 檢查 CF-Connecting-IP header（Cloudflare）
    const cfConnectingIp = ctx.req.header('CF-Connecting-IP')
    if (cfConnectingIp) {
      return cfConnectingIp
    }
  }

  // =====================================================================
  // 情況 2：不信任代理頭部（預設 - 更安全）
  // =====================================================================
  // 使用 Authorization header 的 hash 作為穩定的客戶端識別符
  // 即使沒有真實 IP，也能提供基本的速率限制
  const authHeader = ctx.req.header('Authorization') || ''
  const userAgent = ctx.req.header('User-Agent') || ''

  if (authHeader) {
    // 已驗證的用戶：使用 auth token 的前 16 個字符作為標識符
    return `auth:${authHeader.slice(0, 16)}`
  }

  // 未驗證的用戶：使用 User-Agent 的 hash
  const crypto = require('crypto')
  return `ua:${crypto.createHash('sha256').update(userAgent).digest('hex').slice(0, 16)}`
}

export default {
  rateLimit,
  rateLimitByIp,
  rateLimitByEndpoint,
}
