import { describe, expect, it } from 'bun:test'
import { Role } from '../../../src/Domain/Entities/Role'

describe('Role Entity', () => {
  describe('create() static factory', () => {
    it('should create role with empty permissions by default', () => {
      const role = Role.create('role-1', 'editor', 'Editor')

      expect(role.id).toBe('role-1')
      expect(role.name).toBe('editor')
      expect(role.displayName).toBe('Editor')
      expect(role.description).toBeUndefined()
      expect(role.isSystem).toBe(false)
      expect(role.permissionIds).toEqual([])
      expect(role.createdAt).toBeInstanceOf(Date)
      expect(role.updatedAt).toBeUndefined()
    })
  })

  describe('reconstitute() static factory', () => {
    it('should reconstitute from stored props', () => {
      const createdAt = new Date('2025-01-01')
      const updatedAt = new Date('2025-06-01')

      const role = Role.reconstitute('role-2', {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full system access',
        isSystem: true,
        permissionIds: ['perm-1', 'perm-2'],
        createdAt,
        updatedAt,
      })

      expect(role.id).toBe('role-2')
      expect(role.name).toBe('admin')
      expect(role.displayName).toBe('Administrator')
      expect(role.description).toBe('Full system access')
      expect(role.isSystem).toBe(true)
      expect(role.permissionIds).toEqual(['perm-1', 'perm-2'])
      expect(role.createdAt).toBe(createdAt)
      expect(role.updatedAt).toBe(updatedAt)
    })
  })

  describe('grantPermission()', () => {
    it('should add new permission', () => {
      const role = Role.create('role-1', 'editor', 'Editor')

      role.grantPermission('perm-1')

      expect(role.permissionIds).toEqual(['perm-1'])
      expect(role.updatedAt).toBeInstanceOf(Date)
    })

    it('should skip duplicate permission (idempotent)', () => {
      const role = Role.create('role-1', 'editor', 'Editor')

      role.grantPermission('perm-1')
      const firstUpdatedAt = role.updatedAt

      role.grantPermission('perm-1')

      expect(role.permissionIds).toEqual(['perm-1'])
      // updatedAt 不應被更新（因為未變更）
      expect(role.updatedAt).toBe(firstUpdatedAt)
    })
  })

  describe('revokePermission()', () => {
    it('should remove existing permission', () => {
      const role = Role.create('role-1', 'editor', 'Editor', {
        permissionIds: ['perm-1', 'perm-2', 'perm-3'],
      })

      role.revokePermission('perm-2')

      expect(role.permissionIds).toEqual(['perm-1', 'perm-3'])
      expect(role.updatedAt).toBeInstanceOf(Date)
    })

    it('should do nothing when revoking non-existent permission', () => {
      const role = Role.create('role-1', 'editor', 'Editor', {
        permissionIds: ['perm-1'],
      })

      role.revokePermission('perm-999')

      expect(role.permissionIds).toEqual(['perm-1'])
    })
  })

  describe('syncPermissions()', () => {
    it('should replace all permissions', () => {
      const role = Role.create('role-1', 'editor', 'Editor', {
        permissionIds: ['perm-1', 'perm-2'],
      })

      role.syncPermissions(['perm-3', 'perm-4', 'perm-5'])

      expect(role.permissionIds).toEqual(['perm-3', 'perm-4', 'perm-5'])
      expect(role.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('hasPermission()', () => {
    it('should check if role has a single permission', () => {
      const role = Role.create('role-1', 'editor', 'Editor', {
        permissionIds: ['perm-1', 'perm-2'],
      })

      expect(role.hasPermission('perm-1')).toBe(true)
      expect(role.hasPermission('perm-2')).toBe(true)
      expect(role.hasPermission('perm-3')).toBe(false)
    })
  })

  describe('hasAllPermissions()', () => {
    it('should check if role has all specified permissions', () => {
      const role = Role.create('role-1', 'editor', 'Editor', {
        permissionIds: ['perm-1', 'perm-2', 'perm-3'],
      })

      expect(role.hasAllPermissions(['perm-1', 'perm-2'])).toBe(true)
      expect(role.hasAllPermissions(['perm-1', 'perm-2', 'perm-3'])).toBe(true)
      expect(role.hasAllPermissions(['perm-1', 'perm-4'])).toBe(false)
      expect(role.hasAllPermissions([])).toBe(true)
    })
  })

  describe('update()', () => {
    it('should modify display name and description', () => {
      const role = Role.create('role-1', 'editor', 'Editor')

      role.update('Senior Editor', 'Experienced content editor')

      expect(role.displayName).toBe('Senior Editor')
      expect(role.description).toBe('Experienced content editor')
      expect(role.updatedAt).toBeInstanceOf(Date)
    })

    it('should update display name only when description is undefined', () => {
      const role = Role.create('role-1', 'editor', 'Editor', {
        description: 'Original description',
      })

      role.update('Updated Editor')

      expect(role.displayName).toBe('Updated Editor')
      // description 保持不變（undefined 不覆蓋）
      expect(role.description).toBe('Original description')
    })
  })
})
