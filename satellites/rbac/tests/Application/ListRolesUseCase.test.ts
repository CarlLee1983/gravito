import { beforeEach, describe, expect, it } from 'bun:test'
import { ListRolesUseCase } from '../../src/Application/UseCases/ListRoles'
import type {
  IRoleRepository,
  PaginatedResult,
  PaginationOptions,
  RoleFilters,
} from '../../src/Domain/Contracts/IRoleRepository'
import { Role } from '../../src/Domain/Entities/Role'

// InMemory RoleRepository
class InMemoryRoleRepository implements IRoleRepository {
  private roles: Role[] = []

  async save(role: Role): Promise<void> {
    const existing = this.roles.findIndex((r) => r.id === role.id)
    if (existing >= 0) {
      this.roles[existing] = role
    } else {
      this.roles.push(role)
    }
  }

  async findById(id: string): Promise<Role | null> {
    return this.roles.find((r) => r.id === id) ?? null
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roles.find((r) => r.name === name) ?? null
  }

  async findWithPagination(
    filters: RoleFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Role>> {
    let filtered = this.roles

    // 篩選 isSystem
    if (filters.isSystem !== undefined) {
      filtered = filtered.filter((r) => r.isSystem === filters.isSystem)
    }

    // 篩選搜尋 (針對 name/displayName)
    if (filters.search) {
      const query = filters.search.toLowerCase()
      filtered = filtered.filter(
        (r) => r.name.toLowerCase().includes(query) || r.displayName.toLowerCase().includes(query)
      )
    }

    const total = filtered.length
    const startIndex = (options.page - 1) * options.limit
    const items = filtered.slice(startIndex, startIndex + options.limit)

    return {
      items,
      total,
      page: options.page,
      limit: options.limit,
    }
  }

  async findAll(): Promise<Role[]> {
    return this.roles
  }

  async delete(id: string): Promise<void> {
    this.roles = this.roles.filter((r) => r.id !== id)
  }

  async exists(name: string): Promise<boolean> {
    return this.roles.some((r) => r.name === name)
  }

  seed(role: Role): void {
    this.roles.push(role)
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
      Role.create('role-1', {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full access',
        isSystem: true,
      })
    )
    repo.seed(
      Role.create('role-2', {
        name: 'editor',
        displayName: 'Editor',
        description: 'Content editor',
        isSystem: false,
      })
    )
    repo.seed(
      Role.create('role-3', {
        name: 'viewer',
        displayName: 'Viewer',
        description: 'Read-only access',
        isSystem: false,
      })
    )
  })

  it('列表回傳分頁角色', async () => {
    const result = await useCase.execute({}, { page: 1, limit: 10 })

    expect(result.total).toBe(3)
    expect(result.items.length).toBe(3)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(10)
  })

  it('篩選條件正確套用（isSystem、search）', async () => {
    // 篩選系統角色
    const systemResult = await useCase.execute({ isSystem: true }, { page: 1, limit: 10 })
    expect(systemResult.items).toHaveLength(1)
    expect(systemResult.items[0].name).toBe('admin')

    // 搜尋 editor
    const searchResult = await useCase.execute({ search: 'editor' }, { page: 1, limit: 10 })
    expect(searchResult.items).toHaveLength(1)
    expect(searchResult.items[0].name).toBe('editor')
  })
})
