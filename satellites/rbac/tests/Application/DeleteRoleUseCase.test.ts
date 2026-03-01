import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { DeleteRoleUseCase } from '../../src/Application/UseCases/DeleteRole'
import type {
  IRoleRepository,
  PaginatedResult,
  PaginationOptions,
  RoleFilters,
} from '../../src/Domain/Contracts/IRoleRepository'
import { Role } from '../../src/Domain/Entities/Role'

// InMemory RoleRepository
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
    _filters: RoleFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Role>> {
    return { items: [], total: 0, page: options.page, limit: options.limit }
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

describe('DeleteRoleUseCase', () => {
  let repo: InMemoryRoleRepository
  let core: PlanetCore
  let useCase: DeleteRoleUseCase

  beforeEach(() => {
    repo = new InMemoryRoleRepository()
    core = createMockCore()
    useCase = new DeleteRoleUseCase(repo, core)
  })

  it('成功刪除角色（阻止刪除系統角色）', async () => {
    // 建立一般角色
    const normalRole = Role.create('del-role', 'custom_role', 'Custom Role', {
      isSystem: false,
    })
    repo.seed(normalRole)

    // 確認刪除前存在
    const before = await repo.findById('del-role')
    expect(before).not.toBeNull()

    // 執行刪除
    await useCase.execute('del-role', { isSuper: true })

    // 確認刪除後不存在
    const after = await repo.findById('del-role')
    expect(after).toBeNull()

    // 嘗試刪除系統角色應失敗
    const systemRole = Role.create('sys-role', 'super_admin', 'Super Admin', {
      isSystem: true,
    })
    repo.seed(systemRole)

    await expect(useCase.execute('sys-role', { isSuper: true })).rejects.toThrow(
      'Permission denied'
    )
  })
})
