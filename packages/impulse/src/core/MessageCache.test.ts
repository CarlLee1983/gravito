import { beforeEach, describe, expect, test } from 'bun:test'
import { MessageCache } from './MessageCache'

class MockFormRequest {
  public customMessages: Record<string, string> = {
    'email.invalid_string': 'Custom email error',
    'name.too_small': 'Custom name error',
    phone: 'Custom phone error',
  }

  messages(): Record<string, string> {
    return this.customMessages
  }
}

class MockFormRequestWithoutMessages {
  // No messages() method
}

describe('MessageCache', () => {
  beforeEach(() => {
    MessageCache.clearCache()
  })

  describe('instance messages caching', () => {
    test('should cache messages() method results', () => {
      const instance = new MockFormRequest()

      // First access - should call messages() and cache
      const result1 = MessageCache.getInstanceMessages(instance)
      expect(result1).toEqual(instance.customMessages)

      // Cache the original reference
      const originalField = result1?.phone

      // Second access - should return cached version (same reference)
      const result2 = MessageCache.getInstanceMessages(instance)
      expect(result2).toBe(result1) // Same reference = cached
      expect(result2?.phone).toBe(originalField) // Same content confirmed
    })

    test('should return undefined for instances without messages method', () => {
      const instance = new MockFormRequestWithoutMessages()

      const result = MessageCache.getInstanceMessages(instance)
      expect(result).toBeUndefined()
    })

    test('should cache different instances separately', () => {
      const instance1 = new MockFormRequest()
      const instance2 = new MockFormRequest()

      // Modify instance2's messages
      instance2.customMessages = { different: 'message' }

      const result1 = MessageCache.getInstanceMessages(instance1)
      const result2 = MessageCache.getInstanceMessages(instance2)

      expect(result1).not.toBe(result2)
      expect(result1).toEqual(instance1.customMessages)
      expect(result2).toEqual(instance2.customMessages)
    })
  })

  describe('message resolution caching', () => {
    test('should cache resolution results', () => {
      let callCount = 0
      const resolver = () => {
        callCount++
        return `resolved-${callCount}`
      }

      const cacheKey = 'test-key'

      // First access - should call resolver
      const result1 = MessageCache.getCachedMessage(cacheKey, resolver)
      expect(result1).toBe('resolved-1')
      expect(callCount).toBe(1)

      // Second access - should use cache
      const result2 = MessageCache.getCachedMessage(cacheKey, resolver)
      expect(result2).toBe('resolved-1') // Same result
      expect(callCount).toBe(1) // Resolver not called again
    })

    test('should cache different keys separately', () => {
      let callCount = 0
      const resolver = () => {
        callCount++
        return `resolved-${callCount}`
      }

      const result1 = MessageCache.getCachedMessage('key1', resolver)
      const result2 = MessageCache.getCachedMessage('key2', resolver)

      expect(result1).toBe('resolved-1')
      expect(result2).toBe('resolved-2')
      expect(callCount).toBe(2) // Both resolvers called
    })
  })

  describe('performance benchmarks', () => {
    test('should show significant performance improvement', () => {
      const instance = new MockFormRequest()

      // Measure uncached performance (clear cache each time)
      const uncachedStart = performance.now()
      for (let i = 0; i < 1000; i++) {
        MessageCache.clearCache()
        MessageCache.getInstanceMessages(instance)
      }
      const uncachedTime = performance.now() - uncachedStart

      // Warm up cache
      MessageCache.getInstanceMessages(instance)

      // Measure cached performance (reuse cached result)
      const cachedStart = performance.now()
      for (let i = 0; i < 1000; i++) {
        MessageCache.getInstanceMessages(instance)
      }
      const cachedTime = performance.now() - cachedStart

      // Cached should be significantly faster (at least 2x)
      const speedupRatio = uncachedTime / cachedTime
      expect(speedupRatio).toBeGreaterThan(2)

      console.log(`Message cache performance improvement: ${speedupRatio.toFixed(1)}x faster`)
    })
  })

  describe('cache management', () => {
    test('should clear caches correctly', () => {
      const instance = new MockFormRequest()

      // Add entries to both caches
      MessageCache.getInstanceMessages(instance)
      MessageCache.getCachedMessage('test-key', () => 'test-value')

      // Verify they exist
      const stats1 = MessageCache.getCacheStats()
      expect(stats1.messageResolutionCacheSize).toBe(1)

      // Clear caches
      MessageCache.clearCache()

      // Verify they're cleared
      const stats2 = MessageCache.getCacheStats()
      expect(stats2.messageResolutionCacheSize).toBe(0)
    })
  })
})
