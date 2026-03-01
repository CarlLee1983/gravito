import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import type { Context } from 'hono'
import { CreateAdminUseCase } from '../../src/Application/UseCases/CreateAdmin'
import { DeleteAdminUseCase } from '../../src/Application/UseCases/DeleteAdmin'
import { GetAdminUseCase } from '../../src/Application/UseCases/GetAdmin'
import { ListAdminsUseCase } from '../../src/Application/UseCases/ListAdmins'
import { UpdateAdminUseCase } from '../../src/Application/UseCases/UpdateAdmin'
import type {
  AdminFilters,
  IAdminRepository,
  PaginatedResult,
  PaginationOptions,
} from '../../src/Domain/Contracts/IAdminRepository'
import { Admin, AdminStatus } from '../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../src/Domain/ValueObjects/AdminEmail'
import { AdminController } from '../../src/Interface/Http/Controllers/AdminController'

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
    filters: AdminFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Admin>> {
    let results = Array.from(this.admins.values())

    if (filters.status) {
      results = results.filter((a) => a.status === filters.status)
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      results = results.filter(
        (a) => a.name.toLowerCase().includes(search) || a.email.value.includes(search)
      )
    }

    const total = results.length
    const startIdx = (options.page - 1) * options.limit
    const endIdx = startIdx + options.limit
    const items = results.slice(startIdx, endIdx)

    return { items, total, page: options.page, limit: options.limit }
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
  status?: AdminStatus
}): Admin {
  const email = AdminEmail.create(overrides?.email ?? 'admin@test.com')
  const admin = Admin.create(
    overrides?.id ?? 'admin-1',
    email,
    overrides?.name ?? 'Test Admin',
    overrides?.passwordHash ?? 'hashed-password',
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
function createMockContext(options?: {
  params?: Record<string, string>
  query?: Record<string, string>
  json?: unknown
  contextValues?: Record<string, unknown>
}): {
  ctx: Context
  getJsonResponse: () => { data: unknown; status: number } | null
} {
  const contextStore = new Map<string, unknown>()
  let jsonResponse: { data: unknown; status: number } | null = null

  if (options?.contextValues) {
    for (const [key, value] of Object.entries(options.contextValues)) {
      contextStore.set(key, value)
    }
  }

  const ctx = {
    req: {
      param: (name: string) => options?.params?.[name] ?? '',
      query: (name: string) => options?.query?.[name] ?? undefined,
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

describe('AdminController', () => {
  let repo: InMemoryAdminRepository
  let core: PlanetCore
  let controller: AdminController

  beforeEach(() => {
    repo = new InMemoryAdminRepository()
    core = createMockCore()

    const listUseCase = new ListAdminsUseCase(repo)
    const getUseCase = new GetAdminUseCase(repo)
    const createUseCase = new CreateAdminUseCase(repo, core)
    const updateUseCase = new UpdateAdminUseCase(repo, core)
    const deleteUseCase = new DeleteAdminUseCase(repo, core)

    controller = new AdminController(
      listUseCase,
      getUseCase,
      createUseCase,
      updateUseCase,
      deleteUseCase
    )
  })

  it('index() 回傳分頁管理員列表', async () => {
    // 建立多個 admin
    repo.seed(createTestAdmin({ id: 'a1', email: 'a1@test.com', name: 'Admin One' }))
    repo.seed(createTestAdmin({ id: 'a2', email: 'a2@test.com', name: 'Admin Two' }))
    repo.seed(createTestAdmin({ id: 'a3', email: 'a3@test.com', name: 'Admin Three' }))

    const { ctx, getJsonResponse } = createMockContext({
      query: { page: '1', limit: '10' },
    })

    await controller.index(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)

    const data = response!.data as Record<string, unknown>
    expect(data.total).toBe(3)
    expect(data.page).toBe(1)
    expect(data.limit).toBe(10)
    expect(Array.isArray(data.items)).toBe(true)
    expect((data.items as unknown[]).length).toBe(3)
  })

  it('show() 回傳單一管理員', async () => {
    repo.seed(createTestAdmin({ id: 'show-1', email: 'show@test.com', name: 'Show Admin' }))

    const { ctx, getJsonResponse } = createMockContext({
      params: { id: 'show-1' },
    })

    await controller.show(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)

    const data = response!.data as Record<string, unknown>
    expect(data.id).toBe('show-1')
    expect(data.email).toBe('show@test.com')
    expect(data.name).toBe('Show Admin')
  })

  it('store() 超級管理員建立新管理員', async () => {
    const superAdmin = createTestAdmin({
      id: 'super-1',
      email: 'super@test.com',
      isSuper: true,
    })
    repo.seed(superAdmin)

    const { ctx, getJsonResponse } = createMockContext({
      json: {
        email: 'new@test.com',
        name: 'New Admin',
        password: 'new-password',
        isSuper: false,
      },
      contextValues: { admin: superAdmin },
    })

    await controller.store(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(201)

    const data = response!.data as Record<string, unknown>
    expect(data.email).toBe('new@test.com')
    expect(data.name).toBe('New Admin')
    expect(data.isSuper).toBe(false)
  })

  it('update() 修改管理員資料', async () => {
    const superAdmin = createTestAdmin({
      id: 'super-update',
      email: 'super-update@test.com',
      isSuper: true,
    })
    repo.seed(superAdmin)

    repo.seed(
      createTestAdmin({
        id: 'update-1',
        email: 'update@test.com',
        name: 'Original Name',
      })
    )

    const { ctx, getJsonResponse } = createMockContext({
      params: { id: 'update-1' },
      json: { name: 'Updated Name', metadata: { department: 'engineering' } },
      contextValues: { admin: superAdmin },
    })

    await controller.update(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)

    const data = response!.data as Record<string, unknown>
    expect(data.name).toBe('Updated Name')
  })

  it('destroy() 刪除管理員', async () => {
    const superAdmin = createTestAdmin({
      id: 'super-del',
      email: 'super-del@test.com',
      isSuper: true,
    })
    repo.seed(superAdmin)

    const targetAdmin = createTestAdmin({
      id: 'delete-1',
      email: 'delete@test.com',
    })
    repo.seed(targetAdmin)

    const { ctx, getJsonResponse } = createMockContext({
      params: { id: 'delete-1' },
      contextValues: { admin: superAdmin },
    })

    await controller.destroy(ctx)
    const response = getJsonResponse()

    expect(response).not.toBeNull()
    expect(response!.status).toBe(200)
    expect((response!.data as Record<string, unknown>).success).toBe(true)

    // 驗證已刪除
    const deleted = await repo.findById('delete-1')
    expect(deleted).toBeNull()
  })
})
