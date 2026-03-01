/**
 * Rate Limiting Middleware
 *
 * 限制 API 請求速率，防止濫用
 */

import { type GravitoContext, type GravitoNext, HttpException } from '@gravito/core'

interface RateLimitConfig {
  windowMs: number // 時間窗口（毫秒）
  maxRequests: number // 最大請求數
  message?: string
  statusCode?: number
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

/**
 * 內存存儲實現（單實例用）
 */
const memoryStore: RateLimitStore = {}

/**
 * 重設內存存儲（用於測試）
 */
export function resetMemoryStore() {
  for (const key in memoryStore) {
    delete memoryStore[key]
  }
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
  } = config

  return async (ctx: GravitoContext, next: GravitoNext) => {
    const now = Date.now()
    const key = 'global'

    // 初始化或獲取當前記錄
    if (!memoryStore[key] || now >= memoryStore[key].resetTime) {
      memoryStore[key] = {
        count: 0,
        resetTime: now + windowMs,
      }
    }

    // 增加請求計數
    memoryStore[key].count++

    // 檢查是否超出限制
    if (memoryStore[key].count > maxRequests) {
      throw new HttpException(statusCode, { message })
    }

    // 添加速率限制信息到響應頭
    const remaining = Math.max(0, maxRequests - memoryStore[key].count)
    const resetTime = Math.ceil((memoryStore[key].resetTime - now) / 1000)

    ctx.header('X-RateLimit-Limit', maxRequests.toString())
    ctx.header('X-RateLimit-Remaining', remaining.toString())
    ctx.header('X-RateLimit-Reset', resetTime.toString())

    return await next()
  }
}

/**
 * 基於 IP 的速率限制中間件
 *
 * 為每個 IP 地址設置獨立的速率限制
 *
 * @example
 * ```typescript
 * app.use(rateLimitByIp({
 *   windowMs: 15 * 60 * 1000,  // 15 分鐘
 *   maxRequests: 100
 * }))
 * ```
 */
export function rateLimitByIp(config: RateLimitConfig) {
  const {
    windowMs = 15 * 60 * 1000,
    maxRequests = 100,
    message = 'Too many requests from this IP',
    statusCode = 429,
  } = config

  return async (ctx: GravitoContext, next: GravitoNext) => {
    const now = Date.now()
    const ip = getClientIp(ctx)
    const key = `ip:${ip}`

    // 初始化或獲取當前記錄
    if (!memoryStore[key] || now >= memoryStore[key].resetTime) {
      memoryStore[key] = {
        count: 0,
        resetTime: now + windowMs,
      }
    }

    // 增加請求計數
    memoryStore[key].count++

    // 檢查是否超出限制
    if (memoryStore[key].count > maxRequests) {
      throw new HttpException(statusCode, { message })
    }

    // 添加速率限制信息到響應頭
    const remaining = Math.max(0, maxRequests - memoryStore[key].count)
    const resetTime = Math.ceil((memoryStore[key].resetTime - now) / 1000)

    ctx.header('X-RateLimit-Limit', maxRequests.toString())
    ctx.header('X-RateLimit-Remaining', remaining.toString())
    ctx.header('X-RateLimit-Reset', resetTime.toString())

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
 *   maxRequests: 5
 * }), handler)
 * ```
 */
export function rateLimitByEndpoint(config: RateLimitConfig) {
  const {
    windowMs = 15 * 60 * 1000,
    maxRequests = 10,
    message = 'Too many requests to this endpoint',
    statusCode = 429,
  } = config

  return async (ctx: GravitoContext, next: GravitoNext) => {
    const now = Date.now()
    const ip = getClientIp(ctx)
    const endpoint = `${ctx.req.method}:${ctx.req.url}`
    const key = `endpoint:${endpoint}:${ip}`

    // 初始化或獲取當前記錄
    if (!memoryStore[key] || now >= memoryStore[key].resetTime) {
      memoryStore[key] = {
        count: 0,
        resetTime: now + windowMs,
      }
    }

    // 增加請求計數
    memoryStore[key].count++

    // 檢查是否超出限制
    if (memoryStore[key].count > maxRequests) {
      throw new HttpException(statusCode, { message })
    }

    // 添加速率限制信息到響應頭
    const remaining = Math.max(0, maxRequests - memoryStore[key].count)
    const resetTime = Math.ceil((memoryStore[key].resetTime - now) / 1000)

    ctx.header('X-RateLimit-Limit', maxRequests.toString())
    ctx.header('X-RateLimit-Remaining', remaining.toString())
    ctx.header('X-RateLimit-Reset', resetTime.toString())

    return await next()
  }
}

/**
 * 獲取客戶端 IP 地址
 */
function getClientIp(ctx: GravitoContext): string {
  // 檢查 X-Forwarded-For header（代理後）
  const xForwardedFor = ctx.req.header('X-Forwarded-For')
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }

  // 檢查 X-Real-IP header（Nginx 代理）
  const xRealIp = ctx.req.header('X-Real-IP')
  if (xRealIp) {
    return xRealIp
  }

  // 使用遠程地址（支援測試環境的 socket）
  const reqAny = ctx.req as any
  return reqAny?.socket?.remoteAddress || '127.0.0.1'
}

export default {
  rateLimit,
  rateLimitByIp,
  rateLimitByEndpoint,
}
