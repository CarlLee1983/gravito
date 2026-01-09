import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IMemberRepository } from '../../Domain/Contracts/IMemberRepository'
import type { MemberDTO } from '../DTOs/MemberDTO'
import { MemberMapper } from '../DTOs/MemberDTO'

export interface UpdateLevelInput {
  memberId: string
  newLevel: string
}

/**
 * Update Member Level Use Case
 *
 * Typically used by administrative systems or loyalty programs to promote members.
 */
export class UpdateMemberLevel extends UseCase<UpdateLevelInput, MemberDTO> {
  constructor(
    private repository: IMemberRepository,
    private core: PlanetCore
  ) {
    super()
  }

  async execute(input: UpdateLevelInput): Promise<MemberDTO> {
    const member = await this.repository.findById(input.memberId)

    if (!member) {
      throw new Error('Member not found')
    }

    const oldLevel = member.level
    member.changeLevel(input.newLevel)

    await this.repository.save(member)

    // Trigger hook for tier change (e.g., to send congratulations or update discounts)
    await this.core.hooks.doAction('membership:level-changed', {
      memberId: member.id,
      email: member.email,
      oldLevel,
      newLevel: input.newLevel,
    })

    return MemberMapper.toDTO(member)
  }
}
