import type { GravitoContext, PlanetCore } from '@gravito/core'
import { MembershipError } from '../../../Application/Errors/MembershipError'
import type { Member } from '../../../Domain/Entities/Member'
import type { AuthTokens, IAuthStrategy } from './IAuthStrategy'

/**
 * Session 認證策略實現
 * - 基於 Gravito Sentinel guard（session-based）
 * - 有狀態認證
 */
export class SessionAuthStrategy implements IAuthStrategy {
  constructor(private core: PlanetCore) {}

  /**
   * 發行 session
   * 委派給 Sentinel auth guard
   */
  async issueCredentials(member: Member, _c: GravitoContext): Promise<AuthTokens> {
    try {
      const auth = this.core.container.make<any>('auth')
      const session = this.core.container.make<any>('session')

      // 透過 Sentinel 登入
      const result = await auth.guard('web').loginUsingId(member.id)

      if (!result) {
        throw new MembershipError('INVALID_CREDENTIALS', 'Failed to create session')
      }

      // 取得 session ID（除錯用）
      const sessionId = session?.id?.() || undefined

      return {
        sessionId,
      }
    } catch (error) {
      if (error instanceof MembershipError) {
        throw error
      }
      throw new MembershipError('INVALID_CREDENTIALS', 'Session creation failed')
    }
  }

  /**
   * 撤銷 session
   * 委派給 Sentinel auth guard
   */
  async revokeCredentials(_c: GravitoContext): Promise<void> {
    try {
      const auth = this.core.container.make<any>('auth')
      await auth.guard('web').logout()
    } catch (_error) {
      throw new MembershipError('UNAUTHORIZED', 'Logout failed')
    }
  }

  /**
   * 取得認證的會員
   * 從 session 中取得會員
   */
  async getAuthenticatedMember(_c: GravitoContext): Promise<Member | null> {
    try {
      const auth = this.core.container.make<any>('auth')
      const user = await auth.guard('web').user()
      return user || null
    } catch {
      return null
    }
  }
}
