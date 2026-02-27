import type { GravitoContext, PlanetCore } from '@gravito/core'
import type { AuthResponseDTO } from '../../../Application/DTOs/AuthResponseDTO'
import { MemberMapper } from '../../../Application/DTOs/MemberDTO'
import { MembershipError } from '../../../Application/Errors/MembershipError'
import type { IMemberRepository } from '../../../Domain/Contracts/IMemberRepository'
import { AuthenticationContext } from '../../../Domain/DCI/Contexts/AuthenticationContext'
import { RegistrationContext } from '../../../Domain/DCI/Contexts/RegistrationContext'
import type { IAuthStrategy } from '../Strategies/IAuthStrategy'
import { JwtAuthStrategy } from '../Strategies/JwtAuthStrategy'

/**
 * 會員認證控制器
 * 暴露會員認證相關的 HTTP 端點
 */
export class MemberAuthController {
  constructor(
    private strategy: IAuthStrategy,
    private repository: IMemberRepository,
    private core: PlanetCore
  ) {}

  /**
   * POST /api/member/register
   * 會員註冊
   */
  async register(c: GravitoContext): Promise<Response> {
    try {
      const body = await c.req.json<any>()

      // 驗證輸入
      if (!body.name || !body.email || !body.passwordPlain) {
        return c.json({ error: 'Missing required fields: name, email, passwordPlain' }, 400)
      }

      // 執行註冊場景
      const ctx = new RegistrationContext(this.repository, this.core)
      const memberDTO = await ctx.execute({
        name: body.name,
        email: body.email,
        passwordPlain: body.passwordPlain,
      })

      // 重新查找會員以獲得完整實體（用於發行憑證）
      const member = await this.repository.findByEmail(memberDTO.email)
      if (!member) {
        throw new MembershipError('MEMBER_NOT_FOUND', 'Newly registered member not found')
      }

      // 發行認證憑證
      const tokens = await this.strategy.issueCredentials(member, c)

      const response: AuthResponseDTO = {
        member: memberDTO,
        ...tokens,
      }

      return c.json(response, 201)
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * POST /api/member/login
   * 會員登入
   */
  async login(c: GravitoContext): Promise<Response> {
    try {
      const body = await c.req.json<any>()

      // 驗證輸入
      if (!body.email || !body.passwordPlain) {
        return c.json({ error: 'Missing required fields: email, passwordPlain' }, 400)
      }

      // 執行認證場景
      const ctx = new AuthenticationContext(this.repository, this.core)
      const { member } = await ctx.execute({
        email: body.email,
        passwordPlain: body.passwordPlain,
        remember: body.remember,
      })

      // 發行認證憑證
      const tokens = await this.strategy.issueCredentials(member, c)

      const response: AuthResponseDTO = {
        member: MemberMapper.toDTO(member),
        ...tokens,
      }

      return c.json(response, 200)
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * POST /api/member/logout
   * 會員登出
   */
  async logout(c: GravitoContext): Promise<Response> {
    try {
      await this.strategy.revokeCredentials(c)
      return c.json({ message: 'Logged out successfully' }, 200)
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * POST /api/member/refresh
   * 刷新 JWT accessToken
   * 僅 JWT 模式適用
   */
  async refresh(c: GravitoContext): Promise<Response> {
    try {
      // 僅 JWT 策略支援此操作
      if (!(this.strategy instanceof JwtAuthStrategy)) {
        return c.json({ error: 'Refresh not supported for current auth mode' }, 400)
      }

      const body = await c.req.json<any>()
      if (!body.refreshToken) {
        return c.json({ error: 'Missing refreshToken' }, 400)
      }

      const newAccessToken = await this.strategy.refreshAccessToken(body.refreshToken)

      return c.json(
        {
          accessToken: newAccessToken,
          expiresIn: 15 * 60, // 15 minutes
        },
        200
      )
    } catch (error) {
      return this.handleError(c, error)
    }
  }

  /**
   * 統一錯誤處理
   */
  private handleError(c: GravitoContext, error: any): Response {
    if (error instanceof MembershipError) {
      const statusCode =
        error.code === 'UNAUTHORIZED' ? 401 : error.code === 'MEMBER_EXISTS' ? 409 : 400

      return c.json(
        {
          error: error.message,
          code: error.code,
        },
        statusCode
      )
    }

    // 通用錯誤
    return c.json({ error: 'An error occurred during authentication' }, 500)
  }
}
