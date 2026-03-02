import type { GravitoContext } from '@gravito/core'
import type { IMemberRepository } from '../../../Domain/Contracts/IMemberRepository'
import { verifyJWT } from '../../../Infrastructure/Jwt/BunJwt'

/**
 * 會員認證中間件
 * 支援雙模式：
 * 1. JWT：解析 Authorization Bearer header
 * 2. Session：委派給 Sentinel auth
 */
export function memberAuthMiddleware(
  repository: IMemberRepository,
  jwtSecret?: string,
  core?: any,
  optional = false
): (c: GravitoContext, next: () => Promise<void>) => Promise<void> {
  return async (c: GravitoContext, next: () => Promise<void>): Promise<void> => {
    let authenticatedMember: any = null

    // 1. 嘗試 JWT 認證（優先）
    if (jwtSecret) {
      const authHeader = c.req.header('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        try {
          const payload = await verifyJWT(token, jwtSecret)
          if (payload.sub && typeof payload.sub === 'string') {
            authenticatedMember = await repository.findById(payload.sub)
          }
        } catch {
          // JWT 驗證失敗，嘗試 session
        }
      }
    }

    // 2. 回退到 Session 認證
    if (!authenticatedMember && core) {
      try {
        const auth = core.container.make('auth') as any
        authenticatedMember = await auth.guard('web').user()
      } catch {
        // Session 認證也失敗
      }
    }

    // 3. 設定到上下文
    if (authenticatedMember) {
      c.set('member', authenticatedMember)
      c.set('memberId', authenticatedMember.id)
    }

    // 4. 若需要認證但尚未認證，回傳 401
    if (!optional && !authenticatedMember) {
      c.json({ error: 'Unauthorized' }, 401)
      return
    }

    await next()
  }
}
