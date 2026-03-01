import { describe, expect, it } from 'bun:test'
import { Role } from '../../../src/Domain/Entities/Role'

describe('Role Entity', () => {
  describe('create() static factory', () => {
    it('should create role with empty permissions by default', () => {
      const role = Role.create('role-1', {
        name: 'editor',
        displayName: 'Editor',
      })

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

  describe('setPermissionIds()', () => {
    it('should set permissions', () => {
      const role = Role.create('role-1', {
        name: 'editor',
        displayName: 'Editor',
      })

      role.setPermissionIds(['perm-1'])

      expect(role.permissionIds).toEqual(['perm-1'])
      expect(role.updatedAt).toBeInstanceOf(Date)
    })

    it('should replace permissions entirely', () => {
      const role = Role.create('role-1', {
        name: 'editor',
        displayName: 'Editor',
        permissionIds: ['perm-1', 'perm-2'],
      })

      role.setPermissionIds(['perm-3', 'perm-4'])

      expect(role.permissionIds).toEqual(['perm-3', 'perm-4'])
      expect(role.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('setDisplayName()', () => {
    it('should update display name', () => {
      const role = Role.create('role-1', {
        name: 'editor',
        displayName: 'Editor',
      })

      role.setDisplayName('Senior Editor')

      expect(role.displayName).toBe('Senior Editor')
      expect(role.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('setDescription()', () => {
    it('should update description', () => {
      const role = Role.create('role-1', {
        name: 'editor',
        displayName: 'Editor',
        description: 'Original description',
      })

      role.setDescription('Experienced content editor')

      expect(role.description).toBe('Experienced content editor')
      expect(role.updatedAt).toBeInstanceOf(Date)
    })

    it('should clear description when set to undefined', () => {
      const role = Role.create('role-1', {
        name: 'editor',
        displayName: 'Editor',
        description: 'Original description',
      })

      role.setDescription(undefined)

      expect(role.description).toBeUndefined()
      expect(role.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('propsObject getter', () => {
    it('should return a copy of props', () => {
      const role = Role.create('role-1', {
        name: 'editor',
        displayName: 'Editor',
        description: 'Test role',
        isSystem: false,
        permissionIds: ['perm-1'],
      })

      const props = role.propsObject

      expect(props.name).toBe('editor')
      expect(props.displayName).toBe('Editor')
      expect(props.description).toBe('Test role')
      expect(props.isSystem).toBe(false)
      expect(props.permissionIds).toEqual(['perm-1'])
      expect(props.createdAt).toBeInstanceOf(Date)

      // Verify it's a copy
      props.permissionIds.push('perm-2')
      expect(role.permissionIds).toEqual(['perm-1'])
    })
  })
})
