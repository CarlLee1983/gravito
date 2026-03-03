import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Container } from '../src/Container'
import { RequestScopeManager } from '../src/Container/RequestScopeManager'

describe('Container - Request Scoped Services with ALS', () => {
  let container: Container
  let scope1: RequestScopeManager
  let scope2: RequestScopeManager

  beforeEach(() => {
    container = new Container()
    scope1 = new RequestScopeManager()
    scope2 = new RequestScopeManager()
  })

  afterEach(async () => {
    // Ensure proper cleanup of scopes
    await scope1.cleanup()
    await scope2.cleanup()
  })

  describe('runWithScope()', () => {
    it('should execute function within scope context', async () => {
      container.scoped('service', () => ({ id: Math.random() }))

      const result = await Container.runWithScope(scope1, () => {
        return container.make<{ id: number }>('service')
      })

      expect(result).toBeDefined()
      expect(result.id).toBeGreaterThan(0)
    })

    it('should support both sync and async functions', () => {
      container.scoped('value', () => 'test-value')

      // Synchronous
      const syncResult = Container.runWithScope(scope1, () => {
        return container.make<string>('value')
      })

      // Asynchronous
      const asyncResult = Container.runWithScope(scope2, async () => {
        return container.make<string>('value')
      })

      expect(syncResult).toBe('test-value')
      expect(asyncResult).toBeInstanceOf(Promise)
    })

    it('should isolate scope between concurrent contexts', async () => {
      const instances1: any[] = []
      const instances2: any[] = []

      container.scoped('service', () => ({
        id: Math.random(),
        name: 'request-service',
      }))

      // Execute sequentially to ensure ALS context is maintained
      await Container.runWithScope(scope1, async () => {
        instances1.push(container.make('service'))
        await new Promise((resolve) => setTimeout(resolve, 10))
        instances1.push(container.make('service'))
      })

      await Container.runWithScope(scope2, async () => {
        instances2.push(container.make('service'))
        await new Promise((resolve) => setTimeout(resolve, 5))
        instances2.push(container.make('service'))
      })

      // Within same scope, instances should be the same (cached)
      expect(instances1[0]).toBe(instances1[1])
      expect(instances2[0]).toBe(instances2[1])

      // Between different scopes, instances should be different
      expect(instances1[0]).not.toBe(instances2[0])
    })
  })

  describe('make() with request scope', () => {
    it('should return same instance for multiple calls within same scope', async () => {
      container.scoped('cache', () => ({
        data: new Map(),
        id: Math.random(),
      }))

      let instance1: any
      let instance2: any

      await Container.runWithScope(scope1, () => {
        instance1 = container.make('cache')
        instance2 = container.make('cache')
      })

      expect(instance1).toBe(instance2)
      expect(instance1.id).toBe(instance2.id)
    })

    it('should return different instances for different scopes', async () => {
      container.scoped('repository', () => ({
        id: Math.random(),
      }))

      let instance1: any
      let instance2: any

      await Container.runWithScope(scope1, () => {
        instance1 = container.make('repository')
      })

      await Container.runWithScope(scope2, () => {
        instance2 = container.make('repository')
      })

      expect(instance1).not.toBe(instance2)
      expect(instance1.id).not.toBe(instance2.id)
    })

    it('should allow cleanup of scoped services', async () => {
      let cleanupCalled = false

      container.scoped('service', () => ({
        value: 'test',
        cleanup: async () => {
          cleanupCalled = true
        },
      }))

      await Container.runWithScope(scope1, () => {
        container.make('service')
      })

      await scope1.cleanup()

      expect(cleanupCalled).toBe(true)
      expect(scope1.size()).toBe(0)
    })

    it('should work with nested async operations', async () => {
      const calls: string[] = []

      container.scoped('tracker', () => ({
        log: (msg: string) => calls.push(msg),
      }))

      await Container.runWithScope(scope1, async () => {
        const tracker = container.make<{ log: (msg: string) => void }>('tracker')
        tracker.log('start')

        await new Promise((resolve) => setTimeout(resolve, 5))

        const tracker2 = container.make<{ log: (msg: string) => void }>('tracker')
        tracker2.log('after-delay')

        expect(tracker).toBe(tracker2)
      })

      expect(calls).toEqual(['start', 'after-delay'])
    })

    it('should fall back to transient when outside scope context', () => {
      container.scoped('service', () => ({
        id: Math.random(),
      }))

      // Call make outside of Container.runWithScope context
      const instance1 = container.make('service')
      const instance2 = container.make('service')

      // Should be different instances (transient fallback)
      expect(instance1).not.toBe(instance2)
    })

    it('should handle multiple scoped services', async () => {
      container.scoped('db', () => ({ name: 'database' }))
      container.scoped('cache', () => ({ name: 'cache' }))
      container.scoped('logger', () => ({ name: 'logger' }))

      let db1: any
      let cache1: any
      let logger1: any
      let db2: any

      await Container.runWithScope(scope1, () => {
        db1 = container.make('db')
        cache1 = container.make('cache')
        logger1 = container.make('logger')
        db2 = container.make('db')
      })

      expect(db1).toBe(db2)
      expect(db1.name).toBe('database')
      expect(cache1.name).toBe('cache')
      expect(logger1.name).toBe('logger')
      expect(scope1.size()).toBe(3)
    })

    it('should respect singleton scope outside of request context', () => {
      container.singleton('singleton', () => ({
        id: Math.random(),
      }))

      const instance1 = container.make('singleton')
      const instance2 = container.make('singleton')

      expect(instance1).toBe(instance2)
    })

    it('should respect transient scope', () => {
      container.bind('transient', () => ({
        id: Math.random(),
      }))

      const instance1 = container.make('transient')
      const instance2 = container.make('transient')

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('Multiple concurrent scopes', () => {
    it('should maintain isolation with 3+ concurrent requests', async () => {
      container.scoped('request', () => ({
        id: Math.random(),
      }))

      const scope3 = new RequestScopeManager()

      const results = await Promise.all([
        Container.runWithScope(scope1, () => container.make('request')),
        Container.runWithScope(scope2, () => container.make('request')),
        Container.runWithScope(scope3, () => container.make('request')),
      ])

      expect(results[0]).not.toBe(results[1])
      expect(results[1]).not.toBe(results[2])
      expect(results[0]).not.toBe(results[2])

      expect(results[0].id).not.toBe(results[1].id)
      expect(results[1].id).not.toBe(results[2].id)
    })

    it('should support scope.size() tracking', async () => {
      container.scoped('service', () => ({ value: 'test' }))
      container.scoped('repo', () => ({ value: 'test' }))

      await Container.runWithScope(scope1, () => {
        container.make('service')
        expect(scope1.size()).toBe(1)
        container.make('repo')
        expect(scope1.size()).toBe(2)
      })

      expect(scope1.size()).toBe(2)

      await scope1.cleanup()
      expect(scope1.size()).toBe(0)
    })
  })
})
