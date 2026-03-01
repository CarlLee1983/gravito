import type { GravitoContext } from '@gravito/core'
import { sign, verify } from 'hono/jwt'
import { MembershipError } from '../../../Application/Errors/MembershipError'
import type { IMemberRepository } from '../../../Domain/Contracts/IMemberRepository'
import type { Member } from '../../../Domain/Entities/Member'
import type { IJwtTokenBlacklist } from '../../../Infrastructure/TokenBlacklist'
import type { AuthTokens, IAuthStrategy } from './IAuthStrategy'

/**
 * JWT 認證策略實現
 * - 無狀態認證
 * - accessToken 15 分鐘有效期
 * - refreshToken 7 天有效期
 * - 支援 token 黑名單強制撤銷
 */
export class JwtAuthStrategy implements IAuthStrategy {
  private accessTokenExpiry = 15 * 60 // 15 minutes
  private refreshTokenExpiry = 7 * 24 * 60 * 60 // 7 days

  constructor(
    private repository: IMemberRepository,
    private jwtSecret: string,
    private blacklist?: IJwtTokenBlacklist
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
   * 如有黑名單，將 token 加入黑名單實現強制撤銷
   */
  async revokeCredentials(c: GravitoContext): Promise<void> {
    if (!this.blacklist) {
      return
    }

    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return
    }

    const token = authHeader.slice(7)

    try {
      // 驗證 token 有效性，取得過期時間
      const payload = await verify(token, this.jwtSecret, 'HS256')

      if (!payload.exp || typeof payload.exp !== 'number') {
        return
      }

      // 計算剩餘有效期
      const now = Math.floor(Date.now() / 1000)
      const ttl = Math.max(0, payload.exp - now)

      // 將 token 加入黑名單
      await this.blacklist.blacklist(token, ttl)
    } catch {
      // token 已過期或無效，無需加入黑名單
    }
  }

  /**
   * 解析並驗證 JWT token
   * 檢查 token 是否在黑名單中
   */
  async getAuthenticatedMember(c: GravitoContext): Promise<Member | null> {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.slice(7)

    try {
      // 檢查黑名單
      if (this.blacklist) {
        const isBlacklisted = await this.blacklist.isBlacklisted(token)
        if (isBlacklisted) {
          return null
        }
      }

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
    let payload: any
    try {
      payload = await verify(refreshToken, this.jwtSecret, 'HS256')
    } catch (_error) {
      throw new MembershipError('TOKEN_EXPIRED', 'Invalid or expired refresh token')
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new MembershipError('TOKEN_EXPIRED', 'Invalid refresh token')
    }

    const member = await this.repository.findById(payload.sub as string)
    if (!member) {
      throw new MembershipError('MEMBER_NOT_FOUND', 'Member not found')
    }

    // Use payload.iat + 1 to ensure new token differs from original
    // This avoids issuing identical tokens in the same second
    const now = Math.floor(Date.now() / 1000)
    const iat = Math.max(payload.iat + 1, now)
    const newAccessToken = await sign(
      {
        sub: member.id,
        email: member.email,
        iat,
        exp: iat + this.accessTokenExpiry,
      },
      this.jwtSecret,
      'HS256'
    )

    return newAccessToken
  }
}
