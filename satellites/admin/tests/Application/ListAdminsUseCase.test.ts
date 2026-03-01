import { beforeEach, describe, expect, it } from 'bun:test'
import { ListAdminsUseCase } from '../../src/Application/UseCases/ListAdmins'
import type {
  AdminFilters,
  IAdminRepository,
  PaginatedResult,
  PaginationOptions,
} from '../../src/Domain/Contracts/IAdminRepository'
import { Admin, AdminStatus } from '../../src/Domain/Entities/Admin'
import { AdminEmail } from '../../src/Domain/ValueObjects/AdminEmail'

// InMemory AdminRepository（含篩選支援）
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

  async findByPasswordResetToken(_token: string): Promise<Admin | null> {
    return null
  }

  async findWithPagination(
    filters: AdminFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Admin>> {
    let items = Array.from(this.admins.values())

    // 套用篩選
    if (filters.status) {
      items = items.filter((a) => a.status === filters.status)
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      items = items.filter(
        (a) => a.name.toLowerCase().includes(search) || a.email.value.toLowerCase().includes(search)
      )
    }

    const total = items.length
    const start = (options.page - 1) * options.limit
    const paged = items.slice(start, start + options.limit)

    return {
      items: paged,
      total,
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

  seed(admin: Admin): void {
    this.admins.set(admin.id, admin)
  }
}

// 建立測試用 Admin
function createTestAdmin(overrides: {
  id: string
  email: string
  name: string
  status?: AdminStatus
}): Admin {
  const email = AdminEmail.create(overrides.email)
  const admin = Admin.create(overrides.id, email, overrides.name, 'hashed-pw')

  if (overrides.status === AdminStatus.SUSPENDED) {
    admin.suspend()
  }
  if (overrides.status === AdminStatus.INACTIVE) {
    admin.deactivate()
  }

  return admin
}

describe('ListAdminsUseCase', () => {
  let repo: InMemoryAdminRepository
  let useCase: ListAdminsUseCase

  beforeEach(() => {
    repo = new InMemoryAdminRepository()
    useCase = new ListAdminsUseCase(repo)

    // 種子資料
    repo.seed(createTestAdmin({ id: 'a1', email: 'alice@test.com', name: 'Alice' }))
    repo.seed(createTestAdmin({ id: 'a2', email: 'bob@test.com', name: 'Bob' }))
    repo.seed(
      createTestAdmin({
        id: 'a3',
        email: 'charlie@test.com',
        name: 'Charlie',
        status: AdminStatus.SUSPENDED,
      })
    )
  })

  it('列表回傳分頁結果', async () => {
    const result = await useCase.execute({}, { page: 1, limit: 10 })

    expect(result.items).toHaveLength(3)
    expect(result.total).toBe(3)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(10)

    // 驗證 DTO 結構（不含 passwordHash）
    const firstItem = result.items[0]
    expect(firstItem.id).toBeDefined()
    expect(firstItem.email).toBeDefined()
    expect(firstItem.name).toBeDefined()
    expect(firstItem.status).toBeDefined()
    expect((firstItem as Record<string, unknown>).passwordHash).toBeUndefined()
  })

  it('篩選條件正確套用（status、search）', async () => {
    // 篩選停用的管理員
    const suspendedResult = await useCase.execute(
      { status: AdminStatus.SUSPENDED },
      { page: 1, limit: 10 }
    )

    expect(suspendedResult.items).toHaveLength(1)
    expect(suspendedResult.items[0].name).toBe('Charlie')
    expect(suspendedResult.total).toBe(1)

    // 搜尋名稱
    const searchResult = await useCase.execute({ search: 'alice' }, { page: 1, limit: 10 })

    expect(searchResult.items).toHaveLength(1)
    expect(searchResult.items[0].email).toBe('alice@test.com')
  })
})
