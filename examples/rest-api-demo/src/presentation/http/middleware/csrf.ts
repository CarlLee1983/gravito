/**
 * CSRF Protection Middleware
 *
 * 防止跨站請求偽造（Cross-Site Request Forgery）攻擊
 */

import * as crypto from 'node:crypto'
import { type GravitoContext, type GravitoNext, HttpException } from '@gravito/core'

interface CsrfConfig {
  tokenLength?: number
  tokenField?: string
  headerName?: string
  excludeMethods?: string[]
}

/**
 * CSRF Token 存儲（會話級別）
 */
const csrfTokens: Map<string, { token: string; timestamp: number }> = new Map()

/**
 * 生成 CSRF Token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * CSRF 保護中間件
 *
 * 為狀態變更的請求（POST, PUT, DELETE, PATCH）驗證 CSRF Token
 *
 * @example
 * ```typescript
 * app.use(csrf({
 *   tokenLength: 32,
 *   tokenField: '_token',
 *   headerName: 'X-CSRF-Token',
 *   excludeMethods: ['GET', 'HEAD', 'OPTIONS']
 * }))
 * ```
 */
export function csrf(config: CsrfConfig = {}) {
  const {
    tokenLength = 32,
    tokenField = '_token',
    headerName = 'X-CSRF-Token',
    excludeMethods = ['GET', 'HEAD', 'OPTIONS'],
  } = config

  return async (ctx: GravitoContext, next: GravitoNext) => {
    const method = ctx.req.method
    const sessionId = getSessionId(ctx)

    // 為所有請求生成或附加 CSRF Token
    if (!csrfTokens.has(sessionId)) {
      const token = generateCsrfToken().slice(0, tokenLength)
      csrfTokens.set(sessionId, {
        token,
        timestamp: Date.now(),
      })
    }

    const tokenData = csrfTokens.get(sessionId)!
    ctx.set('csrfToken', tokenData.token)

    // 對於狀態變更的請求，驗證 CSRF Token
    if (!excludeMethods.includes(method)) {
      const token = await getCsrfToken(ctx, tokenField, headerName)

      if (!token || token !== tokenData.token) {
        throw new HttpException(403, { message: 'CSRF token validation failed' })
      }

      // 驗證 Token 是否過期（1 小時）
      const tokenAge = Date.now() - tokenData.timestamp
      if (tokenAge > 60 * 60 * 1000) {
        csrfTokens.delete(sessionId)
        throw new HttpException(403, { message: 'CSRF token expired' })
      }
    }

    // 添加 CSRF Token 到響應頭
    ctx.header('X-CSRF-Token', tokenData.token)

    return await next()
  }
}

/**
 * 從請求中獲取 CSRF Token
 */
async function getCsrfToken(
  ctx: GravitoContext,
  tokenField: string,
  headerName: string
): Promise<string | null> {
  // 優先檢查 header
  const headerToken = ctx.req.header(headerName)
  if (headerToken) {
    return headerToken
  }

  // 檢查 URL 參數
  const queryToken = ctx.req.query(tokenField)
  if (queryToken) {
    return queryToken
  }

  // 檢查請求體
  try {
    const contentType = ctx.req.header('content-type')
    if (contentType?.includes('application/json')) {
      const body = (await ctx.req.json()) as any
      return body?.[tokenField]
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const body = await ctx.req.text()
      const params = new URLSearchParams(body)
      return params.get(tokenField)
    }
  } catch {
    // 忽略解析錯誤
  }

  return null
}

/**
 * 獲取會話 ID（從 cookie 或 header）
 */
function getSessionId(ctx: GravitoContext): string {
  // 檢查 cookie
  const sessionCookie = ctx.req
    .header('cookie')
    ?.split(';')
    .find((c) => c.trim().startsWith('session='))
    ?.split('=')[1]

  if (sessionCookie) {
    return sessionCookie
  }

  // 檢查 Authorization header
  const authHeader = ctx.req.header('Authorization')
  if (authHeader) {
    return crypto.createHash('sha256').update(authHeader).digest('hex')
  }

  // 使用 User-Agent 作為備用
  const ua = ctx.req.header('User-Agent') || ''
  return crypto.createHash('sha256').update(ua).digest('hex')
}

/**
 * CSRF Token 中間件（用於獲取 Token）
 *
 * 允許客戶端獲取 CSRF Token
 */
export function csrfToken() {
  return async (ctx: GravitoContext, _next: GravitoNext) => {
    const token = ctx.get('csrfToken') as string

    if (!token) {
      throw new HttpException(500, { message: 'CSRF token not available' })
    }

    return ctx.json({
      success: true,
      data: {
        token,
      },
    })
  }
}

export default {
  csrf,
  csrfToken,
  generateCsrfToken,
}
