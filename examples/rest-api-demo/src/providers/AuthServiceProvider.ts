/**
 * Auth Service Provider
 *
 * 註冊認證系統的所有服務到 IoC 容器
 */

import { LogoutUserUseCase } from '@application/auth/LogoutUser'
import { RefreshTokenUseCase } from '@application/auth/RefreshToken'
import { LoginUserUseCase } from '@application/user/LoginUser'
import { RegisterUserUseCase } from '@application/user/RegisterUser'
import { authConfig } from '@config/auth'
import { type Container, type PlanetCore, ServiceProvider } from '@gravito/core'
import type { AuthConfig } from '@gravito/sentinel'
import { InMemoryTokenBlacklist } from '@infrastructure/auth/TokenBlacklist'
import { TokenService } from '@infrastructure/auth/TokenService'
import type { UserRepository } from '@infrastructure/repositories/UserRepository'
import * as bcrypt from 'bcrypt'

export class AuthServiceProvider extends ServiceProvider {
  /**
   * 註冊認證服務
   */
  register(container: Container): void {
    // 註冊 Token Service
    container.singleton('TokenService', () => {
      return new TokenService(process.env.JWT_ACCESS_SECRET, process.env.JWT_REFRESH_SECRET)
    })

    // 註冊 Token 黑名單
    container.singleton('TokenBlacklist', () => {
      return new InMemoryTokenBlacklist()
    })

    // 註冊認證配置
    container.singleton('auth.config', () => authConfig as AuthConfig)

    // 註冊 AuthManager（延遲初始化，需要請求上下文）
    container.singleton('auth.factory', () => {
      const userRepository = container.make('UserRepository') as UserRepository

      // 配置用戶提供者回調
      const _userProvider = {
        async retrieveById(id: string) {
          return await userRepository.findById(id)
        },

        async retrieveByCredentials(credentials: Record<string, any>) {
          if (!credentials.email) {
            return null
          }
          return await userRepository.findByEmail(credentials.email)
        },

        async validateCredentials(user: any, credentials: Record<string, any>) {
          // 使用 bcrypt 安全地驗證密碼
          if (!user.password || !credentials.password) {
            return false
          }
          return await bcrypt.compare(credentials.password, user.password)
        },
      }

      return { userProvider: _userProvider }
    })

    // 註冊 Use Cases
    container.singleton('LoginUserUseCase', () => {
      const userRepository = container.make('UserRepository') as UserRepository
      return new LoginUserUseCase(userRepository)
    })

    container.singleton('RegisterUserUseCase', () => {
      const userRepository = container.make('UserRepository') as UserRepository
      const eventManager = (this.core as PlanetCore).events
      return new RegisterUserUseCase(userRepository, eventManager)
    })

    container.singleton('RefreshTokenUseCase', () => {
      const tokenService = container.make('TokenService') as TokenService
      return new RefreshTokenUseCase(tokenService)
    })

    container.singleton('LogoutUserUseCase', () => {
      return new LogoutUserUseCase()
    })
  }

  /**
   * 啟動認證服務
   */
  async boot(_core: PlanetCore): Promise<void> {
    // 驗證生產環境的必要環境變數
    if (process.env.NODE_ENV === 'production') {
      const requiredSecrets = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'JWT_SECRET']
      const missingSecrets = requiredSecrets.filter((secret) => !process.env[secret])

      if (missingSecrets.length > 0) {
        throw new Error(`缺少必要的環境變數（生產環境）: ${missingSecrets.join(', ')}`)
      }
    }

    console.log('[Auth] 認證系統已初始化')
    console.log('[Auth] - JWT Guard 已啟用')
    console.log('[Auth] - Token Service 已註冊')
    console.log('[Auth] - Token Blacklist 已啟用')
  }

  /**
   * 關閉認證服務
   */
  async shutdown(_core: PlanetCore): Promise<void> {
    console.log('[Auth] 認證服務已關閉')
  }
}
