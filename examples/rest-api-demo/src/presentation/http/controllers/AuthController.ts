/**
 * Auth Controller
 *
 * 處理認證相關的 REST 端點
 */

import type { LoginUserUseCase } from '@application/user/LoginUser'
import type { RegisterUserUseCase } from '@application/user/RegisterUser'
import type { GravitoContext, GravitoVariables, PlanetCore } from '@gravito/core'
import type { AuthManager } from '@gravito/sentinel'
import type { TokenService } from '@infrastructure/auth/TokenService'
import { LoginRequest } from '@presentation/http/requests/auth/LoginRequest'
import { RegisterRequest } from '@presentation/http/requests/auth/RegisterRequest'

/**
 * 從 GravitoContext 獲取容器服務的輔助函數
 */
function resolveService<T>(ctx: GravitoContext<GravitoVariables>, key: string): T {
  const core = ctx.get('core') as unknown as PlanetCore
  return core.container.make(key) as T
}

export class AuthController {
  /**
   * POST /auth/register
   * 用戶註冊
   */
  async register(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as Record<string, unknown>
    const registerUseCase = resolveService<RegisterUserUseCase>(ctx, 'RegisterUserUseCase')

    try {
      // 驗證輸入
      const validation = RegisterRequest.safeValidate(body)
      if (!validation.success) {
        return ctx.json({ success: false, errors: validation.errors }, 422)
      }

      const result = await registerUseCase.execute(validation.data!)
      return ctx.json({ success: true, data: result }, 201)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return ctx.json({ success: false, error: message }, 400)
    }
  }

  /**
   * POST /auth/login
   * 用戶登入，返回 Access Token 和 Refresh Token
   */
  async login(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as Record<string, unknown>
    const loginUseCase = resolveService<LoginUserUseCase>(ctx, 'LoginUserUseCase')
    const tokenService = resolveService<TokenService>(ctx, 'TokenService')

    try {
      // 驗證輸入
      const validation = LoginRequest.safeValidate(body)
      if (!validation.success) {
        return ctx.json({ success: false, errors: validation.errors }, 422)
      }

      // 執行登入業務邏輯
      const user = await loginUseCase.execute(validation.data!)

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return ctx.json(
        {
          success: false,
          error: message,
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
    const body = (await ctx.req.json()) as Record<string, unknown>
    const tokenService = resolveService<TokenService>(ctx, 'TokenService')

    try {
      // 驗證 Refresh Token
      const payload = tokenService.verifyRefreshToken(body.refreshToken as string)
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return ctx.json(
        {
          success: false,
          error: message,
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
    const tokenBlacklist = resolveService<any>(ctx, 'TokenBlacklist')

    try {
      // 從 Authorization Header 提取 Token
      const authHeader = ctx.req.header('Authorization')
      const tokenService = resolveService<TokenService>(ctx, 'TokenService')
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return ctx.json(
        {
          success: false,
          error: message,
        },
        400
      )
    }
  }
}
