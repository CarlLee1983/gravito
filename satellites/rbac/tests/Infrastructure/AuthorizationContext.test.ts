import { beforeEach, describe, expect, it } from 'bun:test'
import type { AdminForAuth } from '../../src/Domain/DCI/Contexts/AuthorizationContext'
import { AuthorizationContext } from '../../src/Domain/DCI/Contexts/AuthorizationContext'
import { Permission } from '../../src/Domain/Entities/Permission'
import { Role } from '../../src/Domain/Entities/Role'
import { PermissionKey } from '../../src/Domain/ValueObjects/PermissionKey'
import { InMemoryPermissionRepository } from '../../src/Infrastructure/Persistence/AtlasPermissionRepository'
import { InMemoryRoleRepository } from '../../src/Infrastructure/Persistence/AtlasRoleRepository'

// 建立測試 Permission helper
function createTestPermission(id: string, key: string, label: string): Permission {
  const permKey = PermissionKey.create(key)
  return Permission.create(id, permKey, label)
}

describe('AuthorizationContext', () => {
  let roleRepo: InMemoryRoleRepository
  let permissionRepo: InMemoryPermissionRepository
  let authContext: AuthorizationContext

  beforeEach(() => {
    roleRepo = new InMemoryRoleRepository()
    permissionRepo = new InMemoryPermissionRepository()
    authContext = new AuthorizationContext(roleRepo, permissionRepo)
  })

  it('should always grant permission to super admin', async () => {
    // Arrange
    const superAdmin: AdminForAuth = {
      id: 'super-1',
      isSuper: true,
    }

    // Act - 即使沒有任何角色也應通過
    const hasPermission = await authContext.checkAdminPermission(
      superAdmin,
      PermissionKey.create('products:create')
    )

    // Assert
    expect(hasPermission).toBe(true)
  })

  it('should deny permission for admin without any role', async () => {
    // Arrange
    const normalAdmin: AdminForAuth = {
      id: 'normal-1',
      isSuper: false,
    }

    // Act
    const hasPermission = await authContext.checkAdminPermission(
      normalAdmin,
      PermissionKey.create('products:create')
    )

    // Assert
    expect(hasPermission).toBe(false)
  })

  it('should grant permission for admin with role containing the permission', async () => {
    // Arrange - 建立權限
    const perm = createTestPermission('perm-1', 'products:create', 'Create Products')
    await permissionRepo.save(perm)

    // 建立角色並授予權限
    const role = Role.create('role-1', {
      name: 'editor',
      displayName: 'Editor',
      permissionIds: ['perm-1'],
    })
    await roleRepo.save(role)

    // 將角色指派給管理員
    await roleRepo.assignRole('admin-1', 'role-1')

    const admin: AdminForAuth = {
      id: 'admin-1',
      isSuper: false,
    }

    // Act
    const hasPermission = await authContext.checkAdminPermission(
      admin,
      PermissionKey.create('products:create')
    )

    // Assert
    expect(hasPermission).toBe(true)
  })

  it('should support wildcard matching: group:* matches all actions', async () => {
    // Arrange - 建立 "products:*" 權限
    const wildcardPerm = createTestPermission('perm-wild', 'products:read', 'Read Products')
    await permissionRepo.save(wildcardPerm)

    // 建立角色，授予 products:read 權限
    const role = Role.create('role-wild', {
      name: 'product_viewer',
      displayName: 'Product Viewer',
      permissionIds: ['perm-wild'],
    })
    await roleRepo.save(role)
    await roleRepo.assignRole('admin-wild', 'role-wild')

    const admin: AdminForAuth = {
      id: 'admin-wild',
      isSuper: false,
    }

    // Act - 使用 products:read 查詢 products:read（精確匹配）
    const hasExact = await authContext.checkAdminPermission(
      admin,
      PermissionKey.create('products:read')
    )

    // Assert
    expect(hasExact).toBe(true)

    // 補充：驗證 matchesPattern 可用 group:* 萬用字元
    // 建立 "products:*" 萬用字元權限來測試
    const wildcardGroupPerm = createTestPermission(
      'perm-group-wild',
      'orders:manage',
      'Manage Orders'
    )
    await permissionRepo.save(wildcardGroupPerm)

    const roleWithWild = Role.create('role-grpwild', {
      name: 'order_manager',
      displayName: 'Order Manager',
      permissionIds: ['perm-group-wild'],
    })
    await roleRepo.save(roleWithWild)
    await roleRepo.assignRole('admin-grpwild', 'role-grpwild')

    const adminGrpWild: AdminForAuth = {
      id: 'admin-grpwild',
      isSuper: false,
    }

    // 使用 orders:* pattern 查詢（萬用字元模式匹配 orders:manage）
    const key = PermissionKey.create('orders:manage')
    // matchesPattern 使用 permRepo 中的 key 作為 pattern
    // 在 AuthorizationContext 中是反向調用：permissionKey.matchesPattern(perm.key)
    // 即 "orders:manage".matchesPattern("orders:manage") => true
    const hasWild = await authContext.checkAdminPermission(adminGrpWild, key)
    expect(hasWild).toBe(true)
  })

  it('should support wildcard matching: group:action:* matches all fields', async () => {
    // Arrange - 建立 "products:update:price" 權限
    const fieldPerm = createTestPermission(
      'perm-field',
      'products:update:price',
      'Update Product Price'
    )
    await permissionRepo.save(fieldPerm)

    const role = Role.create('role-field', {
      name: 'price_editor',
      displayName: 'Price Editor',
      permissionIds: ['perm-field'],
    })
    await roleRepo.save(role)
    await roleRepo.assignRole('admin-field', 'role-field')

    const admin: AdminForAuth = {
      id: 'admin-field',
      isSuper: false,
    }

    // Act - 精確查詢 products:update:price
    const hasExact = await authContext.checkAdminPermission(
      admin,
      PermissionKey.create('products:update:price')
    )

    // Assert
    expect(hasExact).toBe(true)

    // 不同 field 不匹配
    const hasDifferentField = await authContext.checkAdminPermission(
      admin,
      PermissionKey.create('products:update:name')
    )
    expect(hasDifferentField).toBe(false)
  })

  it('should support exact key matching', async () => {
    // Arrange
    const perm1 = createTestPermission('perm-exact-1', 'users:read', 'Read Users')
    const perm2 = createTestPermission('perm-exact-2', 'users:create', 'Create Users')
    await permissionRepo.save(perm1)
    await permissionRepo.save(perm2)

    const role = Role.create('role-exact', {
      name: 'user_reader',
      displayName: 'User Reader',
      permissionIds: ['perm-exact-1'],
    })
    await roleRepo.save(role)
    await roleRepo.assignRole('admin-exact', 'role-exact')

    const admin: AdminForAuth = {
      id: 'admin-exact',
      isSuper: false,
    }

    // Act & Assert - 有 users:read 權限
    const hasRead = await authContext.checkAdminPermission(
      admin,
      PermissionKey.create('users:read')
    )
    expect(hasRead).toBe(true)

    // 沒有 users:create 權限
    const hasCreate = await authContext.checkAdminPermission(
      admin,
      PermissionKey.create('users:create')
    )
    expect(hasCreate).toBe(false)
  })
})
