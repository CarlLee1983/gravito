import { describe, expect, it } from 'bun:test'
import { RequestScopeManager } from '../src/Container/RequestScopeManager'

describe('RequestScopeManager', () => {
  describe('resolve()', () => {
    it('creates a new instance on first resolution', () => {
      const scope = new RequestScopeManager()
      let callCount = 0

      const instance = scope.resolve('service', () => {
        callCount++
        return { value: 'test' }
      })

      expect(callCount).toBe(1)
      expect(instance.value).toBe('test')
    })

    it('returns cached instance on subsequent resolutions', () => {
      const scope = new RequestScopeManager()
      let callCount = 0

      const factory = () => {
        callCount++
        return { id: 1 }
      }

      const first = scope.resolve('service', factory)
      const second = scope.resolve('service', factory)

      expect(callCount).toBe(1) // Factory called only once
      expect(first).toBe(second) // Same instance
      expect(first.id).toBe(1)
    })

    it('isolates different service keys', () => {
      const scope = new RequestScopeManager()

      const service1 = scope.resolve('service1', () => ({ name: 'service1' }))
      const service2 = scope.resolve('service2', () => ({ name: 'service2' }))

      expect(service1.name).toBe('service1')
      expect(service2.name).toBe('service2')
      expect(service1).not.toBe(service2)
    })

    it('supports symbol keys', () => {
      const scope = new RequestScopeManager()
      const key1 = Symbol('service1')
      const key2 = Symbol('service2')

      const service1 = scope.resolve(key1, () => ({ name: 'service1' }))
      const service2 = scope.resolve(key2, () => ({ name: 'service2' }))

      expect(service1.name).toBe('service1')
      expect(service2.name).toBe('service2')
    })

    it('handles generic types correctly', () => {
      const scope = new RequestScopeManager()

      interface Product {
        id: number
        name: string
      }

      const product = scope.resolve<Product>('product', () => ({
        id: 1,
        name: 'Test Product',
      }))

      expect(product.id).toBe(1)
      expect(product.name).toBe('Test Product')
    })

    it('detects services with cleanup method', () => {
      const scope = new RequestScopeManager()

      class ServiceWithCleanup {
        async cleanup() {
          // cleanup logic
        }
      }

      const service = scope.resolve('service', () => new ServiceWithCleanup())

      expect(service).toBeInstanceOf(ServiceWithCleanup)
      // Internal metadata should be recorded (verified by cleanup)
    })
  })

  describe('size()', () => {
    it('returns zero for empty scope', () => {
      const scope = new RequestScopeManager()
      expect(scope.size()).toBe(0)
    })

    it('returns count of cached services', () => {
      const scope = new RequestScopeManager()

      scope.resolve('service1', () => ({ id: 1 }))
      expect(scope.size()).toBe(1)

      scope.resolve('service2', () => ({ id: 2 }))
      expect(scope.size()).toBe(2)

      scope.resolve('service3', () => ({ id: 3 }))
      expect(scope.size()).toBe(3)
    })

    it('counts only unique services', () => {
      const scope = new RequestScopeManager()

      scope.resolve('service', () => ({ id: 1 }))
      scope.resolve('service', () => ({ id: 1 })) // Same key, not counted again

      expect(scope.size()).toBe(1)
    })
  })

  describe('cleanup()', () => {
    it('clears all cached services', async () => {
      const scope = new RequestScopeManager()

      scope.resolve('service1', () => ({ id: 1 }))
      scope.resolve('service2', () => ({ id: 2 }))

      expect(scope.size()).toBe(2)

      await scope.cleanup()

      expect(scope.size()).toBe(0)
    })

    it('calls cleanup method on services that have it', async () => {
      const scope = new RequestScopeManager()
      const cleanupCalls: string[] = []

      class ServiceA {
        async cleanup() {
          cleanupCalls.push('A')
        }
      }

      class ServiceB {
        async cleanup() {
          cleanupCalls.push('B')
        }
      }

      scope.resolve('serviceA', () => new ServiceA())
      scope.resolve('serviceB', () => new ServiceB())

      expect(cleanupCalls).toEqual([])

      await scope.cleanup()

      expect(cleanupCalls.sort()).toEqual(['A', 'B'].sort())
    })

    it('ignores services without cleanup method', async () => {
      const scope = new RequestScopeManager()

      scope.resolve('service1', () => ({ id: 1 }))
      scope.resolve('service2', () => ({ id: 2 }))

      // Should not throw
      await scope.cleanup()

      expect(scope.size()).toBe(0)
    })

    it('continues cleanup even if one service fails', async () => {
      const scope = new RequestScopeManager()
      const cleanupCalls: string[] = []

      class ServiceA {
        async cleanup() {
          cleanupCalls.push('A')
        }
      }

      class ServiceB {
        async cleanup() {
          throw new Error('Cleanup failed')
        }
      }

      class ServiceC {
        async cleanup() {
          cleanupCalls.push('C')
        }
      }

      scope.resolve('serviceA', () => new ServiceA())
      scope.resolve('serviceB', () => new ServiceB())
      scope.resolve('serviceC', () => new ServiceC())

      // Should not throw, despite ServiceB failing
      await scope.cleanup()

      expect(cleanupCalls.sort()).toEqual(['A', 'C'].sort())
      expect(scope.size()).toBe(0)
    })

    it('handles synchronous cleanup methods', async () => {
      const scope = new RequestScopeManager()
      const cleanupCalls: string[] = []

      class ServiceWithSyncCleanup {
        cleanup() {
          cleanupCalls.push('cleaned')
        }
      }

      scope.resolve('service', () => new ServiceWithSyncCleanup())

      await scope.cleanup()

      expect(cleanupCalls).toEqual(['cleaned'])
    })

    it('can be called multiple times safely', async () => {
      const scope = new RequestScopeManager()
      const cleanupCalls: string[] = []

      class Service {
        async cleanup() {
          cleanupCalls.push('cleanup')
        }
      }

      scope.resolve('service', () => new Service())

      await scope.cleanup()
      expect(cleanupCalls.length).toBe(1)

      // Second cleanup should be safe (no-op on empty scope)
      await scope.cleanup()
      expect(cleanupCalls.length).toBe(1)
    })

    it('clears metadata after cleanup', async () => {
      const scope = new RequestScopeManager()

      class Service {
        async cleanup() {}
      }

      scope.resolve('service', () => new Service())
      expect(scope.size()).toBe(1)

      await scope.cleanup()
      expect(scope.size()).toBe(0)
    })
  })

  describe('isolation between scopes', () => {
    it('maintains separate instances for different scopes', () => {
      const scope1 = new RequestScopeManager()
      const scope2 = new RequestScopeManager()

      const service1 = scope1.resolve('service', () => ({ id: 1 }))
      const service2 = scope2.resolve('service', () => ({ id: 2 }))

      expect(service1.id).toBe(1)
      expect(service2.id).toBe(2)
      expect(service1).not.toBe(service2)
    })

    it('does not share cleanup calls across scopes', async () => {
      const scope1 = new RequestScopeManager()
      const scope2 = new RequestScopeManager()
      const cleanupCalls: string[] = []

      class Service {
        constructor(private id: number) {}

        async cleanup() {
          cleanupCalls.push(`scope${this.id}`)
        }
      }

      scope1.resolve('service', () => new Service(1))
      scope2.resolve('service', () => new Service(2))

      await scope1.cleanup()
      expect(cleanupCalls).toEqual(['scope1'])

      await scope2.cleanup()
      expect(cleanupCalls).toEqual(['scope1', 'scope2'])
    })
  })

  describe('edge cases', () => {
    it('handles null factory results', () => {
      const scope = new RequestScopeManager()

      const result = scope.resolve('nullService', () => null as any)

      expect(result).toBeNull()
    })

    it('handles undefined factory results', () => {
      const scope = new RequestScopeManager()

      const result = scope.resolve('undefinedService', () => undefined as any)

      expect(result).toBeUndefined()
    })

    it('handles empty string as service key', () => {
      const scope = new RequestScopeManager()

      const service1 = scope.resolve('', () => ({ id: 1 }))
      const service2 = scope.resolve('', () => ({ id: 2 }))

      expect(service1).toBe(service2)
      expect(service1.id).toBe(1)
    })

    it('preserves factory function closure state', () => {
      const scope = new RequestScopeManager()
      let counter = 0

      const service1 = scope.resolve('service', () => {
        counter++
        return { count: counter }
      })

      const service2 = scope.resolve('service', () => {
        counter++
        return { count: counter }
      })

      expect(service1.count).toBe(1)
      expect(service2.count).toBe(1)
      expect(counter).toBe(1)
    })
  })
})
