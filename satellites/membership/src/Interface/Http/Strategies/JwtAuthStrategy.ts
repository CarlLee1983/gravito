import type { GravitoContext } from '@gravito/core'
import { sign, verify } from 'hono/jwt'
import { MembershipError } from '../../../Application/Errors/MembershipError'
import type { IMemberRepository } from '../../../Domain/Contracts/IMemberRepository'
import type { Member } from '../../../Domain/Entities/Member'
import type { AuthTokens, IAuthStrategy } from './IAuthStrategy'

/**
 * JWT 認證策略實現
 * - 無狀態認證
 * - accessToken 15 分鐘有效期
 * - refreshToken 7 天有效期
 */
export class JwtAuthStrategy implements IAuthStrategy {
  private accessTokenExpiry = 15 * 60 // 15 minutes
  private refreshTokenExpiry = 7 * 24 * 60 * 60 // 7 days

  constructor(
    private repository: IMemberRepository,
    private jwtSecret: string
  ) {}

  /**
   * 發行 JWT token
   */
  async issueCredentials(member: Member, _c: GravitoContext): Promise<AuthTokens> {
    const now = Math.floor(Date.now() / 1000)

    // 簽發 accessToken
    const accessToken = await sign(
      {
        sub: member.id,
        email: member.email,
        iat: now,
        exp: now + this.accessTokenExpiry,
      },
      this.jwtSecret,
      'HS256'
    )

    // 簽發 refreshToken（可選，用於更新 accessToken）
    const refreshToken = await sign(
      {
        sub: member.id,
        type: 'refresh',
        iat: now,
        exp: now + this.refreshTokenExpiry,
      },
      this.jwtSecret,
      'HS256'
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry,
    }
  }

  /**
   * 撤銷 JWT token
   * JWT 是無狀態的，撤銷由前端負責（刪除 token）
   * 可選：在後端維護黑名單實現強制撤銷
   */
  async revokeCredentials(_c: GravitoContext): Promise<void> {
    // 無狀態 JWT，撤銷由前端負責
    // 如需強制撤銷，可在此實現 token 黑名單
  }

  /**
   * 解析並驗證 JWT token
   */
  async getAuthenticatedMember(c: GravitoContext): Promise<Member | null> {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.slice(7)

    try {
      const payload = await verify(token, this.jwtSecret, 'HS256')

      if (!payload.sub || typeof payload.sub !== 'string') {
        return null
      }

      // 根據 JWT payload 查找會員
      const member = await this.repository.findById(payload.sub)
      return member || null
    } catch {
      return null
    }
  }

  /**
   * 刷新 accessToken
   * 使用有效的 refreshToken 獲得新的 accessToken
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      const payload = await verify(refreshToken, this.jwtSecret, 'HS256')

      if (payload.type !== 'refresh' || !payload.sub) {
        throw new MembershipError('TOKEN_EXPIRED', 'Invalid refresh token')
      }

      const member = await this.repository.findById(payload.sub as string)
      if (!member) {
        throw new MembershipError('MEMBER_NOT_FOUND', 'Member not found')
      }

      const now = Math.floor(Date.now() / 1000)
      const newAccessToken = await sign(
        {
          sub: member.id,
          email: member.email,
          iat: now,
          exp: now + this.accessTokenExpiry,
        },
        this.jwtSecret,
        'HS256'
      )

      return newAccessToken
    } catch (_error) {
      throw new MembershipError('TOKEN_EXPIRED', 'Invalid or expired refresh token')
    }
  }
}
