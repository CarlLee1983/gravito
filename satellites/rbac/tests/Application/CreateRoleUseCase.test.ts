import { beforeEach, describe, expect, it } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { CreateRoleUseCase } from '../../src/Application/UseCases/CreateRole'
import type {
  IRoleRepository,
  PaginatedResult,
  PaginationOptions,
  RoleFilters,
} from '../../src/Domain/Contracts/IRoleRepository'
import type { Role } from '../../src/Domain/Entities/Role'

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

describe('CreateRoleUseCase', () => {
  let repo: InMemoryRoleRepository
  let core: PlanetCore
  let useCase: CreateRoleUseCase

  beforeEach(() => {
    repo = new InMemoryRoleRepository()
    core = createMockCore()
    useCase = new CreateRoleUseCase(repo, core)
  })

  it('超級管理員可以成功建立角色', async () => {
    const result = await useCase.execute('moderator', 'Moderator', 'Content moderator role', {
      isSuper: true,
    })

    expect(result.name).toBe('moderator')
    expect(result.displayName).toBe('Moderator')
    expect(result.description).toBe('Content moderator role')
    expect(result.isSystem).toBe(false)
    expect(result.id).toBeDefined()
    expect(result.createdAt).toBeDefined()
    expect(result.permissionIds).toEqual([])
  })

  it('非超級管理員建立失敗', async () => {
    await expect(
      useCase.execute('moderator', 'Moderator', 'Content moderator role', { isSuper: false })
    ).rejects.toThrow('Permission denied')
  })
})
