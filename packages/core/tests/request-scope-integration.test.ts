import { describe, expect, it } from 'bun:test'
import { FastContext } from '../src/engine/FastContext'
import { MinimalContext } from '../src/engine/MinimalContext'

describe('RequestScope Integration with FastContext', () => {
  describe('FastContext.requestScope()', () => {
    it('initializes scope in init()', () => {
      const ctx = new FastContext()
      const request = new Request('http://localhost/test')

      ctx.init(request, {}, '/test')

      const scope = ctx.requestScope()
      expect(scope).toBeDefined()
      expect(scope.size()).toBe(0)
    })

    it('throws if called before init()', () => {
      const ctx = new FastContext()

      expect(() => ctx.requestScope()).toThrow()
    })

    it('manages scoped services across request lifecycle', async () => {
      const ctx = new FastContext()
      const request = new Request('http://localhost/test')

      ctx.init(request, {}, '/test')

      // Resolve multiple scoped services
      const cache = ctx.scoped('cache', () => ({ data: new Map() }))
      const tracker = ctx.scoped('tracker', () => ({ events: [] }))

      expect(ctx.requestScope().size()).toBe(2)

      // Use the services
      cache.data.set('key1', 'value1')
      tracker.events.push('event1')

      expect(cache.data.get('key1')).toBe('value1')
      expect(tracker.events).toEqual(['event1'])

      // Cleanup
      await ctx.requestScope().cleanup()
      expect(ctx.requestScope().size()).toBe(0)
    })

    it('caches same service across multiple accesses', () => {
      const ctx = new FastContext()
      const request = new Request('http://localhost/test')

      ctx.init(request, {}, '/test')

      const cache1 = ctx.scoped('cache', () => ({ id: 1 }))
      const cache2 = ctx.scoped('cache', () => ({ id: 2 }))

      expect(cache1).toBe(cache2)
      expect(cache1.id).toBe(1)
    })
  })

  describe('FastContext.scoped() convenience method', () => {
    it('resolves services with factory function', () => {
      const ctx = new FastContext()
      const request = new Request('http://localhost/test')

      ctx.init(request, {}, '/test')

      const service = ctx.scoped('service', () => ({
        name: 'test',
        getValue: () => 42,
      }))

      expect(service.name).toBe('test')
      expect(service.getValue()).toBe(42)
    })

    it('returns cached instance on multiple calls', () => {
      const ctx = new FastContext()
      const request = new Request('http://localhost/test')

      ctx.init(request, {}, '/test')

      let callCount = 0
      const service = ctx.scoped('service', () => {
        callCount++
        return { id: callCount }
      })

      const cached = ctx.scoped('service', () => {
        callCount++
        return { id: callCount }
      })

      expect(callCount).toBe(1)
      expect(service).toBe(cached)
    })

    it('supports symbol keys', () => {
      const ctx = new FastContext()
      const request = new Request('http://localhost/test')

      ctx.init(request, {}, '/test')

      const key1 = Symbol('service1')
      const key2 = Symbol('service2')

      const service1 = ctx.scoped(key1, () => ({ id: 1 }))
      const service2 = ctx.scoped(key2, () => ({ id: 2 }))

      expect(service1.id).toBe(1)
      expect(service2.id).toBe(2)
    })
  })

  describe('FastContext cleanup integration', () => {
    it('calls cleanup on services with cleanup method', async () => {
      const ctx = new FastContext()
      const request = new Request('http://localhost/test')

      ctx.init(request, {}, '/test')

      const cleanupCalls: string[] = []

      class Database {
        async cleanup() {
          cleanupCalls.push('db')
        }
      }

      class Cache {
        async cleanup() {
          cleanupCalls.push('cache')
        }
      }

      ctx.scoped('db', () => new Database())
      ctx.scoped('cache', () => new Cache())

      await ctx.requestScope().cleanup()

      expect(cleanupCalls.sort()).toEqual(['cache', 'db'].sort())
    })

    it('handles async cleanup gracefully', async () => {
      const ctx = new FastContext()
      const request = new Request('http://localhost/test')

      ctx.init(request, {}, '/test')

      const timeline: string[] = []

      class AsyncService {
        async cleanup() {
          timeline.push('cleanup_start')
          await new Promise((resolve) => setTimeout(resolve, 10))
          timeline.push('cleanup_end')
        }
      }

      ctx.scoped('async', () => new AsyncService())

      await ctx.requestScope().cleanup()

      expect(timeline).toEqual(['cleanup_start', 'cleanup_end'])
    })
  })

  describe('MinimalContext.requestScope()', () => {
    it('initializes scope in constructor', () => {
      const request = new Request('http://localhost/test')
      const ctx = new MinimalContext(request, {}, '/test')

      const scope = ctx.requestScope()
      expect(scope).toBeDefined()
      expect(scope.size()).toBe(0)
    })

    it('manages scoped services independently from FastContext', () => {
      const request = new Request('http://localhost/test')
      const fastCtx = new FastContext()
      const minimalCtx = new MinimalContext(request, {}, '/test')

      fastCtx.init(request, {}, '/test')

      const fastService = fastCtx.scoped('service', () => ({ type: 'fast' }))
      const minimalService = minimalCtx.scoped('service', () => ({ type: 'minimal' }))

      expect(fastService.type).toBe('fast')
      expect(minimalService.type).toBe('minimal')
      expect(fastService).not.toBe(minimalService)
    })

    it('supports cleanup for non-pooled context', async () => {
      const request = new Request('http://localhost/test')
      const ctx = new MinimalContext(request, {}, '/test')

      const cleanupCalls: string[] = []

      class Service {
        async cleanup() {
          cleanupCalls.push('cleaned')
        }
      }

      ctx.scoped('service', () => new Service())

      await ctx.requestScope().cleanup()

      expect(cleanupCalls).toEqual(['cleaned'])
    })
  })

  describe('multi-request isolation', () => {
    it('isolates scopes across different requests', async () => {
      const request1 = new Request('http://localhost/test1')
      const request2 = new Request('http://localhost/test2')

      const ctx1 = new FastContext()
      const ctx2 = new FastContext()

      ctx1.init(request1, {}, '/test1')
      ctx2.init(request2, {}, '/test2')

      const service1 = ctx1.scoped('cache', () => ({ id: 1 }))
      const service2 = ctx2.scoped('cache', () => ({ id: 2 }))

      expect(service1.id).toBe(1)
      expect(service2.id).toBe(2)
      expect(service1).not.toBe(service2)

      await ctx1.requestScope().cleanup()
      await ctx2.requestScope().cleanup()

      expect(ctx1.requestScope().size()).toBe(0)
      expect(ctx2.requestScope().size()).toBe(0)
    })

    it('does not share service instances across contexts', () => {
      const request1 = new Request('http://localhost/test1')
      const request2 = new Request('http://localhost/test2')

      const ctx1 = new FastContext()
      const ctx2 = new FastContext()

      ctx1.init(request1, {}, '/test1')
      ctx2.init(request2, {}, '/test2')

      class State {
        constructor(readonly id: number) {}

        setValue(key: string, value: any) {
          ;(this as any)[key] = value
        }
      }

      const state1 = ctx1.scoped('state', () => new State(1))
      const state2 = ctx2.scoped('state', () => new State(2))

      state1.setValue('data', 'context1')
      state2.setValue('data', 'context2')

      expect((state1 as any).data).toBe('context1')
      expect((state2 as any).data).toBe('context2')
    })
  })

  describe('concurrent requests simulation', () => {
    it('handles simulated concurrent request initialization', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => new Request(`http://localhost/test${i}`))

      const contexts = requests.map((req) => {
        const ctx = new FastContext()
        ctx.init(req, {}, `/test${Math.random()}`)
        return ctx
      })

      // Simulate concurrent service resolution
      contexts.forEach((ctx, idx) => {
        ctx.scoped('cache', () => ({ id: idx }))
      })

      // Verify isolation
      contexts.forEach((ctx, idx) => {
        const cache = ctx.scoped('cache', () => ({ id: -1 })) // Should return cached
        expect(cache.id).toBe(idx)
      })

      // Cleanup all
      await Promise.all(contexts.map((ctx) => ctx.requestScope().cleanup()))

      contexts.forEach((ctx) => {
        expect(ctx.requestScope().size()).toBe(0)
      })
    })
  })

  describe('error handling in scoped services', () => {
    it('does not propagate factory errors to scope manager', () => {
      const ctx = new FastContext()
      const request = new Request('http://localhost/test')

      ctx.init(request, {}, '/test')

      expect(() => {
        ctx.scoped('failing', () => {
          throw new Error('Factory error')
        })
      }).toThrow('Factory error')
    })

    it('continues using scope after service resolution error', async () => {
      const ctx = new FastContext()
      const request = new Request('http://localhost/test')

      ctx.init(request, {}, '/test')

      try {
        ctx.scoped('failing', () => {
          throw new Error('Factory error')
        })
      } catch {
        // Expected
      }

      // Scope should still be usable
      const working = ctx.scoped('working', () => ({ ok: true }))
      expect(working.ok).toBe(true)

      await ctx.requestScope().cleanup()
    })
  })
})
