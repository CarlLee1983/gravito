import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IMemberRepository } from '../../Domain/Contracts/IMemberRepository'
import { AuthenticationContext } from '../../Domain/DCI/Contexts/AuthenticationContext'
import type { MemberDTO } from '../DTOs/MemberDTO'
import { MemberMapper } from '../DTOs/MemberDTO'

export interface LoginMemberInput {
  email: string
  passwordPlain: string
  remember?: boolean
}

/**
 * Login Member Use Case
 *
 * 支援雙模式認證：
 * - Session 模式：保留現有 Sentinel 邏輯（向後相容）
 * - JWT 模式：委派於 AuthenticationContext（DCI）
 * - Dual 模式：優先使用 JWT，fallback Session
 */
export class LoginMember extends UseCase<LoginMemberInput, MemberDTO> {
  constructor(
    private repository: IMemberRepository,
    private core: PlanetCore
  ) {
    super()
  }

  async execute(input: LoginMemberInput): Promise<MemberDTO> {
    const mode = this.core.config.get('membership.auth.mode', 'session') as string

    // Session 模式：使用現有 Sentinel 邏輯（向後相容）
    if (mode === 'session') {
      const auth = this.core.container.make<any>('auth')

      const result = await auth.guard('web').attempt(
        {
          email: input.email,
          password: input.passwordPlain,
        },
        input.remember || false
      )

      if (!result) {
        throw new Error('Invalid credentials')
      }

      const user = await auth.guard('web').user()

      // 多設備限制邏輯
      const singleDevice = this.core.config.get('membership.auth.single_device', false)
      if (singleDevice) {
        const session = this.core.container.make<any>('session')
        if (session) {
          const sessionId = session.id()
          const member = await this.repository.findById(user.id)
          if (member) {
            member.bindSession(sessionId)
            await this.repository.save(member)
          }
        }
      }

      return MemberMapper.toDTO(user)
    }

    // JWT 模式或 Dual 模式：使用 DCI Context
    const ctx = new AuthenticationContext(this.repository, this.core)
    const { member } = await ctx.execute({
      email: input.email,
      passwordPlain: input.passwordPlain,
    })

    return MemberMapper.toDTO(member)
  }
}
