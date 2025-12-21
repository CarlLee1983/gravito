import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import packageJson from '../package.json'
import { PlanetCore, VERSION } from '../src/index'

describe('gravito-core', () => {
  describe('VERSION', () => {
    it('should export the correct version from package.json', () => {
      expect(VERSION).toBe(packageJson.version)
    })

    it('should be a valid semver string', () => {
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+/)
    })
  })

  describe('PlanetCore Integration', () => {
    it('should register filters and process data', async () => {
      const core = new PlanetCore()

      core.hooks.addFilter('test_filter', (val: string) => val.toUpperCase())

      const result = await core.hooks.applyFilters('test_filter', 'hello')
      expect(result).toBe('HELLO')
    })

    it('should trigger actions', async () => {
      const core = new PlanetCore()
      let count = 0

      core.hooks.addAction('test_action', () => {
        count++
      })

      await core.hooks.doAction('test_action', {})
      expect(count).toBe(1)
    })

    it('should mount orbits and serve requests', async () => {
      const core = new PlanetCore()
      const orbit = new Hono()
      orbit.use('*', async (c, next) => {
        console.log('[DEBUG] Orbit Request:', c.req.method, c.req.url, c.req.path)
        console.log('[DEBUG] Headers:', c.req.header())
        await next()
      })

      orbit.get('/ping', (c) => c.text('pong'))
      orbit.all('*', (c) => {
        console.log('[DEBUG] Catch-all:', c.req.path, c.req.method)
        return c.text('Catch-all', 404)
      })

      // Verify orbit works standalone
      const standaloneRes = await orbit.fetch(new Request('http://localhost/ping'))
      const standaloneText = await standaloneRes.text()
      console.log('Standalone Orbit Response:', standaloneText)
      expect(standaloneText).toBe('pong')

      // Test HonoAdapter directly
      const { HonoAdapter } = await import('../src/adapters/HonoAdapter')
      const adapter = new HonoAdapter({}, orbit)
      const adapterRes = await adapter.fetch(new Request('http://localhost/ping'))
      const adapterText = await adapterRes.text()
      console.log('HonoAdapter Response:', adapterText)
      expect(adapterText).toBe('pong')

      // Simulate BunNativeAdapter request rewriting logic
      const originalReq = new Request('http://localhost/orbit/ping')
      const simUrl = new URL(originalReq.url)
      simUrl.pathname = '/ping'
      const simulatedReq = new Request(simUrl.toString(), {
        method: originalReq.method,
        headers: originalReq.headers
      })
      const simRes = await adapter.fetch(simulatedReq)
      const simText = await simRes.text()
      console.log('Simulated Adapter Response:', simText)
      expect(simText).toBe('pong')

      // Use a fresh instance to rule out state issues
      const freshOrbit = new Hono()
      freshOrbit.get('/ping', (c) => c.text('pong'))

      core.mountOrbit('/fresh', freshOrbit)
      const { fetch } = core.liftoff(0)

      const res = await fetch(new Request('http://localhost/fresh/ping'))
      const text = await res.text()
      console.log('Fresh Orbit Response text:', text)
      console.log('Fresh Orbit Response status:', res.status)
      expect(text).toBe('pong')
    })
  })
})
