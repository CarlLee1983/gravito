/**
 * Token Service
 *
 * 處理 JWT Token 的生成、驗證和黑名單管理
 */

import * as jwt from 'jsonwebtoken'

export interface TokenPayload {
  userId: string
  email: string
  role: string
}

export class TokenService {
  private readonly accessTokenSecret: string
  private readonly refreshTokenSecret: string
  private readonly accessTokenExpiry: string = '1h'
  private readonly refreshTokenExpiry: string = '30d'

  constructor(accessTokenSecret?: string, refreshTokenSecret?: string) {
    this.accessTokenSecret = accessTokenSecret || process.env.JWT_ACCESS_SECRET || 'access-secret'
    this.refreshTokenSecret =
      refreshTokenSecret || process.env.JWT_REFRESH_SECRET || 'refresh-secret'
  }

  /**
   * 生成 Access Token
   */
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      algorithm: 'HS256',
    })
  }

  /**
   * 生成 Refresh Token
   */
  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: 'HS256',
    })
  }

  /**
   * 驗證 Access Token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.accessTokenSecret) as TokenPayload
    } catch {
      return null
    }
  }

  /**
   * 驗證 Refresh Token
   */
  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.refreshTokenSecret) as TokenPayload
    } catch {
      return null
    }
  }

  /**
   * 解析 Token（不驗證簽名）
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload | null
    } catch {
      return null
    }
  }

  /**
   * 從 Authorization Header 提取 Token
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null
    }

    return parts[1]
  }

  /**
   * 獲取 Token 過期時間
   */
  getTokenExpiry(token: string): number | null {
    const decoded = this.decodeToken(token)
    return decoded?.exp ? decoded.exp * 1000 : null // 轉換為毫秒
  }
}
