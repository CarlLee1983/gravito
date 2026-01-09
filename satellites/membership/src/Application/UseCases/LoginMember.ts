import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { IMemberRepository } from '../../Domain/Contracts/IMemberRepository'
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
 * Uses Gravito Sentinel for robust authentication.
 * Supports multi-device login restriction toggle via config.
 */
export class LoginMember extends UseCase<LoginMemberInput, MemberDTO> {
  constructor(
    private repository: IMemberRepository,
    private core: PlanetCore
  ) {
    super()
  }

  async execute(input: LoginMemberInput): Promise<MemberDTO> {
    // 使用核心的 auth 管理器 (Sentinel) 進行驗證
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
        // 獲取目前生成的 Session ID
        const sessionId = session.id()

        // 更新會員實體中的 Session ID
        const member = await this.repository.findById(user.id)
        if (member) {
          member.bindSession(sessionId)
          await this.repository.save(member)
        }
      }
    }

    return MemberMapper.toDTO(user)
  }
}
