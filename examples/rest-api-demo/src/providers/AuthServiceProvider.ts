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
import { type Container, ServiceProvider } from '@gravito/core'
import type { AuthConfig } from '@gravito/sentinel'
import { AuthManager } from '@gravito/sentinel'
import { InMemoryTokenBlacklist } from '@infrastructure/auth/TokenBlacklist'
import { TokenService } from '@infrastructure/auth/TokenService'
import type { UserRepository } from '@infrastructure/repositories/UserRepository'

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

    // 註冊 AuthManager
    container.singleton('auth', (c: Container) => {
      const config = c.make('auth.config') as AuthConfig
      const userRepository = c.make('UserRepository') as UserRepository

      const manager = new AuthManager(config)

      // 配置用戶提供者回調
      const userProvider = {
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
          // TODO: 使用 bcrypt 驗證密碼
          // const hasher = c.make('hasher')
          // return await hasher.check(credentials.password, user.password)
          return credentials.password === user.password // 臨時實現
        },
      }

      // 設置提供者
      manager.setProvider('users', userProvider)

      return manager
    })

    // 註冊 Use Cases
    container.singleton('LoginUserUseCase', (c: Container) => {
      const userRepository = c.make('UserRepository') as UserRepository
      return new LoginUserUseCase(userRepository)
    })

    container.singleton('RegisterUserUseCase', (c: Container) => {
      const userRepository = c.make('UserRepository') as UserRepository
      return new RegisterUserUseCase(userRepository)
    })

    container.singleton('RefreshTokenUseCase', () => {
      return new RefreshTokenUseCase()
    })

    container.singleton('LogoutUserUseCase', () => {
      return new LogoutUserUseCase()
    })
  }

  /**
   * 啟動認證服務
   */
  async boot(container: Container): Promise<void> {
    // 驗證必要的環境變數
    if (!process.env.JWT_ACCESS_SECRET) {
      console.warn('[Auth] JWT_ACCESS_SECRET 未設置，使用預設值')
    }

    if (!process.env.JWT_REFRESH_SECRET) {
      console.warn('[Auth] JWT_REFRESH_SECRET 未設置，使用預設值')
    }

    console.log('[Auth] ✅ 認證系統已初始化')
    console.log('[Auth] - JWT Guard 已啟用')
    console.log('[Auth] - Token Service 已註冊')
    console.log('[Auth] - Token Blacklist 已啟用')
  }

  /**
   * 關閉認證服務
   */
  async shutdown(container: Container): Promise<void> {
    // 清理黑名單
    // const blacklist = container.make('TokenBlacklist')
    // await blacklist.clear()

    console.log('[Auth] 認證服務已關閉')
  }
}
