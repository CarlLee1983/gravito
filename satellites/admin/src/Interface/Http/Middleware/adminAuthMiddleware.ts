import type { GravitoContext, PlanetCore } from '@gravito/core'
import { AdminErrorFactory } from '../../../Application/Errors/AdminError'
import type { IAdminRepository } from '../../../Domain/Contracts/IAdminRepository'
import type { JwtAdminAuthStrategy } from '../Strategies/JwtAdminAuthStrategy'

/**
 * Admin 認證中間件
 * 驗證 Bearer token 並將 admin 設定到 context
 */
export function adminAuthMiddleware(
  core: PlanetCore,
  jwtStrategy: JwtAdminAuthStrategy,
  adminRepo: IAdminRepository
) {
  return async (ctx: GravitoContext, next: () => Promise<void>) => {
    try {
      // 從 Authorization header 取得 token
      const authHeader = ctx.req.header('Authorization')
      if (!authHeader) {
        throw AdminErrorFactory.forbidden('Missing authorization header')
      }

      const [scheme, token] = authHeader.split(' ')
      if (scheme !== 'Bearer' || !token) {
        throw AdminErrorFactory.forbidden('Invalid authorization format')
      }

      // 驗證 token
      const payload = jwtStrategy.verifyToken(token)

      // 從資料庫取得 admin
      const admin = await adminRepo.findById(payload.sub)
      if (!admin) {
        throw AdminErrorFactory.adminNotFound(payload.sub)
      }

      // 檢查帳號狀態
      if (!admin.isActive) {
        throw AdminErrorFactory.adminInactive(admin.email.value)
      }

      // 設定 context
      ctx.set('admin', admin)
      ctx.set('adminToken', token)

      await next()
    } catch (error) {
      if (error instanceof Error && error.message === 'Token has expired') {
        return ctx.json({ error: 'Token expired' }, 401)
      }
      return ctx.json({ error: 'Unauthorized' }, 401)
    }
  }
}
