import { describe, expect, it } from 'bun:test'
import { deepDeserialize, deepSerialize } from '../src/utils/serialization'

describe('Serialization', () => {
  it('should handle Date objects', () => {
    const date = new Date('2025-01-23T12:00:00Z')
    const serialized = deepSerialize({ createdAt: date })
    const deserialized = deepDeserialize(serialized)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((deserialized as any).createdAt).toBeInstanceOf(Date)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((deserialized as any).createdAt.toISOString()).toBe(date.toISOString())
  })

  it('should handle nested objects', () => {
    const obj = {
      user: {
        profile: {
          name: 'John',
          createdAt: new Date(),
        },
      },
    }
    const serialized = deepSerialize(obj)
    const deserialized = deepDeserialize(serialized)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((deserialized as any).user.profile.name).toBe('John')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((deserialized as any).user.profile.createdAt).toBeInstanceOf(Date)
  })

  it('should handle circular references', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: any = { name: 'test' }
    obj.self = obj

    const serialized = deepSerialize(obj)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((serialized as any).self).toBe('[Circular]')
  })

  it('should handle Map and Set', () => {
    const map = new Map([['key', 'value']])
    const set = new Set([1, 2, 3])

    const serialized = deepSerialize({ map, set })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deserialized = deepDeserialize(serialized) as any

    expect(deserialized.map).toBeInstanceOf(Map)
    expect(deserialized.map.get('key')).toBe('value')
    expect(deserialized.set).toBeInstanceOf(Set)
    expect(deserialized.set.has(2)).toBe(true)
  })

  describe('Lazy Notification 支援', () => {
    it('應該序列化包含 __lazyId 的物件', () => {
      const notification = {
        __lazyId: 'user-123',
        __type: 'UserRegisteredNotification',
        queue: 'notifications',
      }

      const serialized = deepSerialize(notification)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((serialized as any).__lazyId).toBe('user-123')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((serialized as any).__type).toBe('UserRegisteredNotification')
    })

    it('應該反序列化包含 __lazyId 的物件', () => {
      const serialized = {
        __lazyId: 'invoice-456',
        __type: 'InvoicePaidNotification',
      }

      const deserialized = deepDeserialize(serialized)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((deserialized as any).__lazyId).toBe('invoice-456')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((deserialized as any).__type).toBe('InvoicePaidNotification')
    })

    it('應該過濾掉私有屬性（底線開頭）但保留 __lazyId', () => {
      const obj = {
        __lazyId: 'test-id',
        publicField: 'public',
        _privateField: 'private',
        _cachedData: { sensitive: 'data' },
      }

      const serialized = deepSerialize(obj)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((serialized as any).__lazyId).toBe('test-id')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((serialized as any).publicField).toBe('public')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((serialized as any)._privateField).toBeUndefined()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((serialized as any)._cachedData).toBeUndefined()
    })
  })
})
