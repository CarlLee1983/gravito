import { beforeEach, describe, expect, it } from 'bun:test'
import { RevokeRoleFromAdminUseCase } from '../../src/Application/UseCases/RevokeRoleFromAdmin'
import type {
  IRoleRepository,
  PaginatedResult,
  PaginationOptions,
  RoleFilters,
} from '../../src/Domain/Contracts/IRoleRepository'
import { Role } from '../../src/Domain/Entities/Role'

// InMemory RoleRepository（含角色撤銷支援）
class InMemoryRoleRepository implements IRoleRepository {
  private roles = new Map<string, Role>()
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

  // 擴展方法：角色撤銷（UseCase 通過 `as any` 呼叫）
  async revokeRole(adminId: string, roleId: string): Promise<void> {
    this.adminRoles.get(adminId)?.delete(roleId)
  }

  // 輔助：預先指派角色
  assignRoleSync(adminId: string, roleId: string): void {
    if (!this.adminRoles.has(adminId)) {
      this.adminRoles.set(adminId, new Set())
    }
    this.adminRoles.get(adminId)!.add(roleId)
  }

  hasAssignment(adminId: string, roleId: string): boolean {
    return this.adminRoles.get(adminId)?.has(roleId) ?? false
  }

  seed(role: Role): void {
    this.roles.set(role.id, role)
  }
}

describe('RevokeRoleFromAdminUseCase', () => {
  let repo: InMemoryRoleRepository
  let useCase: RevokeRoleFromAdminUseCase

  beforeEach(() => {
    repo = new InMemoryRoleRepository()
    useCase = new RevokeRoleFromAdminUseCase(repo)
  })

  it('成功撤銷管理員的角色', async () => {
    const role = Role.create('revoke-role', 'editor', 'Editor')
    repo.seed(role)
    repo.assignRoleSync('admin-1', 'revoke-role')

    // 確認撤銷前有指派
    expect(repo.hasAssignment('admin-1', 'revoke-role')).toBe(true)

    // 執行撤銷
    await useCase.execute('admin-1', 'revoke-role')

    // 確認撤銷後無指派
    expect(repo.hasAssignment('admin-1', 'revoke-role')).toBe(false)
  })

  it('角色不存在時拋出錯誤', async () => {
    await expect(useCase.execute('admin-1', 'non-existent-role')).rejects.toThrow('Role not found')
  })
})
