/**
 * RequestScope Integration Tests for OrderController & WishlistController
 *
 * Verifies that RequestScope pattern correctly manages request-level
 * product caching in order and wishlist operations.
 */

import { RequestScopeManager } from '@gravito/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { RequestProductCache } from '../src/Services/RequestProductCache'
import { WishlistService } from '../src/Services/WishlistService'

describe('RequestScope + OrderController Integration', () => {
  describe('Order Service with Request-Scoped Cache', () => {
    it('should provide request-scoped cache to OrderService', () => {
      const scope = new RequestScopeManager()

      // Simulate OrderController.getService() pattern
      const productCache = scope.resolve('product:cache', () => new RequestProductCache())

      // Cache should be properly initialized
      expect(productCache).toBeInstanceOf(RequestProductCache)

      // Multiple calls within same request return same instance
      const productCache2 = scope.resolve('product:cache', () => new RequestProductCache())
      expect(productCache).toBe(productCache2)
    })

    it('should cleanup cache after OrderController request completes', async () => {
      const scope = new RequestScopeManager()
      const cache = scope.resolve('product:cache', () => new RequestProductCache())

      // Simulate request processing
      const stats1 = cache.getStats()
      expect(stats1.cachedProducts).toBe(0)

      // Cleanup at end of request
      await scope.cleanup()

      // Cache is cleared
      expect(scope.size()).toBe(0)
    })

    it('should support multi-request isolation', () => {
      const scope1 = new RequestScopeManager()
      const scope2 = new RequestScopeManager()

      const cache1 = scope1.resolve('product:cache', () => new RequestProductCache())
      const cache2 = scope2.resolve('product:cache', () => new RequestProductCache())

      // Different requests = different instances
      expect(cache1).not.toBe(cache2)
    })
  })
})

describe('RequestScope + WishlistController Integration', () => {
  describe('Wishlist Service with Request-Scoped Cache', () => {
    it('should create WishlistService with request-scoped cache', () => {
      const scope = new RequestScopeManager()
      const cache = scope.resolve('product:cache', () => new RequestProductCache())
      const service = new WishlistService(cache)

      expect(service).toBeDefined()
      expect(cache).toBeInstanceOf(RequestProductCache)
    })

    it('should reuse cache across multiple WishlistService calls', () => {
      const scope = new RequestScopeManager()

      // Simulate WishlistController.getService() being called multiple times
      const _service1 = new WishlistService(
        scope.resolve('product:cache', () => new RequestProductCache())
      )
      const _service2 = new WishlistService(
        scope.resolve('product:cache', () => new RequestProductCache())
      )

      // Same cache is used by both services
      expect(scope.size()).toBe(1) // Only one cache instance in scope
    })

    it('should provide statistics from cached products', async () => {
      const scope = new RequestScopeManager()
      const cache = scope.resolve('product:cache', () => new RequestProductCache())

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

    it('should cleanup WishlistService cache after request', async () => {
      const scope = new RequestScopeManager()
      const cache = scope.resolve('product:cache', () => new RequestProductCache())
      const service = new WishlistService(cache)

      // Verify cache is accessible
      expect(service).toBeDefined()

      // Cleanup at end of request
      await scope.cleanup()

      // Scope is empty after cleanup
      expect(scope.size()).toBe(0)
    })
  })
})

describe('Multi-Controller RequestScope Isolation', () => {
  it('should provide independent caches for different controller requests', () => {
    const orderRequestScope = new RequestScopeManager()
    const wishlistRequestScope = new RequestScopeManager()

    const orderCache = orderRequestScope.resolve('product:cache', () => new RequestProductCache())
    const wishlistCache = wishlistRequestScope.resolve(
      'product:cache',
      () => new RequestProductCache()
    )

    // Different requests = different cache instances
    expect(orderCache).not.toBe(wishlistCache)
  })

  it('should cleanup each controller request independently', async () => {
    const orderRequestScope = new RequestScopeManager()
    const wishlistRequestScope = new RequestScopeManager()

    const _orderCache = orderRequestScope.resolve('product:cache', () => new RequestProductCache())
    const _wishlistCache = wishlistRequestScope.resolve(
      'product:cache',
      () => new RequestProductCache()
    )

    // Both scopes have one service
    expect(orderRequestScope.size()).toBe(1)
    expect(wishlistRequestScope.size()).toBe(1)

    // Cleanup first request
    await orderRequestScope.cleanup()

    // Only first scope is cleared
    expect(orderRequestScope.size()).toBe(0)
    expect(wishlistRequestScope.size()).toBe(1)

    // Cleanup second request
    await wishlistRequestScope.cleanup()

    // Both scopes are now empty
    expect(orderRequestScope.size()).toBe(0)
    expect(wishlistRequestScope.size()).toBe(0)
  })
})

describe('RequestScope Performance Across Controllers', () => {
  it('should measure cleanup duration for order requests', async () => {
    const scope = new RequestScopeManager()
    scope.resolve('product:cache', () => new RequestProductCache())

    const startTime = performance.now()
    await scope.cleanup()
    const duration = performance.now() - startTime

    // Cleanup should be fast (< 100ms)
    expect(duration).toBeLessThan(100)
  })

  it('should measure cleanup duration for wishlist requests', async () => {
    const scope = new RequestScopeManager()
    const cache = scope.resolve('product:cache', () => new RequestProductCache())
    const _service = new WishlistService(cache)

    const startTime = performance.now()
    await scope.cleanup()
    const duration = performance.now() - startTime

    // Cleanup should be fast (< 100ms)
    expect(duration).toBeLessThan(100)
  })

  it('should handle multiple services in same scope', () => {
    const scope = new RequestScopeManager()

    // Add multiple services to scope
    scope.resolve('product:cache', () => new RequestProductCache())
    scope.resolve('wishlist:service', () => new WishlistService())

    // Both services should be tracked
    expect(scope.size()).toBe(2)
  })
})
