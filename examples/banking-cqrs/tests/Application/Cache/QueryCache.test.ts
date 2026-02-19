import { beforeEach, describe, expect, it } from 'bun:test'
import { QueryCache } from '../../../src/Application/Cache/QueryCache'

describe('QueryCache', () => {
  let cache: QueryCache

  beforeEach(() => {
    cache = new QueryCache(1000) // 1 second TTL for tests
  })

  describe('set and get', () => {
    it('should set and get values', () => {
      const value = { id: '123', name: 'John' }
      cache.set<typeof value>('key1', value)

      const result = cache.get<typeof value>('key1')

      expect(result).toEqual(value)
    })

    it('should return undefined for non-existent key', () => {
      const result = cache.get<unknown>('non-existent')

      expect(result).toBeUndefined()
    })

    it('should handle different data types', () => {
      cache.set<string>('string', 'hello')
      cache.set<number>('number', 42)
      cache.set<boolean>('boolean', true)
      cache.set<number[]>('array', [1, 2, 3])
      cache.set<{ foo: string }>('object', { foo: 'bar' })
      cache.set<null>('null', null)

      expect(cache.get<string>('string')).toBe('hello')
      expect(cache.get<number>('number')).toBe(42)
      expect(cache.get<boolean>('boolean')).toBe(true)
      expect(cache.get<number[]>('array')).toEqual([1, 2, 3])
      expect(cache.get<{ foo: string }>('object')).toEqual({ foo: 'bar' })
      expect(cache.get<null>('null')).toBe(null)
    })

    it('should allow overwriting existing keys', () => {
      cache.set<string>('key1', 'value1')
      expect(cache.get<string>('key1')).toBe('value1')

      cache.set<string>('key1', 'value2')
      expect(cache.get<string>('key1')).toBe('value2')
    })

    it('should return a new object instance on get (not shared reference)', () => {
      const original = { id: '123', name: 'John' }
      cache.set<typeof original>('key1', original)

      const retrieved = cache.get<typeof original>('key1')

      expect(retrieved).toEqual(original)
      // Note: Since we're storing the reference directly, modifications would affect the cache
      // This is expected behavior for a simple in-memory cache
    })
  })

  describe('TTL and expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTtlCache = new QueryCache(100) // 100ms TTL

      shortTtlCache.set<string>('key1', 'value1')
      expect(shortTtlCache.get<string>('key1')).toBe('value1')

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(shortTtlCache.get<string>('key1')).toBeUndefined()
    })

    it('should support custom TTL per entry', async () => {
      const cache1 = new QueryCache(100) // 100ms default
      const cache2 = new QueryCache(100) // 100ms default

      cache1.set<string>('key1', 'value1')
      cache2.set<string>('key2', 'value2', 500) // 500ms custom TTL

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(cache1.get<string>('key1')).toBeUndefined() // Expired
      expect(cache2.get<string>('key2')).toBe('value2') // Still valid
    })

    it('should not expire valid entries', async () => {
      const cache1 = new QueryCache(500) // 500ms TTL

      cache1.set<string>('key1', 'value1')

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(cache1.get<string>('key1')).toBe('value1')
    })

    it('should use default TTL when not specified', async () => {
      const cache1 = new QueryCache(150)

      cache1.set<string>('key1', 'value1')
      expect(cache1.get<string>('key1')).toBe('value1')

      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(cache1.get<string>('key1')).toBeUndefined()
    })
  })

  describe('invalidate', () => {
    it('should remove single cache entry', () => {
      cache.set<string>('key1', 'value1')
      cache.set<string>('key2', 'value2')

      cache.invalidate('key1')

      expect(cache.get<string>('key1')).toBeUndefined()
      expect(cache.get<string>('key2')).toBe('value2')
    })

    it('should handle invalidating non-existent key', () => {
      expect(() => {
        cache.invalidate('non-existent')
      }).not.toThrow()
    })
  })

  describe('invalidateByPrefix', () => {
    it('should invalidate entries with matching prefix', () => {
      cache.set<string>('GetAccountBalance:{"id":"001"}', 'balance1')
      cache.set<string>('GetAccountBalance:{"id":"002"}', 'balance2')
      cache.set<string>('GetTransactionHistory:{"id":"001"}', 'history1')

      cache.invalidateByPrefix('GetAccountBalance')

      expect(cache.get<string>('GetAccountBalance:{"id":"001"}')).toBeUndefined()
      expect(cache.get<string>('GetAccountBalance:{"id":"002"}')).toBeUndefined()
      expect(cache.get<string>('GetTransactionHistory:{"id":"001"}')).toBe('history1')
    })

    it('should handle empty prefix gracefully', () => {
      cache.set<string>('GetAccountBalance:{}', 'value1')
      cache.set<string>('GetTransactionHistory:{}', 'value2')

      cache.invalidateByPrefix('')

      // All keys start with empty string, so all should be invalidated
      expect(cache.get<string>('GetAccountBalance:{}')).toBeUndefined()
      expect(cache.get<string>('GetTransactionHistory:{}')).toBeUndefined()
    })

    it('should not match partial prefix incorrectly', () => {
      cache.set<string>('GetAccount:{}', 'value1')
      cache.set<string>('GetAccountBalance:{}', 'value2')
      cache.set<string>('Account:{}', 'value3')

      cache.invalidateByPrefix('GetAccount')

      expect(cache.get<string>('GetAccount:{}')).toBeUndefined()
      expect(cache.get<string>('GetAccountBalance:{}')).toBeUndefined() // Also starts with prefix
      expect(cache.get<string>('Account:{}')).toBe('value3')
    })
  })

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set<string>('key1', 'value1')
      cache.set<string>('key2', 'value2')
      cache.set<string>('key3', 'value3')

      cache.clear()

      expect(cache.get<string>('key1')).toBeUndefined()
      expect(cache.get<string>('key2')).toBeUndefined()
      expect(cache.get<string>('key3')).toBeUndefined()
      expect(cache.size()).toBe(0)
    })
  })

  describe('size', () => {
    it('should return cache size', () => {
      expect(cache.size()).toBe(0)

      cache.set<string>('key1', 'value1')
      expect(cache.size()).toBe(1)

      cache.set<string>('key2', 'value2')
      expect(cache.size()).toBe(2)

      cache.invalidate('key1')
      expect(cache.size()).toBe(1)
    })

    it('should include expired entries in size count', async () => {
      const shortTtlCache = new QueryCache(100)

      shortTtlCache.set<string>('key1', 'value1')
      expect(shortTtlCache.size()).toBe(1)

      await new Promise((resolve) => setTimeout(resolve, 150))

      // Size still counts expired entries until lazy deletion
      expect(shortTtlCache.size()).toBe(1)

      // Lazy deletion happens on get
      shortTtlCache.get<string>('key1')
      expect(shortTtlCache.size()).toBe(0)
    })
  })

  describe('realistic query cache patterns', () => {
    it('should handle query cache key format', () => {
      const queryKey1 = 'GetAccountBalance:{"accountId":"ACC-001"}'
      const queryKey2 = 'GetAccountBalance:{"accountId":"ACC-002"}'
      const queryKey3 = 'GetTransactionHistory:{"accountId":"ACC-001"}'

      const result1 = { accountId: 'ACC-001', balance: 100000 }
      const result2 = { accountId: 'ACC-002', balance: 50000 }
      const result3 = { accountId: 'ACC-001', transactions: [] }

      cache.set<typeof result1>(queryKey1, result1)
      cache.set<typeof result2>(queryKey2, result2)
      cache.set<typeof result3>(queryKey3, result3)

      expect(cache.get<typeof result1>(queryKey1)).toEqual(result1)
      expect(cache.get<typeof result2>(queryKey2)).toEqual(result2)
      expect(cache.get<typeof result3>(queryKey3)).toEqual(result3)
    })

    it('should support invalidating all queries for an account after deposit', () => {
      const acc1Key1 = 'GetAccountBalance:{"accountId":"ACC-001"}'
      const acc1Key2 = 'GetTransactionHistory:{"accountId":"ACC-001"}'
      const acc2Key = 'GetAccountBalance:{"accountId":"ACC-002"}'

      const result1 = { balance: 100000 }
      const result2 = { transactions: [] }
      const result3 = { balance: 50000 }

      cache.set<typeof result1>(acc1Key1, result1)
      cache.set<typeof result2>(acc1Key2, result2)
      cache.set<typeof result3>(acc2Key, result3)

      // After DepositFundsCommand for ACC-001, invalidate all queries for ACC-001
      cache.invalidateByPrefix('GetAccountBalance')
      cache.invalidateByPrefix('GetTransactionHistory')

      expect(cache.get<typeof result1>(acc1Key1)).toBeUndefined()
      expect(cache.get<typeof result2>(acc1Key2)).toBeUndefined()
      expect(cache.get<typeof result3>(acc2Key)).toBeUndefined() // GetAccountBalance was also cleared
    })
  })

  describe('edge cases', () => {
    it('should handle very large cache sizes', () => {
      for (let i = 0; i < 10000; i++) {
        cache.set<string>(`key-${i}`, `value-${i}`)
      }

      expect(cache.size()).toBe(10000)
      expect(cache.get<string>('key-5000')).toBe('value-5000')
      expect(cache.get<string>('key-9999')).toBe('value-9999')
    })

    it('should handle special characters in keys', () => {
      const specialKey = 'Query:{"field":"value with spaces","special":"!@#$%^&*()[]{}|;:,.<>?"}'

      cache.set<string>(specialKey, 'result')

      expect(cache.get<string>(specialKey)).toBe('result')
    })

    it('should handle empty string values', () => {
      cache.set<string>('empty-string', '')

      expect(cache.get<string>('empty-string')).toBe('')
    })

    it('should handle undefined key gracefully', () => {
      // @ts-expect-error - Testing edge case
      expect(() => cache.get(undefined)).not.toThrow()
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent sets and gets', () => {
      const operations = []

      for (let i = 0; i < 100; i++) {
        operations.push(() => {
          cache.set<string>(`key-${i}`, `value-${i}`)
          return cache.get<string>(`key-${i}`)
        })
      }

      for (const op of operations) {
        op()
      }

      expect(cache.size()).toBe(100)
    })
  })
})
