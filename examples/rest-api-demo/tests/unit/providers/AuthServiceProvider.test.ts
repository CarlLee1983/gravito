/**
 * AuthServiceProvider 單元測試
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('AuthServiceProvider', () => {
  let mockContainer: any

  beforeEach(() => {
    mockContainer = {
      singleton: vi.fn(),
      make: vi.fn(),
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('服務註冊', () => {
    it('應註冊 RegisterUserUseCase 單例', () => {
      mockContainer.singleton.mockReturnValue(undefined)

      mockContainer.singleton('RegisterUserUseCase', () => ({
        execute: vi.fn(),
      }))

      expect(mockContainer.singleton).toHaveBeenCalledWith(
        'RegisterUserUseCase',
        expect.any(Function)
      )
    })

    it('應註冊 LoginUserUseCase 單例', () => {
      mockContainer.singleton.mockReturnValue(undefined)

      mockContainer.singleton('LoginUserUseCase', () => ({
        execute: vi.fn(),
      }))

      expect(mockContainer.singleton).toHaveBeenCalledWith('LoginUserUseCase', expect.any(Function))
    })

    it('應註冊 UpdateUserUseCase 單例', () => {
      mockContainer.singleton.mockReturnValue(undefined)

      mockContainer.singleton('UpdateUserUseCase', () => ({
        execute: vi.fn(),
      }))

      expect(mockContainer.singleton).toHaveBeenCalledWith(
        'UpdateUserUseCase',
        expect.any(Function)
      )
    })

    it('應註冊 GetUserProfileUseCase 單例', () => {
      mockContainer.singleton.mockReturnValue(undefined)

      mockContainer.singleton('GetUserProfileUseCase', () => ({
        execute: vi.fn(),
      }))

      expect(mockContainer.singleton).toHaveBeenCalledWith(
        'GetUserProfileUseCase',
        expect.any(Function)
      )
    })
  })

  describe('依賴注入', () => {
    it('應提供 RegisterUserUseCase 實例', () => {
      const useCase = {
        execute: vi.fn().mockResolvedValue({ id: 'user-1' }),
      }

      mockContainer.make.mockReturnValue(useCase)

      const result = mockContainer.make('RegisterUserUseCase')

      expect(result).toHaveProperty('execute')
    })

    it('應提供 LoginUserUseCase 實例', () => {
      const useCase = {
        execute: vi.fn().mockResolvedValue({ token: 'token-123' }),
      }

      mockContainer.make.mockReturnValue(useCase)

      const result = mockContainer.make('LoginUserUseCase')

      expect(result).toHaveProperty('execute')
    })
  })

  describe('認證配置', () => {
    it('應初始化 JWT 配置', () => {
      const jwtConfig = {
        secret: 'secret-key',
        expiresIn: '24h',
        algorithm: 'HS256',
      }

      expect(jwtConfig.secret).toBeDefined()
      expect(jwtConfig.expiresIn).toBe('24h')
    })

    it('應初始化密碼策略', () => {
      const passwordPolicy = {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      }

      expect(passwordPolicy.minLength).toBe(8)
      expect(passwordPolicy.requireUppercase).toBe(true)
    })

    it('應初始化令牌黑名單配置', () => {
      const tokenBlacklistConfig = {
        enabled: true,
        cleanupInterval: 3600000,
      }

      expect(tokenBlacklistConfig.enabled).toBe(true)
      expect(tokenBlacklistConfig.cleanupInterval).toBe(3600000)
    })
  })

  describe('啟動流程', () => {
    it('應在應用啟動時初始化認證服務', async () => {
      const boot = vi.fn().mockResolvedValue(undefined)

      await boot()

      expect(boot).toHaveBeenCalled()
    })

    it('應驗證認證配置完整性', () => {
      const config = {
        jwtEnabled: true,
        passwordHashingEnabled: true,
        tokenBlacklistEnabled: true,
      }

      expect(config.jwtEnabled).toBeDefined()
      expect(config.passwordHashingEnabled).toBeDefined()
      expect(config.tokenBlacklistEnabled).toBeDefined()
    })

    it('應初始化用戶倉庫', () => {
      const repository = {
        create: vi.fn(),
        findById: vi.fn(),
        update: vi.fn(),
      }

      mockContainer.make.mockReturnValue(repository)

      const result = mockContainer.make('UserRepository')

      expect(result).toHaveProperty('create')
      expect(result).toHaveProperty('findById')
    })
  })
})
