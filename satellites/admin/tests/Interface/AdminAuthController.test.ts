import { beforeEach, describe, expect, it } from 'bun:test'
import type { GravitoContext, PlanetCore } from '@gravito/core'
import { LoginAdminUseCase } from '../../src/Application/UseCases/LoginAdmin'
import { LogoutAdminUseCase } from '../../src/Application/UseCases/LogoutAdmin'
import { RefreshAdminTokenUseCase } from '../../src/Application/UseCases/RefreshAdminToken'
import type {
  AdminFilters,
  IAdminRepository,
  PaginatedResult,
  PaginationOptions,
} from '../../src/Domain/Contracts/IAdminRepository'
import { Admin, AdminStatus } from '../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../src/Domain/ValueObjects/AdminEmail'
import { AdminTokenBlacklist } from '../../src/Infrastructure/TokenBlacklist/AdminTokenBlacklist'
import { AdminAuthController } from '../../src/Interface/Http/Controllers/AdminAuthController'
import { JwtAdminAuthStrategy } from '../../src/Interface/Http/Strategies/JwtAdminAuthStrategy'

// InMemory AdminRepository
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
      if (admin.email.value === email) return admin
    }
    return null
  }

  async findByPasswordResetToken(_token: string): Promise<Admin | null> {
    return null
  }

  async findWithPagination(
    _filters: AdminFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Admin>> {
    return { items: [], total: 0, page: options.page, limit: options.limit }
  }

  async delete(id: string): Promise<void> {
    this.admins.delete(id)
  }

  async exists(email: string): Promise<boolean> {
    for (const admin of this.admins.values()) {
      if (admin.email.value === email) return true
    }
    return false
  }

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
      applyFilters: async (_tag: string, value: unknown) => value,
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
}): Admin {
  const email = AdminEmail.create(overrides?.email ?? 'admin@test.com')
  return Admin.create(
    overrides?.id ?? 'admin-1',
    email,
    overrides?.name ?? 'Test Admin',
    overrides?.passwordHash ?? 'correct-password',
    { isSuper: overrides?.isSuper ?? false }
  )
}

// Mock Hono Context
function createMockContext(options?: { json?: unknown; contextValues?: Record<string, unknown> }): {
  ctx: GravitoContext
  getJsonResponse: () => { data: unknown; status: number } | null
} {
  const contextStore = new Map<string, unknown>()
  let jsonResponse: { data: unknown; status: number } | null = null

  // 預設 context 值
  if (options?.contextValues) {
    for (const [key, value] of Object.entries(options.contextValues)) {
      contextStore.set(key, value)
    }
  }

  const ctx = {
    req: {
      json: async () => options?.json ?? {},
    },
    json: (data: unknown, status: number) => {
      jsonResponse = { data, status }
      return new Response(JSON.stringify(data), { status })
    },
    get: (key: string) => contextStore.get(key),
    set: (key: string, value: unknown) => contextStore.set(key, value),
  } as unknown as Context

  return { ctx, getJsonResponse: () => jsonResponse }
}

describe('AdminAuthController', () => {
  let repo: InMemoryAdminRepository
  let jwtStrategy: JwtAdminAuthStrategy
  let tokenBlacklist: AdminTokenBlacklist
  let core: PlanetCore
  let loginUseCase: LoginAdminUseCase
  let refreshUseCase: RefreshAdminTokenUseCase
  let logoutUseCase: LogoutAdminUseCase
  let controller: AdminAuthController

  beforeEach(() => {
    repo = new InMemoryAdminRepository()
    jwtStrategy = new JwtAdminAuthStrategy()
    tokenBlacklist = new AdminTokenBlacklist()
    core = createMockCore()

    loginUseCase = new LoginAdminUseCase(repo, jwtStrategy, core)
    refreshUseCase = new RefreshAdminTokenUseCase(jwtStrategy)
    logoutUseCase = new LogoutAdminUseCase(tokenBlacklist, jwtStrategy)

    controller = new AdminAuthController(loginUseCase, refreshUseCase, logoutUseCase)
  })

  it('login() 有效憑證回傳 tokens', async () => {
    const admin = createTestAdmin({
      id: 'login-1',
      email: 'login@test.com',
      passwordHash: 'correct-password',
    })
    repo.seed(admin)

    const { ctx, getJsonResponse } = createMockContext({
      json: { email: 'login@test.com', password: 'correct-password' },
    })

    await controller.login(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)
    expect(response!.data).toHaveProperty('accessToken')
    expect(response!.data).toHaveProperty('refreshToken')
    expect(response!.data).toHaveProperty('admin')
    expect((response!.data as Record<string, unknown>).admin).toHaveProperty('email')
  })

  it('login() 無效憑證拋出錯誤', async () => {
    const admin = createTestAdmin({
      email: 'login@test.com',
      passwordHash: 'correct-password',
    })
    repo.seed(admin)

    const { ctx } = createMockContext({
      json: { email: 'login@test.com', password: 'wrong-password' },
    })

    await expect(controller.login(ctx)).rejects.toThrow()
  })

  it('refresh() 回傳新的 access token', async () => {
    // 先登入取得 refresh token
    const admin = createTestAdmin({
      id: 'refresh-1',
      email: 'refresh@test.com',
      passwordHash: 'correct-password',
    })
    repo.seed(admin)
    const tokens = jwtStrategy.issueCredentials(admin)

    const { ctx, getJsonResponse } = createMockContext({
      json: { refreshToken: tokens.refreshToken },
    })

    await controller.refresh(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)
    expect(response!.data).toHaveProperty('accessToken')
    expect(typeof (response!.data as Record<string, unknown>).accessToken).toBe('string')
  })

  it('logout() 將 token 加入黑名單', async () => {
    const admin = createTestAdmin({
      id: 'logout-1',
      email: 'logout@test.com',
    })
    repo.seed(admin)
    const tokens = jwtStrategy.issueCredentials(admin)

    const { ctx, getJsonResponse } = createMockContext({
      contextValues: {
        adminToken: tokens.accessToken,
      },
    })

    await controller.logout(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)
    expect((response!.data as Record<string, unknown>).success).toBe(true)

    // 驗證 token 已加入黑名單
    expect(tokenBlacklist.isBlacklisted(tokens.accessToken)).toBe(true)
  })

  it('me() 回傳已認證的 admin 資料', async () => {
    const admin = createTestAdmin({
      id: 'me-1',
      email: 'me@test.com',
      name: 'Me Admin',
    })

    const { ctx, getJsonResponse } = createMockContext({
      contextValues: { admin },
    })

    await controller.me(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)

    const data = response!.data as Record<string, unknown>
    expect(data.id).toBe('me-1')
    expect(data.email).toBe('me@test.com')
    expect(data.name).toBe('Me Admin')
    // 不應包含 passwordHash
    expect(data).not.toHaveProperty('passwordHash')
  })
})
