/**
 * Authenticate Middleware
 *
 * 驗證請求是否已認證
 */

import { AuthenticationException, type GravitoContext, type GravitoNext } from '@gravito/core'
import type { AuthManager } from '@gravito/sentinel'
import type { TokenService } from '@infrastructure/auth/TokenService'

/**
 * 身份驗證中間件
 *
 * 檢查請求是否提供了有效的認證憑據（JWT Token 或 Session）
 *
 * @param guards - 要使用的守衛名稱，預設使用配置的預設守衛
 * @returns Gravito 中間件函數
 * @throws {AuthenticationException} 如果請求未認證
 */
export function authenticate(...guards: string[]) {
  return async (ctx: GravitoContext, next: GravitoNext) => {
    const auth = ctx.get('auth') as AuthManager
    const core = ctx.get('core') as any
    const tokenService = core.container.make('TokenService') as TokenService
    const tokenBlacklist = core.container.make('TokenBlacklist') as any

    try {
      // 如果指定了守衛，使用指定的守衛
      const guardToUse = guards.length > 0 ? guards[0] : undefined
      if (guardToUse) {
        auth.shouldUse(guardToUse)
      }

      // 對於 JWT 守衛，驗證 Token 的黑名單狀態
      if (guardToUse === 'jwt' || !guardToUse) {
        const authHeader = ctx.req.header('Authorization')
        const token = tokenService.extractTokenFromHeader(authHeader)

        if (token) {
          // 檢查 Token 是否在黑名單中
          const isBlacklisted = await tokenBlacklist.has(token)
          if (isBlacklisted) {
            throw new AuthenticationException('Token has been revoked')
          }
        }
      }

      // 檢查認證狀態
      if (!(await auth.check())) {
        throw new AuthenticationException('Unauthenticated')
      }

      // 附加用戶信息到上下文
      const user = await auth.user()
      ctx.set('user', user)

      return await next()
    } catch (error) {
      if (error instanceof AuthenticationException) {
        throw error
      }
      throw new AuthenticationException('Authentication failed')
    }
  }
}

export default authenticate
