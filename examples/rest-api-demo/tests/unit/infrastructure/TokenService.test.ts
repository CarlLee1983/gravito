/**
 * TokenService 單元測試
 *
 * 測試 JWT Token 的生成、驗證、解析等功能
 * 測試覆蓋率目標：95%+
 */

import { type TokenPayload, TokenService } from '@infrastructure/auth/TokenService'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('TokenService', () => {
  let tokenService: TokenService
  const testAccessSecret = 'test-access-secret-32-chars-long-'
  const testRefreshSecret = 'test-refresh-secret-32-chars-long'

  beforeEach(() => {
    // 使用確定的密鑰進行測試，避免隨機密鑰干擾
    tokenService = new TokenService(testAccessSecret, testRefreshSecret)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('應使用傳入的密鑰初始化', () => {
      const service = new TokenService(testAccessSecret, testRefreshSecret)
      expect(service).toBeDefined()
    })

    it('生產環境缺少密鑰應拋出錯誤', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      process.env.JWT_ACCESS_SECRET = ''
      process.env.JWT_REFRESH_SECRET = ''

      expect(() => {
        new TokenService('', '')
      }).toThrow('JWT_ACCESS_SECRET is required in production')

      process.env.NODE_ENV = originalEnv
      delete process.env.JWT_ACCESS_SECRET
      delete process.env.JWT_REFRESH_SECRET
    })

    it('開發環境應生成隨機密鑰並警告', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const service = new TokenService('', '')

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[SECURITY WARNING]'))
      expect(service).toBeDefined()

      warnSpy.mockRestore()
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('generateAccessToken', () => {
    it('應生成有效的 JWT access token', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      }

      const token = tokenService.generateAccessToken(payload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT 格式：header.payload.signature
    })

    it('應在 token 中包含 userId', () => {
      const payload: TokenPayload = {
        userId: 'user-456',
        email: 'test@example.com',
        role: 'user',
      }

      const token = tokenService.generateAccessToken(payload)
      const decoded = tokenService.decodeToken(token)

      expect(decoded?.userId).toBe('user-456')
    })

    it('應在 token 中包含 email 和 role', () => {
      const payload: TokenPayload = {
        userId: 'user-789',
        email: 'admin@example.com',
        role: 'admin',
      }

      const token = tokenService.generateAccessToken(payload)
      const decoded = tokenService.decodeToken(token)

      expect(decoded?.email).toBe('admin@example.com')
      expect(decoded?.role).toBe('admin')
    })

    it('應設置正確的過期時間（15分鐘）', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      }

      const token = tokenService.generateAccessToken(payload)
      const decoded = tokenService.decodeToken(token)
      const expectedExp = Math.floor(Date.now() / 1000) + 15 * 60

      // 允許 5 秒誤差
      expect(decoded?.exp).toBeGreaterThanOrEqual(expectedExp - 5)
      expect(decoded?.exp).toBeLessThanOrEqual(expectedExp + 5)
    })
  })

  describe('generateRefreshToken', () => {
    it('應生成有效的 JWT refresh token', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      }

      const token = tokenService.generateRefreshToken(payload)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('應設置正確的過期時間（7天）', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      }

      const token = tokenService.generateRefreshToken(payload)
      const decoded = tokenService.decodeToken(token)
      const expectedExp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60

      // 允許 5 秒誤差
      expect(decoded?.exp).toBeGreaterThanOrEqual(expectedExp - 5)
      expect(decoded?.exp).toBeLessThanOrEqual(expectedExp + 5)
    })
  })

  describe('verifyAccessToken', () => {
    it('應驗證有效的 access token', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      }

      const token = tokenService.generateAccessToken(payload)
      const verified = tokenService.verifyAccessToken(token)

      expect(verified).toBeDefined()
      expect(verified?.userId).toBe('user-123')
      expect(verified?.email).toBe('test@example.com')
    })

    it('應拒絕無效簽名的 token', () => {
      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyJ9.invalid_signature'
      const verified = tokenService.verifyAccessToken(fakeToken)

      expect(verified).toBeNull()
    })

    it('應拒絕格式錯誤的 token', () => {
      expect(tokenService.verifyAccessToken('invalid-token')).toBeNull()
      expect(tokenService.verifyAccessToken('')).toBeNull()
      expect(tokenService.verifyAccessToken('not.a.token.at.all')).toBeNull()
    })

    it('應拒絕使用錯誤密鑰簽名的 token', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      }

      const token = tokenService.generateAccessToken(payload)

      // 用不同密鑰建立新的 service
      const wrongService = new TokenService('wrong-secret-key', testRefreshSecret)
      const verified = wrongService.verifyAccessToken(token)

      expect(verified).toBeNull()
    })
  })

  describe('verifyRefreshToken', () => {
    it('應驗證有效的 refresh token', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      }

      const token = tokenService.generateRefreshToken(payload)
      const verified = tokenService.verifyRefreshToken(token)

      expect(verified).toBeDefined()
      expect(verified?.userId).toBe('user-123')
    })

    it('應拒絕使用錯誤密鑰簽名的 refresh token', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      }

      const token = tokenService.generateRefreshToken(payload)

      const wrongService = new TokenService(testAccessSecret, 'wrong-refresh-secret')
      const verified = wrongService.verifyRefreshToken(token)

      expect(verified).toBeNull()
    })
  })

  describe('decodeToken', () => {
    it('應解析有效的 token（不驗證簽名）', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      }

      const token = tokenService.generateAccessToken(payload)
      const decoded = tokenService.decodeToken(token)

      expect(decoded?.userId).toBe('user-123')
      expect(decoded?.email).toBe('test@example.com')
      expect(decoded?.role).toBe('user')
    })

    it('應解析無效簽名的 token（因為不驗證）', () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyJ9.invalid'
      const decoded = tokenService.decodeToken(fakeToken)

      expect(decoded?.userId).toBe('user-123')
    })

    it('應返回 null 對於格式錯誤的 token', () => {
      expect(tokenService.decodeToken('invalid')).toBeNull()
      expect(tokenService.decodeToken('')).toBeNull()
    })
  })

  describe('extractTokenFromHeader', () => {
    it('應從 Bearer authorization header 提取 token', () => {
      const token = 'abc123def456'
      const header = `Bearer ${token}`

      const extracted = tokenService.extractTokenFromHeader(header)
      expect(extracted).toBe(token)
    })

    it('應處理大小寫差異', () => {
      const token = 'abc123def456'
      const extracted = tokenService.extractTokenFromHeader(`bearer ${token}`)

      expect(extracted).toBe(token)
    })

    it('應處理多餘的空白字符', () => {
      const token = 'abc123def456'
      const extracted = tokenService.extractTokenFromHeader(`  Bearer   ${token}  `)

      expect(extracted).toBe(token)
    })

    it('應拒絕缺少 Bearer 前綴', () => {
      expect(tokenService.extractTokenFromHeader('abc123')).toBeNull()
      expect(tokenService.extractTokenFromHeader('Token abc123')).toBeNull()
    })

    it('應拒絕空的 authorization header', () => {
      expect(tokenService.extractTokenFromHeader('')).toBeNull()
      expect(tokenService.extractTokenFromHeader(undefined)).toBeNull()
    })

    it('應拒絕格式錯誤的 header（缺少 token）', () => {
      expect(tokenService.extractTokenFromHeader('Bearer ')).toBeNull()
      expect(tokenService.extractTokenFromHeader('Bearer')).toBeNull()
    })
  })

  describe('getTokenExpiry', () => {
    it('應返回有效 token 的過期時間', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      }

      const token = tokenService.generateAccessToken(payload)
      const expiry = tokenService.getTokenExpiry(token)

      // 應該是未來時間（毫秒）
      expect(expiry).toBeGreaterThan(Date.now())
      // access token 過期時間應該在 15 分鐘內
      expect(expiry).toBeLessThan(Date.now() + 16 * 60 * 1000)
    })

    it('應返回 null 對於無效 token', () => {
      expect(tokenService.getTokenExpiry('invalid-token')).toBeNull()
    })

    it('應對無過期時間的 token 返回 null', () => {
      // 創建沒有 exp claim 的 token
      const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyJ9.signature'
      const expiry = tokenService.getTokenExpiry(fakeToken)

      expect(expiry).toBeNull()
    })
  })

  describe('集成測試', () => {
    it('應完整處理 token 生命週期', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      }

      // 1. 生成 token
      const token = tokenService.generateAccessToken(payload)
      expect(token).toBeDefined()

      // 2. 從 header 提取 token
      const authHeader = `Bearer ${token}`
      const extracted = tokenService.extractTokenFromHeader(authHeader)
      expect(extracted).toBe(token)

      // 3. 驗證 token
      const verified = tokenService.verifyAccessToken(extracted!)
      expect(verified?.userId).toBe('user-123')

      // 4. 取得過期時間
      const expiry = tokenService.getTokenExpiry(token)
      expect(expiry).toBeGreaterThan(Date.now())
    })

    it('應分開管理 access 和 refresh token', () => {
      const payload: TokenPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      }

      // 生成兩種 token
      const accessToken = tokenService.generateAccessToken(payload)
      const refreshToken = tokenService.generateRefreshToken(payload)

      // 它們應該是不同的
      expect(accessToken).not.toBe(refreshToken)

      // 都應該能被各自的驗證方法驗證
      expect(tokenService.verifyAccessToken(accessToken)).toBeDefined()
      expect(tokenService.verifyRefreshToken(refreshToken)).toBeDefined()

      // 但不能交叉驗證（因為使用不同的密鑰）
      // access token 不應該通過 refresh 驗證
      expect(tokenService.verifyRefreshToken(accessToken)).toBeNull()
      expect(tokenService.verifyAccessToken(refreshToken)).toBeNull()
    })
  })
})
