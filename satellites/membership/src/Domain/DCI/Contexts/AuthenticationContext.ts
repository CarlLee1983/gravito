import type { PlanetCore } from '@gravito/core'
import { MembershipError } from '../../../Application/Errors/MembershipError'
import type { IMemberRepository } from '../../Contracts/IMemberRepository'
import { injectAuthenticatableRole } from '../Roles/AuthenticatableRole'

/**
 * 認證場景的輸入參數
 */
export interface LoginMemberInput {
  email: string
  passwordPlain: string
  remember?: boolean
}

export interface LoginResult {
  member: any // Member entity
  sessionId?: string
}

/**
 * 認證場景協調器
 * 統整會員登入的完整流程，使用 DCI 角色注入
 */
export class AuthenticationContext {
  constructor(
    private repository: IMemberRepository,
    private core: PlanetCore
  ) {}

  /**
   * 執行會員認證流程
   */
  async execute(input: LoginMemberInput): Promise<LoginResult> {
    // 1. 由 email 查找會員
    const member = await this.repository.findByEmail(input.email)
    if (!member) {
      throw new MembershipError('MEMBER_NOT_FOUND', 'Invalid email or password')
    }

    // 2. 注入可驗證者角色並驗證認證資訊
    const authenticatable = injectAuthenticatableRole(member, this.repository, this.core)

    // 3. 驗證密碼
    await authenticatable.verifyCredentials(input.passwordPlain)

    // 4. 檢查會員是否活躍
    authenticatable.isActive()

    // 5. 多設備限制邏輯
    let sessionId: string | undefined
    const singleDevice = this.core.config.get('membership.auth.single_device', false)
    if (singleDevice) {
      const session = this.core.container.make<any>('session')
      if (session) {
        sessionId = session.id()
      }
    }

    // 6. 記錄登入
    await authenticatable.recordLogin(this.repository, sessionId)

    // 7. 觸發登入 hook
    await this.core.hooks.doAction('membership:authenticated', {
      member,
    })

    return { member, sessionId }
  }
}
