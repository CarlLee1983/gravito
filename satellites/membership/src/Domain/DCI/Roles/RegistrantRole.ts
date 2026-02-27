import { MembershipError } from '../../../Application/Errors/MembershipError'
import type { IMemberRepository } from '../../Contracts/IMemberRepository'
import type { Member } from '../../Entities/Member'

/**
 * 註冊者角色
 * 提供註冊流程所需的行為契約
 */
export interface RegistrantRole {
  validateUniqueness(): Promise<void>
  getVerificationToken(): string | undefined
}

/**
 * 將註冊者角色注入到 Member 實體中
 * 使用閉包實現角色注入，不修改 Entity 本身
 */
export function injectRegistrantRole(member: Member, repo: IMemberRepository): RegistrantRole {
  return {
    async validateUniqueness() {
      const existing = await repo.findByEmail(member.email)
      if (existing) {
        throw new MembershipError('MEMBER_EXISTS', `Email ${member.email} already registered`)
      }
    },
    getVerificationToken: () => member.verificationToken,
  }
}
