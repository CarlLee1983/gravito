import { beforeEach, describe, expect, it } from 'bun:test'
import { RefreshAdminTokenUseCase } from '../../src/Application/UseCases/RefreshAdminToken'
import { Admin } from '../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../src/Domain/ValueObjects/AdminEmail'
import { JwtAdminAuthStrategy } from '../../src/Interface/Http/Strategies/JwtAdminAuthStrategy'

// 建立測試用 Admin
function createTestAdmin(): Admin {
  const email = AdminEmail.create('refresh@test.com')
  return Admin.create('refresh-admin', email, 'Refresh Admin', 'hashed-pw')
}

describe('RefreshAdminTokenUseCase', () => {
  let jwtStrategy: JwtAdminAuthStrategy
  let useCase: RefreshAdminTokenUseCase

  beforeEach(() => {
    jwtStrategy = new JwtAdminAuthStrategy()
    useCase = new RefreshAdminTokenUseCase(jwtStrategy)
  })

  it('刷新回傳新的 access token', async () => {
    const admin = createTestAdmin()
    const tokens = jwtStrategy.issueCredentials(admin)

    const result = await useCase.execute(tokens.refreshToken)

    expect(result.accessToken).toBeDefined()
    expect(typeof result.accessToken).toBe('string')

    // 驗證新的 access token 可以被驗證
    const payload = jwtStrategy.verifyToken(result.accessToken)
    expect(payload.sub).toBe('refresh-admin')
    expect(payload.type).toBe('access')
  })

  it('無效的 refresh token 刷新失敗', async () => {
    await expect(useCase.execute('invalid-token-string')).rejects.toThrow('Token has expired')
  })
})
