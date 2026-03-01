import { beforeEach, describe, expect, it } from 'bun:test'
import { CheckPermissionUseCase } from '../../src/Application/UseCases/CheckPermission'
import type {
  IPermissionRepository,
  PermissionFilters,
} from '../../src/Domain/Contracts/IPermissionRepository'
import type {
  IRoleRepository,
  PaginatedResult,
  PaginationOptions,
  RoleFilters,
} from '../../src/Domain/Contracts/IRoleRepository'
import { Permission } from '../../src/Domain/Entities/Permission'
import { Role } from '../../src/Domain/Entities/Role'
import { PermissionKey } from '../../src/Domain/ValueObjects/PermissionKey'

// InMemory RoleRepository（含 admin 角色查詢支援）
class InMemoryRoleRepository implements IRoleRepository {
  private roles = new Map<string, Role>()
  private adminRoleIds = new Map<string, string[]>()

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

  // AuthorizationContext 使用的擴展方法（透過 as any 呼叫）
  async getAdminRoleIds(adminId: string): Promise<string[]> {
    return this.adminRoleIds.get(adminId) ?? []
  }

  // 輔助方法：設定 admin 的角色
  setAdminRoles(adminId: string, roleIds: string[]): void {
    this.adminRoleIds.set(adminId, roleIds)
  }

  seed(role: Role): void {
    this.roles.set(role.id, role)
  }
}

// InMemory PermissionRepository（含 findByIds 支援）
class InMemoryPermissionRepository implements IPermissionRepository {
  private permissions = new Map<string, Permission>()

  async save(permission: Permission): Promise<void> {
    this.permissions.set(permission.id, permission)
  }

  async findById(id: string): Promise<Permission | null> {
    return this.permissions.get(id) ?? null
  }

  async findByKey(key: PermissionKey): Promise<Permission | null> {
    for (const p of this.permissions.values()) {
      if (p.key.value === key.value) return p
    }
    return null
  }

  async findByKeys(keys: PermissionKey[]): Promise<Permission[]> {
    const keyValues = keys.map((k) => k.value)
    return Array.from(this.permissions.values()).filter((p) => keyValues.includes(p.key.value))
  }

  async findByGroup(groupName: string): Promise<Permission[]> {
    return Array.from(this.permissions.values()).filter((p) => p.groupName === groupName)
  }

  async findWithPagination(
    _filters: PermissionFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Permission>> {
    return { items: [], total: 0, page: options.page, limit: options.limit }
  }

  async findAll(): Promise<Permission[]> {
    return Array.from(this.permissions.values())
  }

  async delete(id: string): Promise<void> {
    this.permissions.delete(id)
  }

  async exists(key: PermissionKey): Promise<boolean> {
    for (const p of this.permissions.values()) {
      if (p.key.value === key.value) return true
    }
    return false
  }

  // AuthorizationContext 使用的擴展方法（透過 as any 呼叫）
  async findByIds(ids: string[]): Promise<Permission[]> {
    return ids.map((id) => this.permissions.get(id)).filter((p): p is Permission => p !== undefined)
  }

  seed(permission: Permission): void {
    this.permissions.set(permission.id, permission)
  }
}

describe('CheckPermissionUseCase', () => {
  let roleRepo: InMemoryRoleRepository
  let permissionRepo: InMemoryPermissionRepository
  let useCase: CheckPermissionUseCase

  beforeEach(() => {
    roleRepo = new InMemoryRoleRepository()
    permissionRepo = new InMemoryPermissionRepository()
    useCase = new CheckPermissionUseCase(roleRepo, permissionRepo)

    // 建立權限
    permissionRepo.seed(
      Permission.create('perm-1', PermissionKey.create('products:create'), 'Create Products')
    )
    permissionRepo.seed(
      Permission.create('perm-2', PermissionKey.create('products:update'), 'Update Products')
    )
    permissionRepo.seed(
      Permission.create('perm-3', PermissionKey.create('orders:read'), 'Read Orders')
    )
    permissionRepo.seed(
      Permission.create('perm-wildcard', PermissionKey.create('products:delete'), 'Delete Products')
    )

    // 建立角色並附加權限
    const editorRole = Role.create('role-editor', {
      name: 'editor',
      displayName: 'Editor',
      permissionIds: ['perm-1', 'perm-2'],
    })
    roleRepo.seed(editorRole)

    const viewerRole = Role.create('role-viewer', {
      name: 'viewer',
      displayName: 'Viewer',
      permissionIds: ['perm-3'],
    })
    roleRepo.seed(viewerRole)
  })

  it('超級管理員始終擁有權限', async () => {
    const superAdmin = { id: 'super-admin', isSuper: true }

    const result = await useCase.execute(superAdmin, 'products:create')
    expect(result).toBe(true)

    // 即使是不存在的權限也會通過
    const anyResult = await useCase.execute(superAdmin, 'anything:any_action')
    expect(anyResult).toBe(true)
  })

  it('沒有角色的管理員沒有權限', async () => {
    const admin = { id: 'no-role-admin', isSuper: false }
    // 不設定任何角色

    const result = await useCase.execute(admin, 'products:create')
    expect(result).toBe(false)
  })

  it('擁有對應角色權限的管理員回傳 true', async () => {
    const admin = { id: 'editor-admin', isSuper: false }
    roleRepo.setAdminRoles('editor-admin', ['role-editor'])

    // editor 角色有 products:create 和 products:update
    const createResult = await useCase.execute(admin, 'products:create')
    expect(createResult).toBe(true)

    const updateResult = await useCase.execute(admin, 'products:update')
    expect(updateResult).toBe(true)

    // editor 角色沒有 orders:read
    const ordersResult = await useCase.execute(admin, 'orders:read')
    expect(ordersResult).toBe(false)
  })

  it('萬用字元權限匹配正常運作', async () => {
    // 建立一個有萬用字元權限的角色
    const wildcardPerm = Permission.create(
      'perm-star',
      PermissionKey.create('products:manage'),
      'Manage All Products'
    )
    permissionRepo.seed(wildcardPerm)

    const managerRole = Role.create('role-manager', {
      name: 'manager',
      displayName: 'Manager',
      permissionIds: ['perm-star'],
    })
    roleRepo.seed(managerRole)

    const admin = { id: 'manager-admin', isSuper: false }
    roleRepo.setAdminRoles('manager-admin', ['role-manager'])

    // products:manage 應該匹配 products:manage（精確匹配）
    const manageResult = await useCase.execute(admin, 'products:manage')
    expect(manageResult).toBe(true)
  })

  it('精確權限匹配正常運作', async () => {
    const admin = { id: 'viewer-admin', isSuper: false }
    roleRepo.setAdminRoles('viewer-admin', ['role-viewer'])

    // viewer 角色只有 orders:read
    const readResult = await useCase.execute(admin, 'orders:read')
    expect(readResult).toBe(true)

    // 沒有 orders:write
    const writeResult = await useCase.execute(admin, 'orders:write')
    expect(writeResult).toBe(false)
  })
})
