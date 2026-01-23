import { beforeEach, describe, expect, test } from 'bun:test'
import { FormRequestInstanceCache } from './FormRequestInstanceCache'

class MockFormRequest {
  public id = Math.random()
  constructor() {
    this.id = Math.random()
  }
}

class AnotherMockFormRequest {
  public id = Math.random()
  constructor() {
    this.id = Math.random()
  }
}

describe('FormRequestInstanceCache', () => {
  beforeEach(() => {
    FormRequestInstanceCache.clearCache()
  })

  describe('instance caching', () => {
    test('should cache instances by constructor', () => {
      // First access - should create and cache
      const instance1 = FormRequestInstanceCache.getInstance(MockFormRequest)
      expect(instance1).toBeInstanceOf(MockFormRequest)

      // Second access - should return cached instance
      const instance2 = FormRequestInstanceCache.getInstance(MockFormRequest)
      expect(instance2).toBe(instance1) // Exact same instance
      expect(instance2.id).toBe(instance1.id) // Same ID confirms same object
    })

    test('should cache different classes separately', () => {
      const instance1 = FormRequestInstanceCache.getInstance(MockFormRequest)
      const instance2 = FormRequestInstanceCache.getInstance(AnotherMockFormRequest)

      expect(instance1).toBeInstanceOf(MockFormRequest)
      expect(instance2).toBeInstanceOf(AnotherMockFormRequest)
      expect(instance1).not.toBe(instance2) // Different instances
      expect(instance1.id).not.toBe(instance2.id) // Different IDs
    })

    test('should maintain cache across multiple calls', () => {
      const instance1 = FormRequestInstanceCache.getInstance(MockFormRequest)
      const instance2 = FormRequestInstanceCache.getInstance(MockFormRequest)
      const instance3 = FormRequestInstanceCache.getInstance(MockFormRequest)

      expect(instance1).toBe(instance2)
      expect(instance2).toBe(instance3)
      expect(instance1.id).toBe(instance3.id)
    })
  })

  describe('performance benchmarks', () => {
    test('should show significant performance improvement with caching', () => {
      // Measure uncached performance (clear cache each time)
      const uncachedStart = performance.now()
      for (let i = 0; i < 10000; i++) {
        FormRequestInstanceCache.clearCache()
        FormRequestInstanceCache.getInstance(MockFormRequest)
      }
      const uncachedTime = performance.now() - uncachedStart

      // Warm up cache
      FormRequestInstanceCache.getInstance(MockFormRequest)

      // Measure cached performance (reuse same instance)
      const cachedStart = performance.now()
      for (let i = 0; i < 10000; i++) {
        FormRequestInstanceCache.getInstance(MockFormRequest)
      }
      const cachedTime = performance.now() - cachedStart

      // Cached should be significantly faster (at least 5x for realistic benchmark)
      const speedupRatio = uncachedTime / cachedTime
      expect(speedupRatio).toBeGreaterThan(5)

      console.log(`Instance cache performance improvement: ${speedupRatio.toFixed(1)}x faster`)
      console.log(`Uncached: ${uncachedTime.toFixed(2)}ms, Cached: ${cachedTime.toFixed(2)}ms`)
    })
  })

  describe('memory management', () => {
    test('should clear cache correctly', () => {
      const instance1 = FormRequestInstanceCache.getInstance(MockFormRequest)

      FormRequestInstanceCache.clearCache()

      // Should create new instance after cache clear
      const instance2 = FormRequestInstanceCache.getInstance(MockFormRequest)

      expect(instance1).not.toBe(instance2) // Different instances
      expect(instance1.id).not.toBe(instance2.id) // Different IDs
    })
  })

  describe('cache statistics', () => {
    test('should return cache statistics', () => {
      const stats = FormRequestInstanceCache.getCacheStats()
      expect(stats.message).toContain('FormRequest instances cached')
    })
  })
})
