import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IMemberRepository } from '../../Domain/Contracts/IMemberRepository'

export interface ResetPasswordInput {
  token: string
  newPasswordPlain: string
}

export class ResetPassword extends UseCase<ResetPasswordInput, void> {
  constructor(
    private repository: IMemberRepository,
    private core: PlanetCore
  ) {
    super()
  }

  async execute(input: ResetPasswordInput): Promise<void> {
    const member = await this.repository.findByResetToken(input.token)

    if (!member || !member.passwordResetExpiresAt || member.passwordResetExpiresAt < new Date()) {
      throw new Error('Invalid or expired reset token')
    }

    const newHash = await this.core.hasher.make(input.newPasswordPlain)
    member.resetPassword(newHash)

    await this.repository.save(member)
  }
}
