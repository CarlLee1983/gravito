/**
 * ProxyModel Tests
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import {
  ColumnNotFoundError,
  DirtyTracker,
  Model,
  SchemaRegistry,
  TypeMismatchError,
} from '../src/orm'

// Test model class
class TestUser extends Model {
  static override table = 'test_users'
  static override primaryKey = 'id'
  static override strictMode = false // Disable for unit tests without DB

  declare id: number
  declare name: string
  declare email: string
}

describe('DirtyTracker', () => {
  let tracker: DirtyTracker<Record<string, unknown>>

  beforeEach(() => {
    tracker = new DirtyTracker()
  })

  describe('setOriginal', () => {
    it('should store original values', () => {
      tracker.setOriginal({ name: 'Carl', age: 30 })
      expect(tracker.getOriginal('name')).toBe('Carl')
      expect(tracker.getOriginal('age')).toBe(30)
    })
  })

  describe('mark', () => {
    it('should mark attribute as dirty when value changes', () => {
      tracker.setOriginal({ name: 'Carl' })
      tracker.mark('name', 'Updated')
      expect(tracker.isDirty('name')).toBe(true)
    })

    it('should not mark as dirty when value unchanged', () => {
      tracker.setOriginal({ name: 'Carl' })
      tracker.mark('name', 'Carl')
      expect(tracker.isDirty('name')).toBe(false)
    })

    it('should unmark when reverted to original', () => {
      tracker.setOriginal({ name: 'Carl' })
      tracker.mark('name', 'Updated')
      expect(tracker.isDirty('name')).toBe(true)
      tracker.mark('name', 'Carl')
      expect(tracker.isDirty('name')).toBe(false)
    })
  })

  describe('getDirty', () => {
    it('should return all dirty keys', () => {
      tracker.setOriginal({ name: 'Carl', age: 30 })
      tracker.mark('name', 'Updated')
      tracker.mark('age', 31)
      expect(tracker.getDirty()).toContain('name')
      expect(tracker.getDirty()).toContain('age')
    })
  })

  describe('getDirtyValues', () => {
    it('should return dirty values from current state', () => {
      tracker.setOriginal({ name: 'Carl', age: 30 })
      tracker.mark('name', 'Updated')
      const dirty = tracker.getDirtyValues({ name: 'Updated', age: 30 })
      expect(dirty).toEqual({ name: 'Updated' })
    })
  })

  describe('reset', () => {
    it('should clear single dirty attribute', () => {
      tracker.setOriginal({ name: 'Carl' })
      tracker.mark('name', 'Updated')
      tracker.reset('name')
      expect(tracker.isDirty('name')).toBe(false)
    })
  })

  describe('resetAll', () => {
    it('should clear all dirty attributes', () => {
      tracker.setOriginal({ name: 'Carl', age: 30 })
      tracker.mark('name', 'Updated')
      tracker.mark('age', 31)
      tracker.resetAll()
      expect(tracker.isDirty()).toBe(false)
    })
  })

  describe('sync', () => {
    it('should reset and set new original values', () => {
      tracker.setOriginal({ name: 'Carl' })
      tracker.mark('name', 'Updated')
      tracker.sync({ name: 'Updated' })
      expect(tracker.isDirty()).toBe(false)
      expect(tracker.getOriginal('name')).toBe('Updated')
    })
  })
})

describe('Model', () => {
  beforeEach(() => {
    // We rely on the global singleton being initialized or we initialize it once
    if (!SchemaRegistry.getInstance().isInitialized) {
      SchemaRegistry.init({ mode: 'jit' })
    }
  })

  describe('create', () => {
    it('should create model with attributes', () => {
      const user = TestUser.make({ name: 'Carl', email: 'carl@test.com' })
      expect(user.getAttributes()).toEqual({ name: 'Carl', email: 'carl@test.com' })
    })

    it('should not be marked as exists', () => {
      const user = TestUser.make({ name: 'Carl' })
      expect(user.exists).toBe(false)
    })
  })

  describe('hydrate', () => {
    it('should create model from database row', () => {
      const user = TestUser.hydrate({ id: 1, name: 'Carl', email: 'carl@test.com' })
      expect(user.exists).toBe(true)
      expect(user.getKey()).toBe(1)
    })

    it('should not be dirty initially', () => {
      const user = TestUser.hydrate({ id: 1, name: 'Carl' })
      expect(user.isDirty).toBe(false)
    })
  })

  describe('proxy get/set', () => {
    it('should access attributes through proxy', () => {
      const user = TestUser.make({ name: 'Carl' })
      expect((user as Record<string, unknown>).name).toBe('Carl')
    })

    it('should set attributes through proxy', () => {
      const user = TestUser.make({})
      ;(user as Record<string, unknown>).name = 'Carl'
      expect(user.getAttributes().name).toBe('Carl')
    })

    it('should track dirty state on set', () => {
      const user = TestUser.hydrate({ id: 1, name: 'Carl' })
      expect(user.isDirty).toBe(false)
      ;(user as Record<string, unknown>).name = 'Updated'
      expect(user.isDirty).toBe(true)
    })
  })

  describe('getDirty', () => {
    it('should return only modified attributes', () => {
      const user = TestUser.hydrate({ id: 1, name: 'Carl', email: 'carl@test.com' })
      ;(user as Record<string, unknown>).name = 'Updated'
      const dirty = user.getDirty()
      expect(dirty).toEqual({ name: 'Updated' })
    })
  })

  describe('getOriginal', () => {
    it('should return original values', () => {
      const user = TestUser.hydrate({ id: 1, name: 'Carl' })
      ;(user as Record<string, unknown>).name = 'Updated'
      expect(user.getOriginal()).toEqual({ id: 1, name: 'Carl' })
    })
  })

  describe('toJSON', () => {
    it('should return all attributes', () => {
      const user = TestUser.make({ name: 'Carl', email: 'carl@test.com' })
      expect(user.toJSON()).toEqual({ name: 'Carl', email: 'carl@test.com' })
    })
  })
})

describe('Model Errors', () => {
  it('should have ColumnNotFoundError', () => {
    const error = new ColumnNotFoundError('users', 'nonexistent')
    expect(error.name).toBe('ColumnNotFoundError')
    expect(error.message).toContain('nonexistent')
    expect(error.message).toContain('users')
  })

  it('should have TypeMismatchError', () => {
    const error = new TypeMismatchError('users', 'age', 'number', 'string')
    expect(error.name).toBe('TypeMismatchError')
    expect(error.expectedType).toBe('number')
    expect(error.actualType).toBe('string')
  })
})
