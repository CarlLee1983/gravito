import { beforeEach, describe, expect, it } from 'bun:test'
import { GetRoleUseCase } from '../../src/Application/UseCases/GetRole'
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

describe('GetRoleUseCase', () => {
  let repo: InMemoryRoleRepository
  let useCase: GetRoleUseCase

  beforeEach(() => {
    repo = new InMemoryRoleRepository()
    useCase = new GetRoleUseCase(repo)
  })

  it('依 ID 回傳角色 DTO', async () => {
    const role = Role.create('get-role-1', {
      name: 'editor',
      displayName: 'Editor',
      description: 'Content editor role',
      isSystem: false,
      permissionIds: ['perm-1', 'perm-2'],
    })
    repo.seed(role)

    const result = await useCase.execute('get-role-1')

    expect(result.id).toBe('get-role-1')
    expect(result.name).toBe('editor')
    expect(result.displayName).toBe('Editor')
    expect(result.description).toBe('Content editor role')
    expect(result.isSystem).toBe(false)
    expect(result.permissionIds).toEqual(['perm-1', 'perm-2'])
    expect(result.createdAt).toBeDefined()
  })
})
