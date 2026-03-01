import { beforeEach, describe, expect, it } from 'bun:test'
import { ListRolesUseCase } from '../../src/Application/UseCases/ListRoles'
import type {
  IRoleRepository,
  PaginatedResult,
  PaginationOptions,
  RoleFilters,
} from '../../src/Domain/Contracts/IRoleRepository'
import { Role } from '../../src/Domain/Entities/Role'

// InMemory RoleRepository（含篩選支援）
class InMemoryRoleRepository implements IRoleRepository {
  private roles = new Map<string, Role>()

  async save(role: Role): Promise<void> {
    this.roles.set(role.id, role)
  }

  async findById(id: string): Promise<Role | null> {
    return this.roles.get(id) ?? null
  }

  async findByName(name: string): Promise<Role | null> {
    for (const role of this.roles.values()) {
      if (role.name === name) return role
    }
    return null
  }

  async findWithPagination(
    filters: RoleFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Role>> {
    let items = Array.from(this.roles.values())

    // 套用篩選
    if (filters.isSystem !== undefined) {
      items = items.filter((r) => r.isSystem === filters.isSystem)
    }
    if (filters.search) {
      const search = filters.search.toLowerCase()
      items = items.filter(
        (r) => r.name.toLowerCase().includes(search) || r.displayName.toLowerCase().includes(search)
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

  async findAll(): Promise<Role[]> {
    return Array.from(this.roles.values())
  }

  async delete(id: string): Promise<void> {
    this.roles.delete(id)
  }

  async exists(name: string): Promise<boolean> {
    for (const role of this.roles.values()) {
      if (role.name === name) return true
    }
    return false
  }

  seed(role: Role): void {
    this.roles.set(role.id, role)
  }
}

describe('ListRolesUseCase', () => {
  let repo: InMemoryRoleRepository
  let useCase: ListRolesUseCase

  beforeEach(() => {
    repo = new InMemoryRoleRepository()
    useCase = new ListRolesUseCase(repo)

    // 種子資料
    repo.seed(
      Role.create('role-1', 'admin', 'Administrator', {
        description: 'Full access',
        isSystem: true,
      })
    )
    repo.seed(
      Role.create('role-2', 'editor', 'Editor', {
        description: 'Content editor',
        isSystem: false,
      })
    )
    repo.seed(
      Role.create('role-3', 'viewer', 'Viewer', {
        description: 'Read-only access',
        isSystem: false,
      })
    )
  })

  it('列表回傳分頁角色', async () => {
    const result = await useCase.execute({}, { page: 1, limit: 10 })

    expect(result.items).toHaveLength(3)
    expect(result.total).toBe(3)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(10)

    // 驗證 DTO 結構
    const firstItem = result.items[0]
    expect(firstItem.id).toBeDefined()
    expect(firstItem.name).toBeDefined()
    expect(firstItem.displayName).toBeDefined()
    expect(firstItem.isSystem).toBeDefined()
    expect(firstItem.permissionIds).toBeDefined()
    expect(firstItem.createdAt).toBeDefined()
  })

  it('篩選條件正確套用（isSystem、search）', async () => {
    // 篩選系統角色
    const systemResult = await useCase.execute({ isSystem: true }, { page: 1, limit: 10 })
    expect(systemResult.items).toHaveLength(1)
    expect(systemResult.items[0].name).toBe('admin')
    expect(systemResult.total).toBe(1)

    // 搜尋名稱
    const searchResult = await useCase.execute({ search: 'editor' }, { page: 1, limit: 10 })
    expect(searchResult.items).toHaveLength(1)
    expect(searchResult.items[0].name).toBe('editor')
  })
})
