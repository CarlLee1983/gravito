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
  exp?: number
}

export class TokenService {
  private readonly accessTokenSecret: string
  private readonly refreshTokenSecret: string
  private readonly accessTokenExpiry: string = '15m'
  private readonly refreshTokenExpiry: string = '7d'

  constructor(accessTokenSecret?: string, refreshTokenSecret?: string) {
    // 使用傳入的密鑰，或從環境變數讀取
    // 生產環境必須提供有效的密鑰
    this.accessTokenSecret = accessTokenSecret || process.env.JWT_ACCESS_SECRET || ''
    this.refreshTokenSecret = refreshTokenSecret || process.env.JWT_REFRESH_SECRET || ''

    // 驗證生產環境的密鑰配置
    if (process.env.NODE_ENV === 'production') {
      if (!this.accessTokenSecret) {
        throw new Error(
          'JWT_ACCESS_SECRET is required in production. Set it via environment variables.'
        )
      }
      if (!this.refreshTokenSecret) {
        throw new Error(
          'JWT_REFRESH_SECRET is required in production. Set it via environment variables.'
        )
      }
    } else if (!this.accessTokenSecret || !this.refreshTokenSecret) {
      // 開發環境：生成臨時密鑰並警告
      const crypto = require('crypto')
      this.accessTokenSecret = this.accessTokenSecret || crypto.randomBytes(32).toString('hex')
      this.refreshTokenSecret = this.refreshTokenSecret || crypto.randomBytes(32).toString('hex')
      console.warn(
        '[SECURITY WARNING] Using random JWT secrets in development - tokens will not survive restart'
      )
    }
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
