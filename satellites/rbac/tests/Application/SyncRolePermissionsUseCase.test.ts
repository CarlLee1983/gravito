import { beforeEach, describe, expect, it } from 'bun:test'
import { SyncRolePermissionsUseCase } from '../../src/Application/UseCases/SyncRolePermissions'
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

describe('SyncRolePermissionsUseCase', () => {
  let repo: InMemoryRoleRepository
  let useCase: SyncRolePermissionsUseCase

  beforeEach(() => {
    repo = new InMemoryRoleRepository()
    useCase = new SyncRolePermissionsUseCase(repo)
  })

  it('同步替換角色的權限', async () => {
    const role = Role.create('sync-role', 'editor', 'Editor', {
      permissionIds: ['old-perm-1', 'old-perm-2'],
    })
    repo.seed(role)

    const result = await useCase.execute('sync-role', ['new-perm-1', 'new-perm-2', 'new-perm-3'])

    expect(result.id).toBe('sync-role')
    expect(result.permissionIds).toEqual(['new-perm-1', 'new-perm-2', 'new-perm-3'])
    expect(result.updatedAt).toBeDefined()
  })

  it('角色不存在時拋出錯誤', async () => {
    await expect(useCase.execute('non-existent-role', ['perm-1'])).rejects.toThrow('Role not found')
  })
})
