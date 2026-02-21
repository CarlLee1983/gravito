import { beforeEach, describe, expect, it } from 'bun:test'
import type { Container } from '../src/Container'
import { PlanetCore } from '../src/PlanetCore'
import { ServiceProvider } from '../src/ServiceProvider'

describe('ServiceProvider Lifecycle - onReady and onShutdown', () => {
  let core: PlanetCore
  const lifecycle: string[] = []

  beforeEach(() => {
    core = new PlanetCore()
    lifecycle.length = 0
  })

  describe('onReady lifecycle hook', () => {
    it('should call onReady after bootstrap completes', async () => {
      class TestProvider extends ServiceProvider {
        register(container: Container) {
          lifecycle.push('register')
        }

        boot(core: PlanetCore) {
          lifecycle.push('boot')
        }

        onReady(core: PlanetCore) {
          lifecycle.push('onReady')
        }
      }

      core.register(new TestProvider())
      await core.bootstrap()

      expect(lifecycle).toEqual(['register', 'boot', 'onReady'])
    })

    it('should call onReady on all providers in registration order', async () => {
      class Provider1 extends ServiceProvider {
        register() {}
        boot() {}
        onReady() {
          lifecycle.push('provider1-ready')
        }
      }

      class Provider2 extends ServiceProvider {
        register() {}
        boot() {}
        onReady() {
          lifecycle.push('provider2-ready')
        }
      }

      core.register(new Provider1())
      core.register(new Provider2())
      await core.bootstrap()

      expect(lifecycle).toEqual(['provider1-ready', 'provider2-ready'])
    })

    it('should wait for async onReady to complete', async () => {
      class AsyncProvider extends ServiceProvider {
        register() {
          lifecycle.push('register')
        }

        async onReady() {
          await new Promise((resolve) => setTimeout(resolve, 10))
          lifecycle.push('async-onReady')
        }
      }

      core.register(new AsyncProvider())
      await core.bootstrap()

      expect(lifecycle).toContain('async-onReady')
    })

    it('should trigger app:ready hook', async () => {
      let hookTriggered = false

      core.hooks.addAction('app:ready', () => {
        hookTriggered = true
      })

      class TestProvider extends ServiceProvider {
        register() {}
      }

      core.register(new TestProvider())
      await core.bootstrap()

      expect(hookTriggered).toBe(true)
    })
  })

  describe('onShutdown lifecycle hook', () => {
    it('should call onShutdown on all providers in reverse order', async () => {
      class Provider1 extends ServiceProvider {
        register() {}
        onShutdown() {
          lifecycle.push('provider1-shutdown')
        }
      }

      class Provider2 extends ServiceProvider {
        register() {}
        onShutdown() {
          lifecycle.push('provider2-shutdown')
        }
      }

      class Provider3 extends ServiceProvider {
        register() {}
        onShutdown() {
          lifecycle.push('provider3-shutdown')
        }
      }

      core.register(new Provider1())
      core.register(new Provider2())
      core.register(new Provider3())

      await core.shutdown()

      // LIFO order
      expect(lifecycle).toEqual(['provider3-shutdown', 'provider2-shutdown', 'provider1-shutdown'])
    })

    it('should wait for async onShutdown to complete', async () => {
      class AsyncProvider extends ServiceProvider {
        register() {}

        async onShutdown() {
          await new Promise((resolve) => setTimeout(resolve, 10))
          lifecycle.push('async-shutdown')
        }
      }

      core.register(new AsyncProvider())
      await core.shutdown()

      expect(lifecycle).toContain('async-shutdown')
    })

    it('should continue shutdown even if a provider throws', async () => {
      class Provider1 extends ServiceProvider {
        register() {}
        onShutdown() {
          lifecycle.push('provider1-shutdown')
          throw new Error('Provider1 error')
        }
      }

      class Provider2 extends ServiceProvider {
        register() {}
        onShutdown() {
          lifecycle.push('provider2-shutdown')
        }
      }

      core.register(new Provider1())
      core.register(new Provider2())

      await core.shutdown()

      expect(lifecycle).toContain('provider1-shutdown')
      expect(lifecycle).toContain('provider2-shutdown')
    })

    it('should trigger app:shutdown hook', async () => {
      let hookTriggered = false

      core.hooks.addAction('app:shutdown', () => {
        hookTriggered = true
      })

      await core.shutdown()

      expect(hookTriggered).toBe(true)
    })

    it('should prevent duplicate shutdown calls', async () => {
      class TestProvider extends ServiceProvider {
        register() {}
        onShutdown() {
          lifecycle.push('shutdown')
        }
      }

      core.register(new TestProvider())

      await core.shutdown()
      await core.shutdown()

      // Should only be called once
      expect(lifecycle.filter((x) => x === 'shutdown').length).toBe(1)
    })
  })

  describe('Complete lifecycle flow', () => {
    it('should execute register -> boot -> onReady -> onShutdown correctly', async () => {
      class Provider1 extends ServiceProvider {
        register() {
          lifecycle.push('provider1:register')
        }
        boot() {
          lifecycle.push('provider1:boot')
        }
        onReady() {
          lifecycle.push('provider1:ready')
        }
        onShutdown() {
          lifecycle.push('provider1:shutdown')
        }
      }

      class Provider2 extends ServiceProvider {
        register() {
          lifecycle.push('provider2:register')
        }
        boot() {
          lifecycle.push('provider2:boot')
        }
        onReady() {
          lifecycle.push('provider2:ready')
        }
        onShutdown() {
          lifecycle.push('provider2:shutdown')
        }
      }

      core.register(new Provider1())
      core.register(new Provider2())
      await core.bootstrap()
      await core.shutdown()

      expect(lifecycle).toEqual([
        'provider1:register',
        'provider2:register',
        'provider1:boot',
        'provider2:boot',
        'provider1:ready',
        'provider2:ready',
        'provider2:shutdown',
        'provider1:shutdown',
      ])
    })

    it('should allow onReady and onShutdown to be optional', async () => {
      class MinimalProvider extends ServiceProvider {
        register() {
          lifecycle.push('register')
        }
      }

      core.register(new MinimalProvider())

      // Should not throw even without onReady/onShutdown
      await core.bootstrap()
      await core.shutdown()

      expect(lifecycle).toEqual(['register'])
    })
  })

  describe('Service resolution in lifecycle hooks', () => {
    it('should allow service resolution in onReady', async () => {
      class DatabaseProvider extends ServiceProvider {
        register(container: Container) {
          container.singleton('db', () => ({
            connected: false,
            connect() {
              ;(this as any).connected = true
            },
          }))
        }

        onReady(core: PlanetCore) {
          const db = core.container.make<any>('db')
          db.connect()
          lifecycle.push(`db-connected-${db.connected}`)
        }
      }

      core.register(new DatabaseProvider())
      await core.bootstrap()

      const db = core.container.make<any>('db')
      expect(db.connected).toBe(true)
      expect(lifecycle).toContain('db-connected-true')
    })

    it('should allow cleanup in onShutdown', async () => {
      class CacheProvider extends ServiceProvider {
        register(container: Container) {
          container.singleton('cache', () => ({
            items: new Map(),
            clear() {
              ;(this as any).items.clear()
            },
          }))
        }

        onShutdown(core: PlanetCore) {
          if (core.container.has('cache')) {
            const cache = core.container.make<any>('cache')
            cache.clear()
            lifecycle.push('cache-cleared')
          }
        }
      }

      core.register(new CacheProvider())
      await core.bootstrap()
      await core.shutdown()

      expect(lifecycle).toContain('cache-cleared')
    })
  })
})
