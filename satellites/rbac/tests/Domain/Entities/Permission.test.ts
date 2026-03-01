import { describe, expect, it } from 'bun:test'
import { Permission } from '../../../src/Domain/Entities/Permission'
import { PermissionKey } from '../../../src/Domain/ValueObjects/PermissionKey'

describe('Permission Entity', () => {
  describe('create() static factory', () => {
    it('should create permission with default values', () => {
      const key = PermissionKey.create('products:create')
      const perm = Permission.create('perm-1', key, 'Create Products')

      expect(perm.id).toBe('perm-1')
      expect(perm.key.value).toBe('products:create')
      expect(perm.groupName).toBe('products')
      expect(perm.action).toBe('create')
      expect(perm.field).toBeUndefined()
      expect(perm.label).toBe('Create Products')
      expect(perm.description).toBeUndefined()
      expect(perm.isSystem).toBe(false)
      expect(perm.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('reconstitute() static factory', () => {
    it('should reconstitute from stored props', () => {
      const key = PermissionKey.reconstitute('orders:read')
      const createdAt = new Date('2025-01-01')

      const perm = Permission.reconstitute('perm-2', {
        key,
        groupName: 'orders',
        action: 'read',
        label: 'Read Orders',
        description: 'View order list',
        isSystem: true,
        createdAt,
      })

      expect(perm.id).toBe('perm-2')
      expect(perm.key.value).toBe('orders:read')
      expect(perm.label).toBe('Read Orders')
      expect(perm.description).toBe('View order list')
      expect(perm.isSystem).toBe(true)
      expect(perm.createdAt).toBe(createdAt)
    })
  })

  describe('getters', () => {
    it('should expose all properties via getters', () => {
      const key = PermissionKey.create('products:update:price')
      const perm = Permission.create('perm-3', key, 'Update Price')

      expect(perm.key.equals(key)).toBe(true)
      expect(perm.groupName).toBe('products')
      expect(perm.action).toBe('update')
      expect(perm.field).toBe('price')
      expect(perm.label).toBe('Update Price')
      expect(perm.isSystem).toBe(false)
    })
  })

  describe('options', () => {
    it('should accept description option', () => {
      const key = PermissionKey.create('catalog:manage')
      const perm = Permission.create('perm-4', key, 'Manage Catalog', {
        description: 'Full catalog management access',
      })

      expect(perm.description).toBe('Full catalog management access')
    })

    it('should accept isSystem flag', () => {
      const key = PermissionKey.create('system:admin')
      const perm = Permission.create('perm-5', key, 'System Admin', {
        isSystem: true,
      })

      expect(perm.isSystem).toBe(true)
    })

    it('should preserve metadata via reconstitute', () => {
      const key = PermissionKey.reconstitute('users:delete')
      const createdAt = new Date('2025-03-15')

      const perm = Permission.reconstitute('perm-6', {
        key,
        groupName: 'users',
        action: 'delete',
        field: undefined,
        label: 'Delete Users',
        description: 'Remove user accounts',
        isSystem: false,
        createdAt,
      })

      expect(perm.label).toBe('Delete Users')
      expect(perm.description).toBe('Remove user accounts')
      expect(perm.isSystem).toBe(false)
      expect(perm.createdAt).toBe(createdAt)
    })
  })
})
