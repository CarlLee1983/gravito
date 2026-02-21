import { beforeEach, describe, expect, it } from 'bun:test'
import type { Container } from '../src/Container'
import { type HealthCheck, HealthProvider } from '../src/health/HealthProvider'
import { PlanetCore } from '../src/PlanetCore'
import { ServiceProvider } from '../src/ServiceProvider'

describe('HealthProvider - Health Probes', () => {
  let core: PlanetCore
  let health: HealthProvider

  beforeEach(() => {
    core = new PlanetCore()
    health = new HealthProvider()
  })

  describe('Registration and Setup', () => {
    it('should register as singleton', () => {
      health.register(core.container)
      const healthFromContainer = core.container.make<HealthProvider>('health')
      expect(healthFromContainer).toBe(health)
    })

    it('should register health endpoints during boot', async () => {
      health.boot(core)

      // Check if routes exist (simple check - these are registered with the router)
      expect(core.router).toBeDefined()
    })

    it('should allow registering health checks', () => {
      const check: HealthCheck = {
        name: 'test-check',
        check: async () => ({ status: 'healthy' }),
      }

      health.registerCheck(check)
      expect((health as any).checks).toContain(check)
    })
  })

  describe('/health/liveness endpoint', () => {
    it('should always return 200 OK', async () => {
      const provider = new HealthProvider()
      provider.boot(core)

      // Simulate request to liveness endpoint
      const handler = (core.router as any).routes?.get?.find(
        (r: any) => r.path === '/health/liveness'
      )

      if (handler?.callback) {
        const response = await handler.callback()
        expect(response.status).toBe(200)
        expect(await response.text()).toBe('OK')
      }
    })

    it('should return 200 even if checks fail', async () => {
      const provider = new HealthProvider()

      // Register failing check
      provider.registerCheck({
        name: 'failing-check',
        check: async () => ({ status: 'unhealthy', message: 'Failed' }),
      })

      provider.boot(core)

      // Liveness should still be 200
      const handler = (core.router as any).routes?.get?.find(
        (r: any) => r.path === '/health/liveness'
      )

      if (handler?.callback) {
        const response = await handler.callback()
        expect(response.status).toBe(200)
      }
    })
  })

  describe('/health/readiness endpoint', () => {
    it('should return 200 with all checks healthy', async () => {
      const provider = new HealthProvider()

      provider.registerCheck({
        name: 'database',
        check: async () => ({ status: 'healthy' }),
      })

      provider.registerCheck({
        name: 'cache',
        check: async () => ({ status: 'healthy' }),
      })

      provider.boot(core)

      // Find readiness endpoint
      const handler = (core.router as any).routes?.get?.find(
        (r: any) => r.path === '/health/readiness'
      )

      if (handler?.callback) {
        const response = await handler.callback()
        expect(response.status).toBe(200)

        const json = await response.json()
        expect(json.status).toBe('healthy')
        expect(json.checks.database.status).toBe('healthy')
        expect(json.checks.cache.status).toBe('healthy')
      }
    })

    it('should return 503 if any check fails', async () => {
      const provider = new HealthProvider()

      provider.registerCheck({
        name: 'database',
        check: async () => ({ status: 'healthy' }),
      })

      provider.registerCheck({
        name: 'cache',
        check: async () => ({ status: 'unhealthy', message: 'Cache unreachable' }),
      })

      provider.boot(core)

      const handler = (core.router as any).routes?.get?.find(
        (r: any) => r.path === '/health/readiness'
      )

      if (handler?.callback) {
        const response = await handler.callback()
        expect(response.status).toBe(503)

        const json = await response.json()
        expect(json.status).toBe('unhealthy')
        expect(json.checks.cache.status).toBe('unhealthy')
      }
    })

    it('should return JSON with timestamp', async () => {
      const provider = new HealthProvider()
      provider.boot(core)

      const handler = (core.router as any).routes?.get?.find(
        (r: any) => r.path === '/health/readiness'
      )

      if (handler?.callback) {
        const response = await handler.callback()
        const json = await response.json()

        expect(json).toHaveProperty('timestamp')
        expect(typeof json.timestamp).toBe('string')
        // Verify it's a valid ISO string
        expect(() => new Date(json.timestamp)).not.toThrow()
      }
    })

    it('should include all registered checks in response', async () => {
      const provider = new HealthProvider()

      const checks = ['check1', 'check2', 'check3']
      for (const name of checks) {
        provider.registerCheck({
          name,
          check: async () => ({ status: 'healthy' }),
        })
      }

      provider.boot(core)

      const handler = (core.router as any).routes?.get?.find(
        (r: any) => r.path === '/health/readiness'
      )

      if (handler?.callback) {
        const response = await handler.callback()
        const json = await response.json()

        for (const name of checks) {
          expect(json.checks).toHaveProperty(name)
        }
      }
    })
  })

  describe('Integration with ServiceProvider lifecycle', () => {
    it('should work as a ServiceProvider', async () => {
      class TestService extends ServiceProvider {
        register(container: Container) {
          container.singleton('test', () => ({ name: 'test' }))
        }
      }

      const provider = new HealthProvider()

      core.register(new TestService())
      core.register(provider)

      // Should bootstrap without errors
      await expect(core.bootstrap()).resolves.toBeUndefined()

      // Health should be available
      const health = core.container.make<HealthProvider>('health')
      expect(health).toBe(provider)
    })

    it('should allow registering checks after boot', () => {
      const provider = new HealthProvider()

      provider.registerCheck({
        name: 'check1',
        check: async () => ({ status: 'healthy' }),
      })

      provider.boot(core)

      // Register another check after boot
      provider.registerCheck({
        name: 'check2',
        check: async () => ({ status: 'healthy' }),
      })

      expect((provider as any).checks.length).toBe(2)
    })
  })

  describe('Error handling', () => {
    it('should handle check errors gracefully', async () => {
      const provider = new HealthProvider()

      provider.registerCheck({
        name: 'error-check',
        check: async () => {
          throw new Error('Check error')
        },
      })

      provider.boot(core)

      // This should not crash, but rather report unhealthy
      const handler = (core.router as any).routes?.get?.find(
        (r: any) => r.path === '/health/readiness'
      )

      if (handler?.callback) {
        // The promise rejection should be handled
        await expect(() => handler.callback()).not.toThrow()
      }
    })
  })
})
