import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IMemberRepository } from '../../Domain/Contracts/IMemberRepository'
import type { MemberDTO } from '../DTOs/MemberDTO'
import { MemberMapper } from '../DTOs/MemberDTO'

/**
 * Input for updating member settings
 */
export interface UpdateSettingsInput {
  memberId: string
  name?: string
  currentPassword?: string
  newPassword?: string
  /** Custom metadata fields provided by extensions or specific apps */
  metadata?: Record<string, any>
}

/**
 * Update Settings Use Case
 *
 * Handles profile updates, password changes, and dynamic metadata enrichment.
 */
export class UpdateSettings extends UseCase<UpdateSettingsInput, MemberDTO> {
  constructor(
    private repository: IMemberRepository,
    private core: PlanetCore
  ) {
    super()
  }

  /**
   * Execute the update flow
   */
  async execute(input: UpdateSettingsInput): Promise<MemberDTO> {
    const member = await this.repository.findById(input.memberId)

    if (!member) {
      throw new Error('Member not found')
    }

    // 1. Handle Profile Update
    if (input.name) {
      member.updateProfile(input.name)
    }

    // 2. Handle Password Change (Secure Flow)
    if (input.newPassword) {
      if (!input.currentPassword) {
        throw new Error('Current password is required to set a new password')
      }

      const isCurrentValid = await this.core.hasher.check(
        input.currentPassword,
        member.passwordHash
      )
      if (!isCurrentValid) {
        throw new Error('Invalid current password')
      }

      const newHash = await this.core.hasher.make(input.newPassword)
      member.changePassword(newHash)
    }

    // 3. Handle Dynamic Metadata (Custom Fields)
    if (input.metadata) {
      member.updateMetadata(input.metadata)
    }

    // 4. Persist changes
    await this.repository.save(member)

    // 5. Trigger update hook
    await this.core.hooks.doAction('membership:updated', {
      member: MemberMapper.toDTO(member),
      updatedFields: Object.keys(input).filter((k) => k !== 'memberId' && k !== 'currentPassword'),
    })

    return MemberMapper.toDTO(member)
  }
}
