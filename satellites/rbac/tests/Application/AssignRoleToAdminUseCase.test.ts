import { beforeEach, describe, expect, it } from 'bun:test'
import { AssignRoleToAdminUseCase } from '../../src/Application/UseCases/AssignRoleToAdmin'
import type {
  IRoleRepository,
  PaginatedResult,
  PaginationOptions,
  RoleFilters,
} from '../../src/Domain/Contracts/IRoleRepository'
import { Role } from '../../src/Domain/Entities/Role'

// InMemory RoleRepository（含角色指派支援）
class InMemoryRoleRepository implements IRoleRepository {
  private roles = new Map<string, Role>()
  // 追蹤 admin-role 指派
  private adminRoles = new Map<string, Set<string>>()

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

  // 擴展方法：角色指派（UseCase 通過 `as any` 呼叫）
  async assignRole(adminId: string, roleId: string): Promise<void> {
    if (!this.adminRoles.has(adminId)) {
      this.adminRoles.set(adminId, new Set())
    }
    this.adminRoles.get(adminId)!.add(roleId)
  }

  // 輔助方法：檢查指派
  hasAssignment(adminId: string, roleId: string): boolean {
    return this.adminRoles.get(adminId)?.has(roleId) ?? false
  }

  seed(role: Role): void {
    this.roles.set(role.id, role)
  }
}

describe('AssignRoleToAdminUseCase', () => {
  let repo: InMemoryRoleRepository
  let useCase: AssignRoleToAdminUseCase

  beforeEach(() => {
    repo = new InMemoryRoleRepository()
    useCase = new AssignRoleToAdminUseCase(repo)
  })

  it('成功指派角色給管理員', async () => {
    const role = Role.create('assign-role', 'editor', 'Editor')
    repo.seed(role)

    await useCase.execute('admin-1', 'assign-role')

    // 驗證指派成功
    expect(repo.hasAssignment('admin-1', 'assign-role')).toBe(true)
  })

  it('角色不存在時拋出錯誤', async () => {
    await expect(useCase.execute('admin-1', 'non-existent-role')).rejects.toThrow('Role not found')
  })
})
