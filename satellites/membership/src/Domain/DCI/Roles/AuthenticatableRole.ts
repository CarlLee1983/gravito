import type { PlanetCore } from '@gravito/core'
import { MembershipError } from '../../../Application/Errors/MembershipError'
import type { IMemberRepository } from '../../Contracts/IMemberRepository'
import type { Member } from '../../Entities/Member'
import { MemberStatus } from '../../Entities/Member'

/**
 * 可驗證者角色
 * 提供身份驗證所需的行為契約
 */
export interface AuthenticatableRole {
  verifyCredentials(passwordPlain: string): Promise<boolean>
  isActive(): boolean
  recordLogin(repo: IMemberRepository, sessionId?: string): Promise<void>
}

/**
 * 將可驗證者角色注入到 Member 實體中
 * 支援密碼驗證、活躍狀態檢查和登錄記錄
 */
export function injectAuthenticatableRole(
  member: Member,
  _repo: IMemberRepository,
  core: PlanetCore
): AuthenticatableRole {
  return {
    async verifyCredentials(passwordPlain: string) {
      const isValid = await core.hasher.check(passwordPlain, member.passwordHash)
      if (!isValid) {
        throw new MembershipError('INVALID_CREDENTIALS', 'Invalid email or password')
      }
      return isValid
    },
    isActive(): boolean {
      if (member.status !== MemberStatus.ACTIVE) {
        throw new MembershipError('MEMBER_INACTIVE', `Account is ${member.status}`)
      }
      return true
    },
    async recordLogin(repo: IMemberRepository, sessionId?: string) {
      if (sessionId) {
        member.bindSession(sessionId)
      }
      await repo.save(member)
    },
  }
}
