import { beforeEach, describe, expect, it } from 'bun:test'
import type {
  AdminFilters,
  IAdminRepository,
  PaginatedResult,
  PaginationOptions,
} from '../../src/Domain/Contracts/IAdminRepository'
import { Admin, AdminStatus } from '../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../src/Domain/ValueObjects/AdminEmail'
import { AdminServiceProvider } from '../../src/index'

// 模擬 IoC Container
class MockContainer {
  private bindings = new Map<string, { factory: Function; isSingleton: boolean }>()
  private instances = new Map<string, unknown>()

  singleton(key: string, factory: Function): void {
    this.bindings.set(key, { factory, isSingleton: true })
  }

  factory(key: string, factory: Function): void {
    this.bindings.set(key, { factory, isSingleton: false })
  }

  make(key: string): unknown {
    // 如果已有 singleton 實例，直接回傳
    if (this.instances.has(key)) {
      return this.instances.get(key)
    }

    const binding = this.bindings.get(key)
    if (!binding) {
      return undefined
    }

    const instance = binding.factory(this)
    if (binding.isSingleton) {
      this.instances.set(key, instance)
    }
    return instance
  }

  has(key: string): boolean {
    return this.bindings.has(key)
  }
}

// 模擬 Router
class MockRouter {
  private routes: Array<{ method: string; path: string }> = []

  get(path: string, ...handlers: Function[]): void {
    this.routes.push({ method: 'GET', path })
  }

  post(path: string, ...handlers: Function[]): void {
    this.routes.push({ method: 'POST', path })
  }

  patch(path: string, ...handlers: Function[]): void {
    this.routes.push({ method: 'PATCH', path })
  }

  put(path: string, ...handlers: Function[]): void {
    this.routes.push({ method: 'PUT', path })
  }

  delete(path: string, ...handlers: Function[]): void {
    this.routes.push({ method: 'DELETE', path })
  }

  getRoutes(): Array<{ method: string; path: string }> {
    return this.routes
  }
}

// Mock PlanetCore
function createMockCore(): {
  container: MockContainer
  hooks: {
    doAction: Function
    addAction: Function
    addFilter: Function
    applyFilters: Function
  }
} {
  const container = new MockContainer()
  const router = new MockRouter()

  // 先註冊 router
  container.singleton('router', () => router)

  return {
    container,
    hooks: {
      doAction: async () => {},
      addAction: () => {},
      addFilter: () => {},
      applyFilters: async (_tag: string, value: unknown) => value,
    },
  }
}

describe('AdminServiceProvider', () => {
  let core: ReturnType<typeof createMockCore>
  let provider: AdminServiceProvider

  beforeEach(() => {
    core = createMockCore()
    provider = new AdminServiceProvider(core)
  })

  it('register() 綁定所有依賴到容器', () => {
    provider.register()

    // 驗證 Repository
    expect(core.container.has('admin.repository')).toBe(true)
    expect(core.container.make('admin.repository')).toBeDefined()

    // 驗證 Token Blacklist
    expect(core.container.has('admin.tokenBlacklist')).toBe(true)
    expect(core.container.make('admin.tokenBlacklist')).toBeDefined()

    // 驗證 JWT Strategy
    expect(core.container.has('admin.jwtStrategy')).toBe(true)
    expect(core.container.make('admin.jwtStrategy')).toBeDefined()

    // 驗證 UseCases
    expect(core.container.has('admin.loginUseCase')).toBe(true)
    expect(core.container.has('admin.refreshUseCase')).toBe(true)
    expect(core.container.has('admin.logoutUseCase')).toBe(true)
    expect(core.container.has('admin.listUseCase')).toBe(true)
    expect(core.container.has('admin.getUseCase')).toBe(true)
    expect(core.container.has('admin.createUseCase')).toBe(true)
    expect(core.container.has('admin.updateUseCase')).toBe(true)
    expect(core.container.has('admin.deleteUseCase')).toBe(true)

    // 驗證 Controllers
    expect(core.container.has('admin.authController')).toBe(true)
    expect(core.container.has('admin.controller')).toBe(true)
  })

  it('boot() 掛載路由', async () => {
    provider.register()
    await provider.boot()

    // 取得 router 並檢查已掛載的路由
    const router = core.container.make('router') as MockRouter
    const routes = router.getRoutes()

    // 應該有以下路由
    const routePaths = routes.map((r) => `${r.method} ${r.path}`)

    // 認證路由
    expect(routePaths).toContain('POST /api/admin/auth/login')
    expect(routePaths).toContain('POST /api/admin/auth/refresh')
    expect(routePaths).toContain('POST /api/admin/auth/logout')
    expect(routePaths).toContain('GET /api/admin/auth/me')

    // Admin CRUD 路由
    expect(routePaths).toContain('GET /api/admin/v1/admins')
    expect(routePaths).toContain('GET /api/admin/v1/admins/:id')
    expect(routePaths).toContain('POST /api/admin/v1/admins')
    expect(routePaths).toContain('PATCH /api/admin/v1/admins/:id')
    expect(routePaths).toContain('DELETE /api/admin/v1/admins/:id')
  })

  it('bootstrapSuperAdmin() 建立預設管理員', async () => {
    provider.register()
    await provider.boot()

    // 從 container 取得 repository 來驗證
    const repo = core.container.make('admin.repository') as IAdminRepository

    // 應該已建立預設 super admin
    const admin = await repo.findByEmail('admin@example.com')
    expect(admin).not.toBeNull()
    expect(admin!.isSuper).toBe(true)
    expect(admin!.name).toBe('系統管理員')
  })

  it('bootstrapSuperAdmin() 已存在時跳過', async () => {
    provider.register()

    // 先手動建立同 email 的 admin
    const repo = core.container.make('admin.repository') as IAdminRepository
    const email = AdminEmail.create('admin@example.com')
    const existingAdmin = Admin.create('existing-1', email, 'Existing Admin', 'existing-password', {
      isSuper: true,
    })
    await repo.save(existingAdmin)

    // boot 時應跳過
    await provider.boot()

    // 應該還是原本的 admin
    const admin = await repo.findByEmail('admin@example.com')
    expect(admin).not.toBeNull()
    expect(admin!.id).toBe('existing-1')
    expect(admin!.name).toBe('Existing Admin')
  })
})
