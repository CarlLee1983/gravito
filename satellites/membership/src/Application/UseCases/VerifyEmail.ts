import { UseCase } from '@gravito/enterprise'
import type { IMemberRepository } from '../../Domain/Contracts/IMemberRepository'

export interface VerifyEmailInput {
  token: string
}

export class VerifyEmail extends UseCase<VerifyEmailInput, void> {
  constructor(private repository: IMemberRepository) {
    super()
  }

  async execute(input: VerifyEmailInput): Promise<void> {
    const member = await this.repository.findByVerificationToken(input.token)

    if (!member) {
      throw new Error('Invalid verification token')
    }

    member.verifyEmail()
    await this.repository.save(member)
  }
}
