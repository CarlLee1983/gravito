import { describe, expect, it } from 'bun:test'
import { PermissionKey } from '../../../src/Domain/ValueObjects/PermissionKey'

describe('PermissionKey ValueObject', () => {
  describe('create() parsing', () => {
    it('should parse "group:action" format', () => {
      const key = PermissionKey.create('products:create')

      expect(key.value).toBe('products:create')
      expect(key.group).toBe('products')
      expect(key.action).toBe('create')
      expect(key.field).toBeUndefined()
    })

    it('should parse "group:action:field" format', () => {
      const key = PermissionKey.create('products:update:price')

      expect(key.value).toBe('products:update:price')
      expect(key.group).toBe('products')
      expect(key.action).toBe('update')
      expect(key.field).toBe('price')
    })
  })

  describe('validation', () => {
    it('should reject invalid formats (wrong number of parts)', () => {
      expect(() => PermissionKey.create('single')).toThrow('Invalid permission key format')
      expect(() => PermissionKey.create('a:b:c:d')).toThrow('Invalid permission key format')
    })

    it('should reject empty parts', () => {
      expect(() => PermissionKey.create(':action')).toThrow()
      expect(() => PermissionKey.create('group:')).toThrow()
      expect(() => PermissionKey.create(':')).toThrow()
    })

    it('should enforce lowercase and underscore rules', () => {
      expect(() => PermissionKey.create('Products:create')).toThrow(
        'Only lowercase letters, numbers, and underscores allowed'
      )
      expect(() => PermissionKey.create('products:Create')).toThrow(
        'Only lowercase letters, numbers, and underscores allowed'
      )
      expect(() => PermissionKey.create('pro-ducts:create')).toThrow(
        'Only lowercase letters, numbers, and underscores allowed'
      )

      // 合法：小寫字母、數字、下劃線
      const valid = PermissionKey.create('product_items:create_draft')
      expect(valid.group).toBe('product_items')
      expect(valid.action).toBe('create_draft')
    })
  })

  describe('reconstitute()', () => {
    it('should reconstitute from existing value without validation', () => {
      const key = PermissionKey.reconstitute('orders:read')

      expect(key.value).toBe('orders:read')
      expect(key.group).toBe('orders')
      expect(key.action).toBe('read')
    })
  })

  describe('equals()', () => {
    it('should compare keys by value', () => {
      const key1 = PermissionKey.create('products:create')
      const key2 = PermissionKey.create('products:create')
      const key3 = PermissionKey.create('products:delete')

      expect(key1.equals(key2)).toBe(true)
      expect(key1.equals(key3)).toBe(false)
    })
  })

  describe('matchesPattern()', () => {
    it('should match global wildcard', () => {
      const key = PermissionKey.create('products:create')
      expect(key.matchesPattern('*')).toBe(true)
    })

    it('should match group wildcard "group:*"', () => {
      const key = PermissionKey.create('products:create')

      expect(key.matchesPattern('products:*')).toBe(true)
      expect(key.matchesPattern('orders:*')).toBe(false)
    })

    it('should match "group:action:*" for field wildcard', () => {
      const key = PermissionKey.create('products:update:price')

      expect(key.matchesPattern('products:update:*')).toBe(true)
      expect(key.matchesPattern('products:delete:*')).toBe(false)
    })

    it('should match exact pattern', () => {
      const key = PermissionKey.create('products:create')

      expect(key.matchesPattern('products:create')).toBe(true)
      expect(key.matchesPattern('products:delete')).toBe(false)
    })
  })
})
