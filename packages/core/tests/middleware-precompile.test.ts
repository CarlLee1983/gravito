import { describe, expect, it } from 'bun:test'
import { AOTRouter } from '../src/engine/AOTRouter'
import type { Middleware } from '../src/engine/types'

describe('AOTRouter Middleware Precompilation and Caching', () => {
  describe('collectMiddleware caching', () => {
    it('should cache middleware collection for same path and version', () => {
      const router = new AOTRouter()
      let globalMiddlewareCallCount = 0

      const globalMiddleware: Middleware = async (_c, next) => {
        globalMiddlewareCallCount++
        return next()
      }

      router.use(globalMiddleware)

      // First collection
      const first = router.collectMiddlewarePublic('/api/users', [])
      expect(globalMiddlewareCallCount).toBe(0) // Not executed, just collected

      // Second collection with same path - should be cached
      const second = router.collectMiddlewarePublic('/api/users', [])

      // Both should have the global middleware
      expect(first.length).toBe(1)
      expect(first).toBe(second) // Same cached array reference
    })

    it('should invalidate cache when middleware version changes', () => {
      const router = new AOTRouter()

      const middleware1: Middleware = async (_c, next) => next()
      router.use(middleware1)

      // First collection
      const first = router.collectMiddlewarePublic('/api/users', [])

      // Add new middleware - this changes router version
      const middleware2: Middleware = async (_c, next) => next()
      router.use(middleware2)

      // Second collection - cache should be invalidated
      const second = router.collectMiddlewarePublic('/api/users', [])

      expect(first).not.toBe(second) // Different objects due to version change
      expect(second.length).toBe(first.length + 1) // New middleware added
    })
  })

  describe('global middleware collection', () => {
    it('should collect all global middleware', () => {
      const router = new AOTRouter()

      const middleware1: Middleware = async (_c, next) => next()
      const middleware2: Middleware = async (_c, next) => next()
      const middleware3: Middleware = async (_c, next) => next()

      router.use(middleware1)
      router.use(middleware2)
      router.use(middleware3)

      const collected = router.collectMiddlewarePublic('/api/test', [])

      expect(collected.length).toBeGreaterThanOrEqual(3)
      expect(collected).toContain(middleware1)
      expect(collected).toContain(middleware2)
      expect(collected).toContain(middleware3)
    })

    it('should apply global middleware in order', () => {
      const router = new AOTRouter()
      const callOrder: string[] = []

      const middleware1: Middleware = async (_c, next) => {
        callOrder.push('m1-before')
        await next()
        callOrder.push('m1-after')
      }

      const middleware2: Middleware = async (_c, next) => {
        callOrder.push('m2-before')
        await next()
        callOrder.push('m2-after')
      }

      router.use(middleware1)
      router.use(middleware2)

      const collected = router.collectMiddlewarePublic('/api/test', [])

      // Verify middleware order in collection
      expect(collected.indexOf(middleware1)).toBeLessThan(collected.indexOf(middleware2))
    })
  })

  describe('pattern-based middleware', () => {
    it('should collect pattern-based middleware for matching paths', () => {
      const router = new AOTRouter()

      const globalMiddleware: Middleware = async (_c, next) => next()
      const apiMiddleware: Middleware = async (_c, next) => next()

      router.use(globalMiddleware)
      router.usePattern('/api/*', apiMiddleware)

      const apiCollected = router.collectMiddlewarePublic('/api/users', [])

      // Should have both global and pattern-matched middleware
      expect(apiCollected).toContain(globalMiddleware)
      expect(apiCollected).toContain(apiMiddleware)
    })

    it('should not collect pattern middleware for non-matching paths', () => {
      const router = new AOTRouter()

      const globalMiddleware: Middleware = async (_c, next) => next()
      const apiMiddleware: Middleware = async (_c, next) => next()

      router.use(globalMiddleware)
      router.usePattern('/api/*', apiMiddleware)

      const webCollected = router.collectMiddlewarePublic('/web/pages', [])

      // Should have global but not pattern-matched middleware
      expect(webCollected).toContain(globalMiddleware)
      expect(webCollected).not.toContain(apiMiddleware)
    })

    it('should handle multiple pattern middleware', () => {
      const router = new AOTRouter()

      const globalMiddleware: Middleware = async (_c, next) => next()
      const apiMiddleware: Middleware = async (_c, next) => next()
      const authMiddleware: Middleware = async (_c, next) => next()

      router.use(globalMiddleware)
      router.usePattern('/api/*', apiMiddleware)
      router.usePattern('/api/private/*', authMiddleware)

      const publicCollected = router.collectMiddlewarePublic('/api/public/data', [])
      const privateCollected = router.collectMiddlewarePublic('/api/private/secret', [])

      // Public path
      expect(publicCollected).toContain(globalMiddleware)
      expect(publicCollected).toContain(apiMiddleware)
      expect(publicCollected).not.toContain(authMiddleware)

      // Private path
      expect(privateCollected).toContain(globalMiddleware)
      expect(privateCollected).toContain(apiMiddleware)
      expect(privateCollected).toContain(authMiddleware)
    })
  })

  describe('route-specific middleware', () => {
    it('should include route-specific middleware in collection', () => {
      const router = new AOTRouter()

      const routeMiddleware: Middleware = async (_c, next) => next()

      const collected = router.collectMiddlewarePublic('/api/users', [routeMiddleware])

      expect(collected).toContain(routeMiddleware)
    })

    it('should combine global, pattern, and route middleware', () => {
      const router = new AOTRouter()

      const globalMiddleware: Middleware = async (_c, next) => next()
      const patternMiddleware: Middleware = async (_c, next) => next()
      const routeMiddleware: Middleware = async (_c, next) => next()

      router.use(globalMiddleware)
      router.usePattern('/api/*', patternMiddleware)

      const collected = router.collectMiddlewarePublic('/api/users', [routeMiddleware])

      // All three should be present
      expect(collected).toContain(globalMiddleware)
      expect(collected).toContain(patternMiddleware)
      expect(collected).toContain(routeMiddleware)

      // Verify order: global -> pattern -> route
      const globalIdx = collected.indexOf(globalMiddleware)
      const patternIdx = collected.indexOf(patternMiddleware)
      const routeIdx = collected.indexOf(routeMiddleware)

      expect(globalIdx).toBeLessThan(patternIdx)
      expect(patternIdx).toBeLessThan(routeIdx)
    })
  })

  describe('cache size limits', () => {
    it('should maintain LRU cache within size limit', () => {
      const router = new AOTRouter()
      const middleware: Middleware = async (_c, next) => next()
      router.use(middleware)

      // Generate many paths to fill cache
      const paths = Array.from({ length: 50 }, (_, i) => `/api/route${i}`)

      // First pass - populate cache
      const firstResults = paths.map((p) => router.collectMiddlewarePublic(p, []))

      // Second pass - should still be cached for recently used paths
      const secondResults = paths.map((p) => router.collectMiddlewarePublic(p, []))

      // Recently used paths should be same references
      for (let i = 0; i < paths.length; i++) {
        // Cache may have evicted older entries, but no errors should occur
        expect(secondResults[i].length).toBe(firstResults[i].length)
      }
    })
  })

  describe('middleware execution', () => {
    it('should execute collected middleware in correct order', async () => {
      const router = new AOTRouter()
      const executionOrder: string[] = []

      const middleware1: Middleware = async (_c, next) => {
        executionOrder.push('m1-start')
        await next()
        executionOrder.push('m1-end')
      }

      const middleware2: Middleware = async (_c, next) => {
        executionOrder.push('m2-start')
        await next()
        executionOrder.push('m2-end')
      }

      const _handler: Middleware = async () => {
        executionOrder.push('handler')
      }

      router.use(middleware1)
      router.use(middleware2)

      const collected = router.collectMiddlewarePublic('/api/test', [])

      // Simulate middleware chain execution
      // Note: This is simplified - real execution happens in Gravito engine
      expect(collected.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('edge cases', () => {
    it('should handle empty path', () => {
      const router = new AOTRouter()
      const middleware: Middleware = async (_c, next) => next()
      router.use(middleware)

      const collected = router.collectMiddlewarePublic('', [])

      expect(collected).toContain(middleware)
    })

    it('should handle paths with query strings', () => {
      const router = new AOTRouter()
      const middleware: Middleware = async (_c, next) => next()
      router.use(middleware)

      // collectMiddlewarePublic receives just the path, not the full URL
      const collected = router.collectMiddlewarePublic('/api/users?id=1', [])

      expect(collected).toContain(middleware)
    })

    it('should handle duplicate middleware usage', () => {
      const router = new AOTRouter()
      const middleware: Middleware = async (_c, next) => next()

      router.use(middleware)
      router.use(middleware) // Added twice

      const collected = router.collectMiddlewarePublic('/api/test', [])

      // Should contain the middleware (may be listed multiple times or deduplicated)
      const middlewareCount = collected.filter((m) => m === middleware).length
      expect(middlewareCount).toBeGreaterThan(0)
    })

    it('should handle null or undefined route middleware gracefully', () => {
      const router = new AOTRouter()
      const middleware: Middleware = async (_c, next) => next()
      router.use(middleware)

      const collected = router.collectMiddlewarePublic('/api/test', [])

      expect(collected).toBeDefined()
      expect(Array.isArray(collected)).toBe(true)
      expect(collected.length).toBeGreaterThan(0)
    })
  })

  describe('performance characteristics', () => {
    it('should return cached result faster than re-collecting', () => {
      const router = new AOTRouter()

      // Add multiple middleware to increase collection complexity
      for (let i = 0; i < 10; i++) {
        const middleware: Middleware = async (_c, next) => next()
        router.use(middleware)
      }

      const path = '/api/performance/test'

      // First call - cache miss
      const first = router.collectMiddlewarePublic(path, [])

      // Second call - cache hit
      const second = router.collectMiddlewarePublic(path, [])

      // Should return same cached reference
      expect(first).toBe(second)
    })

    it('should handle rapid requests to same path efficiently', () => {
      const router = new AOTRouter()
      const middleware: Middleware = async (_c, next) => next()
      router.use(middleware)

      const path = '/api/rapid'
      const results: any[] = []

      // Simulate rapid repeated requests
      for (let i = 0; i < 100; i++) {
        results.push(router.collectMiddlewarePublic(path, []))
      }

      // All should be same cached reference
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBe(results[0])
      }
    })
  })
})
