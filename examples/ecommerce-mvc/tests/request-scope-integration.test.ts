/**
 * RequestScope Integration Tests for ecommerce-mvc
 *
 * Verifies that RequestScope pattern correctly manages request-level
 * product caching and lifecycle in CartController.
 */

import { Container, RequestScopeManager } from '@gravito/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { CacheServiceProvider } from '../src/Providers/CacheServiceProvider'
import { RequestProductCache } from '../src/Services/RequestProductCache'

describe('RequestScope + ecommerce-mvc Integration', () => {
  let container: Container
  let provider: CacheServiceProvider

  beforeEach(() => {
    container = new Container()
    provider = new CacheServiceProvider()
    provider.register(container)
  })

  describe('RequestProductCache Lifecycle', () => {
    it('should create request-scoped product cache instance', () => {
      const scope = new RequestScopeManager()

      const cache1 = scope.resolve('product:cache', () => new RequestProductCache())
      const cache2 = scope.resolve('product:cache', () => new RequestProductCache())

      // Same request = same instance
      expect(cache1).toBe(cache2)
    })

    it('should track cache statistics', async () => {
      const cache = new RequestProductCache()

      // Note: These are mock results since we don't have actual DB
      // In real usage, these would come from DB queries
      const stats = cache.getStats()

      expect(stats).toEqual(
        expect.objectContaining({
          cachedProducts: expect.any(Number),
          totalQueries: expect.any(Number),
          cacheHits: expect.any(Number),
          hitRate: expect.any(String),
        })
      )
    })

    it('should cleanup cache and log statistics', async () => {
      const cache = new RequestProductCache()
      const consoleSpy = { logs: [] as any[] }

      // Mock console.log
      const originalLog = console.log
      console.log = (...args: any[]) => {
        consoleSpy.logs.push(args)
      }

      try {
        await cache.cleanup()
        expect(consoleSpy.logs.length).toBeGreaterThan(0)
        expect(consoleSpy.logs[0][0]).toMatch(/\[ProductCache\] Request stats:/)
      } finally {
        console.log = originalLog
      }
    })
  })

  describe('Scoped Service Registration', () => {
    it('should register product cache in container', () => {
      // Check if service is registered
      expect(container.has('product:cache')).toBe(true)
    })

    it('should resolve scoped service within request scope', () => {
      const scope = new RequestScopeManager()

      const cache = scope.resolve('product:cache', () => {
        return container.make('product:cache') as RequestProductCache
      })

      expect(cache).toBeInstanceOf(RequestProductCache)
    })
  })

  describe('Multi-Request Isolation', () => {
    it('should provide independent caches for different requests', () => {
      const scope1 = new RequestScopeManager()
      const scope2 = new RequestScopeManager()

      const cache1 = scope1.resolve('product:cache', () => new RequestProductCache())
      const cache2 = scope2.resolve('product:cache', () => new RequestProductCache())

      // Different requests = different instances
      expect(cache1).not.toBe(cache2)
    })

    it('should cleanup each request independently', async () => {
      const scope1 = new RequestScopeManager()
      const scope2 = new RequestScopeManager()

      const _cache1 = scope1.resolve('product:cache', () => new RequestProductCache())
      const cache2 = scope2.resolve('product:cache', () => new RequestProductCache())

      // Cleanup first scope
      await scope1.cleanup()

      // Second scope's cache should still be functional
      const stats = cache2.getStats()
      expect(stats).toBeDefined()
    })
  })

  describe('Error Handling in Cleanup', () => {
    it('should handle cleanup errors gracefully', async () => {
      const scope = new RequestScopeManager()
      let cleanupCalled = false

      // Create a cache with error in cleanup
      const faultyCache = {
        cleanup: async () => {
          cleanupCalled = true
          throw new Error('Cache cleanup failed')
        },
      }

      scope.resolve('faulty:cache', () => faultyCache)

      // Should not throw, but handle error
      await scope.cleanup()

      // Cleanup was still called even though it errored
      expect(cleanupCalled).toBe(true)
    })
  })

  describe('CartController + RequestScope Integration', () => {
    it('should provide request-scoped cache to CartService', () => {
      const scope = new RequestScopeManager()

      // Simulate CartController.getService() pattern
      const productCache = scope.resolve('product:cache', () => new RequestProductCache())

      // Cache should be properly initialized
      expect(productCache).toBeInstanceOf(RequestProductCache)

      // Multiple calls within same request return same instance
      const productCache2 = scope.resolve('product:cache', () => new RequestProductCache())
      expect(productCache).toBe(productCache2)
    })

    it('should cleanup cache after CartController request completes', async () => {
      const scope = new RequestScopeManager()
      const cache = scope.resolve('product:cache', () => new RequestProductCache())

      // Simulate request processing
      const stats1 = cache.getStats()
      expect(stats1.cachedProducts).toBe(0)

      // Cleanup at end of request
      await scope.cleanup()

      // Cache is cleared (would not be accessible in real scenario)
      // but we're testing that cleanup was called
      expect(scope.size()).toBe(0)
    })
  })

  describe('RequestScope Performance', () => {
    it('should measure cleanup duration', async () => {
      const scope = new RequestScopeManager()
      scope.resolve('product:cache', () => new RequestProductCache())

      const startTime = performance.now()
      await scope.cleanup()
      const duration = performance.now() - startTime

      // Cleanup should be fast (< 10ms typically)
      expect(duration).toBeLessThan(100)
    })

    it('should handle scope size correctly', () => {
      const scope = new RequestScopeManager()

      expect(scope.size()).toBe(0)

      scope.resolve('product:cache', () => new RequestProductCache())
      expect(scope.size()).toBe(1)

      scope.resolve('user:cache', () => ({}))
      expect(scope.size()).toBe(2)
    })
  })
})
