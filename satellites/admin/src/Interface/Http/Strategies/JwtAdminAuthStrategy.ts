import { AdminErrorFactory } from '../../../Application/Errors/AdminError'
import type { Admin } from '../../../Domain/Entities/Admin'

export interface JwtPayload {
  sub: string // admin id
  email: string
  isSuper: boolean
  iat: number // issued at
  exp: number // expiration
  type: 'access' | 'refresh'
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number // seconds
}

/**
 * Admin JWT 認證策略
 * 管理 JWT 的簽發、驗證、刷新等操作
 */
export class JwtAdminAuthStrategy {
  private readonly accessTokenExpiry = 15 * 60 // 15 分鐘
  private readonly refreshTokenExpiry = 7 * 24 * 60 * 60 // 7 天
  // @ts-expect-error TS6133 - 用於未來實作
  private readonly _secret = process.env.JWT_SECRET || 'dev-secret-key'

  /**
   * 簽發 access token 和 refresh token
   */
  issueCredentials(admin: Admin): TokenPair {
    const now = Math.floor(Date.now() / 1000)

    // 建立 payload
    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email.value,
      isSuper: admin.isSuper,
      iat: now,
      exp: now + this.accessTokenExpiry,
      type: 'access',
    }

    // 簽發 access token（簡化實作，實際應使用 JWT 庫）
    const accessToken = this.encodePayload(payload)

    // 簽發 refresh token
    const refreshPayload: JwtPayload = {
      ...payload,
      exp: now + this.refreshTokenExpiry,
      type: 'refresh',
    }
    const refreshToken = this.encodePayload(refreshPayload)

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry,
    }
  }

  /**
   * 驗證 token 並提取 payload
   */
  verifyToken(token: string): JwtPayload {
    try {
      const payload = this.decodePayload(token)

      // 檢查過期
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp < now) {
        throw AdminErrorFactory.tokenExpired()
      }

      return payload
    } catch (error) {
      if (error instanceof Error && error.message === 'Token has expired') {
        throw error
      }
      throw AdminErrorFactory.tokenExpired()
    }
  }

  /**
   * 刷新 access token（使用 refresh token）
   */
  refreshAccessToken(refreshToken: string): string {
    try {
      const payload = this.verifyToken(refreshToken)

      // 確認是 refresh token
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type')
      }

      // 簽發新的 access token
      const now = Math.floor(Date.now() / 1000)
      const newPayload: JwtPayload = {
        sub: payload.sub,
        email: payload.email,
        isSuper: payload.isSuper,
        iat: now,
        exp: now + this.accessTokenExpiry,
        type: 'access',
      }

      return this.encodePayload(newPayload)
    } catch {
      throw AdminErrorFactory.tokenExpired()
    }
  }

  /**
   * 撤銷 token（加入黑名單）
   */
  revokeToken(_token: string): void {
    // 實際實作應將 token 加入黑名單
    // this.tokenBlacklist.addToBlacklist(_token, expiryTime)
  }

  /**
   * 簡化的 payload 編碼（實際應使用 JWT 庫如 jsonwebtoken）
   */
  private encodePayload(payload: JwtPayload): string {
    // 實際實作應使用真實的 JWT 簽名
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64')
    return `${encoded}.signature`
  }

  /**
   * 簡化的 payload 解碼
   */
  private decodePayload(token: string): JwtPayload {
    try {
      const [encoded] = token.split('.')
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
      return JSON.parse(decoded) as JwtPayload
    } catch {
      throw new Error('Invalid token format')
    }
  }
}
