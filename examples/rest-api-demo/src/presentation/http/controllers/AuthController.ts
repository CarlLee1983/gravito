/**
 * Auth Controller
 *
 * 處理認證相關的 REST 端點
 */

import type { LogoutUserUseCase } from '@application/auth/LogoutUser'
import type { RefreshTokenUseCase } from '@application/auth/RefreshToken'
import type { LoginUserUseCase } from '@application/user/LoginUser'
import type { RegisterUserUseCase } from '@application/user/RegisterUser'
import type { GravitoContext } from '@gravito/core'
import type { AuthManager } from '@gravito/sentinel'
import type { TokenService } from '@infrastructure/auth/TokenService'

export class AuthController {
  /**
   * POST /auth/register
   * 用戶註冊
   */
  async register(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as any
    const registerUseCase = ctx.app.make('RegisterUserUseCase') as RegisterUserUseCase

    try {
      const result = await registerUseCase.execute(body)
      return ctx.json({ success: true, data: result }, 201)
    } catch (_error: any) {
      return ctx.json({ success: false, error: _error.message }, 400)
    }
  }

  /**
   * POST /auth/login
   * 用戶登入，返回 Access Token 和 Refresh Token
   */
  async login(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as any
    const loginUseCase = ctx.app.make('LoginUserUseCase') as LoginUserUseCase
    const tokenService = ctx.app.make('TokenService') as TokenService

    try {
      // 執行登入業務邏輯
      const user = await loginUseCase.execute(body)

      // 生成 Token
      const accessToken = tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      })

      const refreshToken = tokenService.generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      })

      // 返回用戶信息和 Token
      return ctx.json(
        {
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
            tokens: {
              accessToken,
              refreshToken,
              expiresIn: 3600,
              tokenType: 'Bearer',
            },
          },
        },
        200
      )
    } catch (_error: any) {
      return ctx.json(
        {
          success: false,
          error: _error.message,
        },
        401
      )
    }
  }

  /**
   * POST /auth/refresh
   * 刷新 Token
   */
  async refreshToken(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as any
    const _refreshTokenUseCase = ctx.app.make('RefreshTokenUseCase') as RefreshTokenUseCase
    const tokenService = ctx.app.make('TokenService') as TokenService

    try {
      // 驗證 Refresh Token
      const payload = tokenService.verifyRefreshToken(body.refreshToken)
      if (!payload) {
        throw new Error('Invalid or expired refresh token')
      }

      // 生成新 Token
      const accessToken = tokenService.generateAccessToken(payload)
      const refreshToken = tokenService.generateRefreshToken(payload)

      return ctx.json(
        {
          success: true,
          data: {
            accessToken,
            refreshToken,
            expiresIn: 3600,
            tokenType: 'Bearer',
          },
        },
        200
      )
    } catch (_error: any) {
      return ctx.json(
        {
          success: false,
          error: _error.message,
        },
        401
      )
    }
  }

  /**
   * POST /auth/logout
   * 用戶登出
   */
  async logout(ctx: GravitoContext) {
    const auth = ctx.get('auth') as AuthManager
    const tokenBlacklist = ctx.app.make('TokenBlacklist')

    try {
      // 從 Authorization Header 提取 Token
      const authHeader = ctx.req.header('Authorization')
      const tokenService = ctx.app.make('TokenService') as TokenService
      const token = tokenService.extractTokenFromHeader(authHeader)

      if (token) {
        // 將 Token 添加到黑名單
        const expiry = tokenService.getTokenExpiry(token)
        if (expiry) {
          await tokenBlacklist.add(token, expiry)
        }
      }

      // 登出（清理會話等）
      await auth.logout()

      return ctx.json(
        {
          success: true,
          message: 'Logged out successfully',
        },
        200
      )
    } catch (_error: any) {
      return ctx.json(
        {
          success: false,
          error: _error.message,
        },
        400
      )
    }
  }

  /**
   * GET /auth/me
   * 獲取當前登入用戶信息
   */
  async getProfile(ctx: GravitoContext) {
    const auth = ctx.get('auth') as AuthManager

    try {
      if (!(await auth.check())) {
        return ctx.json(
          {
            success: false,
            error: 'Not authenticated',
          },
          401
        )
      }

      const user = await auth.user()
      return ctx.json(
        {
          success: true,
          data: user,
        },
        200
      )
    } catch (_error: any) {
      return ctx.json(
        {
          success: false,
          error: _error.message,
        },
        400
      )
    }
  }
}
