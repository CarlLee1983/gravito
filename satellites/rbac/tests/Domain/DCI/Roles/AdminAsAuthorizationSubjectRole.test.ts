import { describe, expect, it } from 'bun:test'
import { AdminAsAuthorizationSubjectRole } from '../../../../src/Domain/DCI/Roles/AdminAsAuthorizationSubjectRole'
import { Permission } from '../../../../src/Domain/Entities/Permission'
import { Role } from '../../../../src/Domain/Entities/Role'
import { PermissionKey } from '../../../../src/Domain/ValueObjects/PermissionKey'
import { InMemoryPermissionRepository } from '../../../../src/Infrastructure/Persistence/AtlasPermissionRepository'
import { InMemoryRoleRepository } from '../../../../src/Infrastructure/Persistence/AtlasRoleRepository'

describe('AdminAsAuthorizationSubjectRole', () => {
  it('should grant all permissions to super admin', async () => {
    const superAdmin = { id: 'admin-1', isSuper: true }
    const roleRepo = new InMemoryRoleRepository()
    const permissionRepo = new InMemoryPermissionRepository()

    const authSubject = new AdminAsAuthorizationSubjectRole(superAdmin, roleRepo, permissionRepo)

    const hasPermission = await authSubject.hasPermission(PermissionKey.create('products:create'))
    expect(hasPermission).toBe(true)
  })

  it('should deny permission for non-super admin without roles', async () => {
    const normalAdmin = { id: 'admin-2', isSuper: false }
    const roleRepo = new InMemoryRoleRepository()
    const permissionRepo = new InMemoryPermissionRepository()

    const authSubject = new AdminAsAuthorizationSubjectRole(normalAdmin, roleRepo, permissionRepo)

    const hasPermission = await authSubject.hasPermission(PermissionKey.create('products:create'))
    expect(hasPermission).toBe(false)
  })

  it('should check permission based on assigned roles', async () => {
    const normalAdmin = { id: 'admin-3', isSuper: false }
    const roleRepo = new InMemoryRoleRepository()
    const permissionRepo = new InMemoryPermissionRepository()

    // 建立權限
    const permKey = PermissionKey.create('products:read')
    const permission = Permission.create('perm-1', permKey, 'Read Products')
    await permissionRepo.save(permission)

    // 建立角色並指派權限
    const role = Role.create('role-1', {
      name: 'viewer',
      displayName: 'Viewer',
      permissionIds: ['perm-1'],
    })
    await roleRepo.save(role)
    await roleRepo.assignRole(normalAdmin.id, role.id)

    const authSubject = new AdminAsAuthorizationSubjectRole(normalAdmin, roleRepo, permissionRepo)

    const hasPermission = await authSubject.hasPermission(PermissionKey.create('products:read'))
    expect(hasPermission).toBe(true)
  })

  it('should deny permission not in assigned roles', async () => {
    const normalAdmin = { id: 'admin-4', isSuper: false }
    const roleRepo = new InMemoryRoleRepository()
    const permissionRepo = new InMemoryPermissionRepository()

    // 建立權限
    const readKey = PermissionKey.create('products:read')
    const readPerm = Permission.create('perm-1', readKey, 'Read Products')
    await permissionRepo.save(readPerm)

    // 建立角色並指派 read 權限
    const role = Role.create('role-1', {
      name: 'viewer',
      displayName: 'Viewer',
      permissionIds: ['perm-1'],
    })
    await roleRepo.save(role)
    await roleRepo.assignRole(normalAdmin.id, role.id)

    const authSubject = new AdminAsAuthorizationSubjectRole(normalAdmin, roleRepo, permissionRepo)

    // 應該有 read 權限
    const hasRead = await authSubject.hasPermission(readKey)
    expect(hasRead).toBe(true)

    // 應該沒有 create 權限
    const hasCreate = await authSubject.hasPermission(PermissionKey.create('products:create'))
    expect(hasCreate).toBe(false)
  })
})
