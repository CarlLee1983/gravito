import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { UpdateRoleUseCase } from '../../src/Application/UseCases/UpdateRole'
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

describe('UpdateRoleUseCase', () => {
  let repo: InMemoryRoleRepository
  let core: PlanetCore
  let useCase: UpdateRoleUseCase

  beforeEach(() => {
    repo = new InMemoryRoleRepository()
    core = createMockCore()
    useCase = new UpdateRoleUseCase(repo, core)
  })

  it('成功更新角色的顯示名稱和描述', async () => {
    const role = Role.create('update-role', 'editor', 'Old Editor', {
      description: 'Old description',
    })
    repo.seed(role)

    const result = await useCase.execute('update-role', 'New Editor Name', 'Updated description', {
      isSuper: true,
    })

    expect(result.id).toBe('update-role')
    expect(result.displayName).toBe('New Editor Name')
    expect(result.description).toBe('Updated description')
    expect(result.name).toBe('editor') // name 不變
    expect(result.updatedAt).toBeDefined()
  })
})
