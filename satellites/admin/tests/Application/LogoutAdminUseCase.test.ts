import { beforeEach, describe, expect, it } from 'bun:test'
import { LogoutAdminUseCase } from '../../src/Application/UseCases/LogoutAdmin'
import { Admin } from '../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../src/Domain/ValueObjects/AdminEmail'
import { AdminTokenBlacklist } from '../../src/Infrastructure/TokenBlacklist/AdminTokenBlacklist'
import { JwtAdminAuthStrategy } from '../../src/Interface/Http/Strategies/JwtAdminAuthStrategy'

// 建立測試用 Admin
function createTestAdmin(): Admin {
  const email = AdminEmail.create('logout@test.com')
  return Admin.create('logout-admin', email, 'Logout Admin', 'hashed-pw')
}

describe('LogoutAdminUseCase', () => {
  let tokenBlacklist: AdminTokenBlacklist
  let jwtStrategy: JwtAdminAuthStrategy
  let useCase: LogoutAdminUseCase

  beforeEach(() => {
    tokenBlacklist = new AdminTokenBlacklist()
    jwtStrategy = new JwtAdminAuthStrategy()
    useCase = new LogoutAdminUseCase(tokenBlacklist, jwtStrategy)
  })

  it('登出將 token 加入黑名單', async () => {
    const admin = createTestAdmin()
    const tokens = jwtStrategy.issueCredentials(admin)

    // 登出前：token 不在黑名單中
    expect(tokenBlacklist.isBlacklisted(tokens.accessToken)).toBe(false)

    // 執行登出
    await useCase.execute(tokens.accessToken)

    // 登出後：token 在黑名單中
    expect(tokenBlacklist.isBlacklisted(tokens.accessToken)).toBe(true)
  })

  it('已加入黑名單的 token 被阻止使用', async () => {
    const admin = createTestAdmin()
    const tokens = jwtStrategy.issueCredentials(admin)

    // 執行登出
    await useCase.execute(tokens.accessToken)

    // 驗證黑名單狀態
    expect(tokenBlacklist.isBlacklisted(tokens.accessToken)).toBe(true)

    // 統計驗證
    const stats = tokenBlacklist.getStats()
    expect(stats.total).toBe(1)
  })
})
