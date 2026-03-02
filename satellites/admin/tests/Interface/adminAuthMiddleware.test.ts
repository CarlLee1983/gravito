import { beforeEach, describe, expect, it } from 'bun:test'
import type { GravitoContext, PlanetCore } from '@gravito/core'
import type {
  AdminFilters,
  IAdminRepository,
  PaginatedResult,
  PaginationOptions,
} from '../../src/Domain/Contracts/IAdminRepository'
import { Admin, AdminStatus } from '../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../src/Domain/ValueObjects/AdminEmail'
import { adminAuthMiddleware } from '../../src/Interface/Http/Middleware/adminAuthMiddleware'
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
  isSuper?: boolean
  status?: AdminStatus
}): Admin {
  const email = AdminEmail.create(overrides?.email ?? 'admin@test.com')
  const admin = Admin.create(
    overrides?.id ?? 'admin-1',
    email,
    overrides?.name ?? 'Test Admin',
    'hashed-password',
    { isSuper: overrides?.isSuper ?? false }
  )

  if (overrides?.status === AdminStatus.SUSPENDED) {
    admin.suspend()
  }
  if (overrides?.status === AdminStatus.INACTIVE) {
    admin.deactivate()
  }

  return admin
}

// Mock Hono Context
function createMockContext(options?: { headers?: Record<string, string> }): {
  ctx: GravitoContext
  contextStore: Map<string, unknown>
  getJsonResponse: () => { data: unknown; status: number } | null
} {
  const contextStore = new Map<string, unknown>()
  let jsonResponse: { data: unknown; status: number } | null = null

  const ctx = {
    req: {
      header: (name: string) => options?.headers?.[name] ?? null,
    },
    json: (data: unknown, status: number) => {
      jsonResponse = { data, status }
      return { data, status }
    },
    get: (key: string) => contextStore.get(key),
    set: (key: string, value: unknown) => contextStore.set(key, value),
  } as unknown as Context

  return { ctx, contextStore, getJsonResponse: () => jsonResponse }
}

describe('adminAuthMiddleware', () => {
  let repo: InMemoryAdminRepository
  let jwtStrategy: JwtAdminAuthStrategy
  let core: PlanetCore
  let middleware: (ctx: GravitoContext, next: () => Promise<void>) => Promise<Response | void>

  beforeEach(() => {
    repo = new InMemoryAdminRepository()
    jwtStrategy = new JwtAdminAuthStrategy()
    core = createMockCore()
    middleware = adminAuthMiddleware(core, jwtStrategy, repo)
  })

  it('有效 Bearer token 通過驗證', async () => {
    // 建立 admin 並簽發 token
    const admin = createTestAdmin({ id: 'admin-auth-1', email: 'auth@test.com' })
    repo.seed(admin)
    const tokens = jwtStrategy.issueCredentials(admin)

    const { ctx, contextStore } = createMockContext({
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    })

    let nextCalled = false
    const next: () => Promise<void> = async () => {
      nextCalled = true
    }

    await middleware(ctx, next)

    expect(nextCalled).toBe(true)
    expect(contextStore.get('admin')).toBeDefined()
    expect(contextStore.get('adminToken')).toBe(tokens.accessToken)
  })

  it('缺少 Authorization header 回傳 401', async () => {
    const { ctx, getJsonResponse } = createMockContext({ headers: {} })

    let nextCalled = false
    const next: () => Promise<void> = async () => {
      nextCalled = true
    }

    await middleware(ctx, next)

    expect(nextCalled).toBe(false)
    const response = getJsonResponse()
    expect(response).not.toBeNull()
    expect(response!.status).toBe(401)
    expect((response!.data as Record<string, unknown>).error).toBe('Unauthorized')
  })

  it('無效 token 格式回傳 401', async () => {
    const { ctx, getJsonResponse } = createMockContext({
      headers: { Authorization: 'InvalidFormat token123' },
    })

    let nextCalled = false
    const next: () => Promise<void> = async () => {
      nextCalled = true
    }

    await middleware(ctx, next)

    expect(nextCalled).toBe(false)
    const response = getJsonResponse()
    expect(response).not.toBeNull()
    expect(response!.status).toBe(401)
    expect((response!.data as Record<string, unknown>).error).toBe('Unauthorized')
  })

  it('有效 token 將 admin 設定到 context', async () => {
    const admin = createTestAdmin({
      id: 'admin-ctx-1',
      email: 'ctx@test.com',
      name: 'Context Admin',
    })
    repo.seed(admin)
    const tokens = jwtStrategy.issueCredentials(admin)

    const { ctx, contextStore } = createMockContext({
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    })

    const next: () => Promise<void> = async () => {}
    await middleware(ctx, next)

    const storedAdmin = contextStore.get('admin') as Admin
    expect(storedAdmin).toBeDefined()
    expect(storedAdmin.id).toBe('admin-ctx-1')
    expect(storedAdmin.email.value).toBe('ctx@test.com')
    expect(storedAdmin.name).toBe('Context Admin')
    expect(contextStore.get('adminToken')).toBe(tokens.accessToken)
  })
})
