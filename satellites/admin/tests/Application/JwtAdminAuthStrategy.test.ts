import { describe, expect, it } from 'bun:test'
import { Admin } from '../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../src/Domain/ValueObjects/AdminEmail'
import { JwtAdminAuthStrategy } from '../../src/Interface/Http/Strategies/JwtAdminAuthStrategy'

// 建立測試用 helper
function createTestAdmin(overrides?: {
  id?: string
  email?: string
  name?: string
  isSuper?: boolean
}): Admin {
  const email = AdminEmail.create(overrides?.email ?? 'admin@test.com')
  return Admin.create(
    overrides?.id ?? 'admin-1',
    email,
    overrides?.name ?? 'Test Admin',
    'hashed-password',
    { isSuper: overrides?.isSuper ?? false }
  )
}

describe('JwtAdminAuthStrategy', () => {
  const strategy = new JwtAdminAuthStrategy()

  it('issueCredentials() 回傳有效的 access 和 refresh tokens', () => {
    const admin = createTestAdmin({ isSuper: true })

    const result = strategy.issueCredentials(admin)

    // 驗證 token 結構
    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()
    expect(result.expiresIn).toBe(15 * 60) // 15 分鐘
    expect(typeof result.accessToken).toBe('string')
    expect(typeof result.refreshToken).toBe('string')

    // 驗證 access token payload
    const accessPayload = strategy.verifyToken(result.accessToken)
    expect(accessPayload.sub).toBe(admin.id)
    expect(accessPayload.email).toBe(admin.email.value)
    expect(accessPayload.isSuper).toBe(true)
    expect(accessPayload.type).toBe('access')

    // 驗證 refresh token payload
    const refreshPayload = strategy.verifyToken(result.refreshToken)
    expect(refreshPayload.sub).toBe(admin.id)
    expect(refreshPayload.type).toBe('refresh')
  })

  it('verifyToken() 正確提取 payload', () => {
    const admin = createTestAdmin({
      id: 'admin-verify',
      email: 'verify@test.com',
      isSuper: false,
    })

    const tokens = strategy.issueCredentials(admin)
    const payload = strategy.verifyToken(tokens.accessToken)

    expect(payload.sub).toBe('admin-verify')
    expect(payload.email).toBe('verify@test.com')
    expect(payload.isSuper).toBe(false)
    expect(payload.type).toBe('access')
    expect(payload.iat).toBeDefined()
    expect(payload.exp).toBeDefined()
    expect(payload.exp).toBeGreaterThan(payload.iat)
  })

  it('verifyToken() 在 token 過期時拋出錯誤', () => {
    // 建立一個過期的 token（手動模擬）
    const expiredPayload = {
      sub: 'admin-1',
      email: 'admin@test.com',
      isSuper: false,
      iat: Math.floor(Date.now() / 1000) - 3600, // 1 小時前
      exp: Math.floor(Date.now() / 1000) - 1800, // 30 分鐘前（已過期）
      type: 'access' as const,
    }
    const encoded = Buffer.from(JSON.stringify(expiredPayload)).toString('base64')
    const expiredToken = `${encoded}.signature`

    expect(() => strategy.verifyToken(expiredToken)).toThrow('Token has expired')
  })

  it('refreshAccessToken() 使用 refresh token 簽發新的 access token', () => {
    const admin = createTestAdmin({ id: 'admin-refresh' })
    const tokens = strategy.issueCredentials(admin)

    // 使用 refresh token 刷新
    const newAccessToken = strategy.refreshAccessToken(tokens.refreshToken)

    expect(typeof newAccessToken).toBe('string')

    // 驗證新 token 的 payload
    const payload = strategy.verifyToken(newAccessToken)
    expect(payload.sub).toBe('admin-refresh')
    expect(payload.type).toBe('access')
    // 新 token 的 iat 應大於等於原始 token
    const originalPayload = strategy.verifyToken(tokens.accessToken)
    expect(payload.iat).toBeGreaterThanOrEqual(originalPayload.iat)
  })
})
