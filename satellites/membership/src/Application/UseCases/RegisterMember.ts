import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IMemberRepository } from '../../Domain/Contracts/IMemberRepository'
import { Member } from '../../Domain/Entities/Member'
import type { MemberDTO } from '../DTOs/MemberDTO'
import { MemberMapper } from '../DTOs/MemberDTO'

/**
 * Input for the member registration process
 */
export interface RegisterMemberInput {
  name: string
  email: string
  passwordPlain: string
}

/**
 * Register Member Use Case
 *
 * Coordinates the registration of a new member including validation,
 * password hashing, and domain event triggering.
 */
export class RegisterMember extends UseCase<RegisterMemberInput, MemberDTO> {
  constructor(
    private repository: IMemberRepository,
    private core: PlanetCore
  ) {
    super()
  }

  /**
   * Execute the registration flow
   */
  async execute(input: RegisterMemberInput): Promise<MemberDTO> {
    // 1. Check if email already exists
    const existing = await this.repository.findByEmail(input.email)
    if (existing) {
      // Use i18n from core services
      const i18n = this.core.container.make<any>('i18n')
      throw new Error(i18n?.t('membership.errors.member_exists') || 'Member already exists')
    }

    // 2. Hash password using the core hasher
    const passwordHash = await this.core.hasher.make(input.passwordPlain)

    // 3. Create domain entity
    const member = Member.create(crypto.randomUUID(), input.name, input.email, passwordHash)

    // 4. Save to persistence
    await this.repository.save(member)

    // 5. Send Verification Email (via Signal hook)
    await this.core.hooks.doAction('membership:send-verification', {
      email: member.email,
      token: member.verificationToken,
    })

    // 6. Trigger hooks for general extensions
    await this.core.hooks.doAction('membership:registered', {
      member: MemberMapper.toDTO(member),
    })

    return MemberMapper.toDTO(member)
  }
}
