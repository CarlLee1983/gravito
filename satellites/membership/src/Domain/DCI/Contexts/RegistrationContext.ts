import type { PlanetCore } from '@gravito/core'
import type { MemberDTO } from '../../../Application/DTOs/MemberDTO'
import { MemberMapper } from '../../../Application/DTOs/MemberDTO'
import type { IMemberRepository } from '../../Contracts/IMemberRepository'
import { Member } from '../../Entities/Member'
import { injectRegistrantRole } from '../Roles/RegistrantRole'

/**
 * 註冊場景的輸入參數
 */
export interface RegisterMemberInput {
  name: string
  email: string
  passwordPlain: string
}

/**
 * 註冊場景協調器
 * 統整會員註冊的完整流程，使用 DCI 角色注入
 */
export class RegistrationContext {
  constructor(
    private repository: IMemberRepository,
    private core: PlanetCore
  ) {}

  /**
   * 執行會員註冊流程
   */
  async execute(input: RegisterMemberInput): Promise<MemberDTO> {
    // 1. 雜湊密碼
    const passwordHash = await this.core.hasher.make(input.passwordPlain)

    // 2. 建立領域實體
    const member = Member.create(crypto.randomUUID(), input.name, input.email, passwordHash)

    // 3. 注入註冊者角色並驗證唯一性
    const registrant = injectRegistrantRole(member, this.repository)
    await registrant.validateUniqueness()

    // 4. 保存到持久層
    await this.repository.save(member)

    // 5. 觸發驗證郵件 hook
    await this.core.hooks.doAction('membership:send-verification', {
      email: member.email,
      token: registrant.getVerificationToken(),
    })

    // 6. 觸發通用擴展 hook
    await this.core.hooks.doAction('membership:registered', {
      member: MemberMapper.toDTO(member),
    })

    return MemberMapper.toDTO(member)
  }
}
