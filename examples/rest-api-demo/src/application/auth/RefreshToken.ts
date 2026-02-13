/**
 * RefreshToken Use Case
 *
 * 應用層業務邏輯：刷新 JWT Token
 */

import type { TokenService } from '@infrastructure/auth/TokenService'

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export class RefreshTokenUseCase {
  constructor(private readonly tokenService: TokenService) {}

  async execute(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    // =====================================================================
    // 1. 驗證輸入
    // =====================================================================
    if (!request.refreshToken) {
      throw new Error('Refresh token is required')
    }

    // =====================================================================
    // 2. 驗證 Refresh Token（簽名和過期時間）
    // =====================================================================
    const payload = this.tokenService.verifyRefreshToken(request.refreshToken)
    if (!payload || !payload.userId) {
      throw new Error('Invalid or expired refresh token')
    }

    // =====================================================================
    // 3. 生成新 Access Token 和 Refresh Token
    // =====================================================================
    const accessToken = this.tokenService.generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    })

    const refreshToken = this.tokenService.generateRefreshToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    })

    // =====================================================================
    // 4. 返回新 Token
    // =====================================================================
    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 分鐘（與 accessTokenExpiry 對應）
      tokenType: 'Bearer',
    }
  }
}
