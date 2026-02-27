import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IMemberRepository } from '../../Domain/Contracts/IMemberRepository'
import { RegistrationContext } from '../../Domain/DCI/Contexts/RegistrationContext'
import type { MemberDTO } from '../DTOs/MemberDTO'

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
 * 薄殼委派於 RegistrationContext（DCI）
 * 保留 IoC 相容性，實際註冊邏輯由 DCI Context 執行
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
    const ctx = new RegistrationContext(this.repository, this.core)
    return ctx.execute(input)
  }
}
