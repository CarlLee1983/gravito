import { describe, expect, it } from 'bun:test'
import { RoleAsPermissionContainerRole } from '../../../../src/Domain/DCI/Roles/RoleAsPermissionContainerRole'
import { Role } from '../../../../src/Domain/Entities/Role'

describe('RoleAsPermissionContainerRole', () => {
  it('should return permission ids', () => {
    const role = Role.create('role-1', {
      name: 'editor',
      displayName: 'Editor',
      permissionIds: ['perm-1', 'perm-2', 'perm-3'],
    })

    const container = new RoleAsPermissionContainerRole(role)
    const permissions = container.getPermissionIds()

    expect(permissions).toEqual(['perm-1', 'perm-2', 'perm-3'])
  })

  it('should check if role contains specific permission', () => {
    const role = Role.create('role-1', {
      name: 'editor',
      displayName: 'Editor',
      permissionIds: ['perm-1', 'perm-2'],
    })

    const container = new RoleAsPermissionContainerRole(role)

    expect(container.containsPermission('perm-1')).toBe(true)
    expect(container.containsPermission('perm-2')).toBe(true)
    expect(container.containsPermission('perm-3')).toBe(false)
  })

  it('should identify system role', () => {
    const systemRole = Role.create('role-sys', {
      name: 'system_admin',
      displayName: 'System Admin',
      isSystem: true,
    })
    const customRole = Role.create('role-custom', {
      name: 'editor',
      displayName: 'Editor',
      isSystem: false,
    })

    const sysContainer = new RoleAsPermissionContainerRole(systemRole)
    const customContainer = new RoleAsPermissionContainerRole(customRole)

    expect(sysContainer.isSystemRole()).toBe(true)
    expect(customContainer.isSystemRole()).toBe(false)
  })

  it('should provide role info', () => {
    const role = Role.create('role-1', {
      name: 'editor',
      displayName: 'Editor',
      permissionIds: ['perm-1', 'perm-2', 'perm-3'],
    })

    const container = new RoleAsPermissionContainerRole(role)
    const info = container.getInfo()

    expect(info.id).toBe('role-1')
    expect(info.name).toBe('editor')
    expect(info.permissionCount).toBe(3)
  })
})
