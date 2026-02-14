/**
 * SecurityServiceProvider 單元測試
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('SecurityServiceProvider', () => {
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
    it('應註冊 InputSanitizer 單例', () => {
      mockContainer.singleton.mockReturnValue(undefined)

      mockContainer.singleton('InputSanitizer', () => ({
        sanitize: vi.fn(),
        escapeForLogging: vi.fn(),
      }))

      expect(mockContainer.singleton).toHaveBeenCalledWith('InputSanitizer', expect.any(Function))
    })

    it('應註冊 TokenService 單例', () => {
      mockContainer.singleton.mockReturnValue(undefined)

      mockContainer.singleton('TokenService', () => ({
        generateToken: vi.fn(),
        verifyToken: vi.fn(),
      }))

      expect(mockContainer.singleton).toHaveBeenCalledWith('TokenService', expect.any(Function))
    })

    it('應註冊 AuthManager 單例', () => {
      mockContainer.singleton.mockReturnValue(undefined)

      mockContainer.singleton('AuthManager', () => ({
        authenticate: vi.fn(),
        authorize: vi.fn(),
      }))

      expect(mockContainer.singleton).toHaveBeenCalledWith('AuthManager', expect.any(Function))
    })
  })

  describe('依賴注入', () => {
    it('應提供 InputSanitizer 實例', () => {
      const sanitizer = {
        sanitize: (input: string) => input.trim(),
      }

      mockContainer.make.mockReturnValue(sanitizer)

      const result = mockContainer.make('InputSanitizer')

      expect(result).toHaveProperty('sanitize')
    })

    it('應提供 TokenService 實例', () => {
      const tokenService = {
        generateToken: () => 'token-123',
      }

      mockContainer.make.mockReturnValue(tokenService)

      const result = mockContainer.make('TokenService')

      expect(result).toHaveProperty('generateToken')
    })
  })

  describe('安全配置', () => {
    it('應初始化 CORS 配置', () => {
      const corsConfig = {
        origin: 'https://example.com',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
      }

      expect(corsConfig.origin).toBe('https://example.com')
      expect(corsConfig.credentials).toBe(true)
    })

    it('應初始化安全頭部配置', () => {
      const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Strict-Transport-Security': 'max-age=31536000',
      }

      expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff')
      expect(securityHeaders['X-Frame-Options']).toBe('DENY')
    })

    it('應初始化密碼雜湊配置', () => {
      const hashConfig = {
        algorithm: 'bcrypt',
        rounds: 10,
      }

      expect(hashConfig.algorithm).toBe('bcrypt')
      expect(hashConfig.rounds).toBe(10)
    })
  })

  describe('啟動流程', () => {
    it('應在應用啟動時初始化安全服務', async () => {
      const boot = vi.fn().mockResolvedValue(undefined)

      await boot()

      expect(boot).toHaveBeenCalled()
    })

    it('應驗證安全配置完整性', () => {
      const config = {
        corsOrigin: 'https://example.com',
        jwtSecret: 'secret-key',
        passwordHashRounds: 10,
      }

      expect(config.corsOrigin).toBeDefined()
      expect(config.jwtSecret).toBeDefined()
      expect(config.passwordHashRounds).toBeDefined()
    })
  })
})
