import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { LoginAdminUseCase } from '../../src/Application/UseCases/LoginAdmin'
import type {
  AdminFilters,
  IAdminRepository,
  PaginatedResult,
  PaginationOptions,
} from '../../src/Domain/Contracts/IAdminRepository'
import { Admin, AdminStatus } from '../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../src/Domain/ValueObjects/AdminEmail'
import { JwtAdminAuthStrategy } from '../../src/Interface/Http/Strategies/JwtAdminAuthStrategy'

// InMemory AdminRepository 用於測試
class InMemoryAdminRepository implements IAdminRepository {
  private admins = new Map<string, Admin>()

  async save(admin: Admin): Promise<void> {
    this.admins.set(admin.id, admin)
  }

  async findById(id: string): Promise<Admin | null> {
    return this.admins.get(id) ?? null
  }

  async findByEmail(email: string): Promise<Admin | null> {
    for (const admin of this.admins.values()) {
      if (admin.email.value === email) {
        return admin
      }
    }
    return null
  }

  async findByPasswordResetToken(token: string): Promise<Admin | null> {
    for (const admin of this.admins.values()) {
      if (admin.passwordResetToken === token) {
        return admin
      }
    }
    return null
  }

  async findWithPagination(
    _filters: AdminFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Admin>> {
    const all = Array.from(this.admins.values())
    return {
      items: all.slice(0, options.limit),
      total: all.length,
      page: options.page,
      limit: options.limit,
    }
  }

  async delete(id: string): Promise<void> {
    this.admins.delete(id)
  }

  async exists(email: string): Promise<boolean> {
    for (const admin of this.admins.values()) {
      if (admin.email.value === email) {
        return true
      }
    }
    return false
  }

  // 輔助方法：預先載入測試資料
  seed(admin: Admin): void {
    this.admins.set(admin.id, admin)
  }
}

// Mock PlanetCore
function createMockCore(): PlanetCore {
  return {
    hooks: {
      doAction: async () => {},
      addAction: () => {},
      addFilter: () => {},
      applyFilters: async (tag: string, value: unknown) => value,
    },
  } as unknown as PlanetCore
}

// 建立測試用 Admin
function createTestAdmin(overrides?: {
  id?: string
  email?: string
  name?: string
  passwordHash?: string
  isSuper?: boolean
  status?: AdminStatus
}): Admin {
  const email = AdminEmail.create(overrides?.email ?? 'admin@test.com')
  const admin = Admin.create(
    overrides?.id ?? 'admin-1',
    email,
    overrides?.name ?? 'Test Admin',
    overrides?.passwordHash ?? 'correct-password',
    { isSuper: overrides?.isSuper ?? false }
  )

  // 如果需要停用狀態
  if (overrides?.status === AdminStatus.SUSPENDED) {
    admin.suspend()
  }
  if (overrides?.status === AdminStatus.INACTIVE) {
    admin.deactivate()
  }

  return admin
}

describe('LoginAdminUseCase', () => {
  let repo: InMemoryAdminRepository
  let jwtStrategy: JwtAdminAuthStrategy
  let core: PlanetCore
  let useCase: LoginAdminUseCase

  beforeEach(() => {
    repo = new InMemoryAdminRepository()
    jwtStrategy = new JwtAdminAuthStrategy()
    core = createMockCore()
    useCase = new LoginAdminUseCase(repo, jwtStrategy, core)
  })

  it('成功登入回傳 admin 和 tokens', async () => {
    // 預先建立管理員（密碼 = 'correct-password'，AdminAuthContext 使用 plaintext 比對）
    const admin = createTestAdmin({
      id: 'login-admin',
      email: 'login@test.com',
      passwordHash: 'correct-password',
    })
    repo.seed(admin)

    const result = await useCase.execute('login@test.com', 'correct-password')

    // 驗證回傳的 DTO 結構
    expect(result.admin.id).toBe('login-admin')
    expect(result.admin.email).toBe('login@test.com')
    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()
    expect(result.expiresIn).toBe(15 * 60)
  })

  it('錯誤密碼登入失敗', async () => {
    const admin = createTestAdmin({
      email: 'login@test.com',
      passwordHash: 'correct-password',
    })
    repo.seed(admin)

    await expect(useCase.execute('login@test.com', 'wrong-password')).rejects.toThrow(
      'Invalid email or password'
    )
  })

  it('停用帳號登入失敗', async () => {
    // 注意：AdminAuthContext 先比對密碼，再檢查狀態
    // 因此密碼必須正確
    const email = AdminEmail.create('inactive@test.com')
    const admin = Admin.reconstitute('inactive-admin', {
      email,
      name: 'Inactive Admin',
      passwordHash: 'correct-password',
      status: AdminStatus.INACTIVE,
      isSuper: false,
      createdAt: new Date(),
    })
    repo.seed(admin)

    await expect(useCase.execute('inactive@test.com', 'correct-password')).rejects.toThrow(
      'inactive'
    )
  })
})
