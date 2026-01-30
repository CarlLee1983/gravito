import { describe, expect, it } from 'bun:test'
import { BunNativeAdapter } from '../src/adapters/bun/BunNativeAdapter'
import { PhotonAdapter } from '../src/adapters/PhotonAdapter'
import { PlanetCore } from '../src/PlanetCore'

describe('Orbit Middleware Isolation', () => {
  describe('useScoped() validation in PhotonAdapter', () => {
    it('should reject wildcard "*" path', () => {
      const adapter = new PhotonAdapter()

      expect(() => {
        adapter.useScoped('/api', '*', async (c, next) => next())
      }).toThrow(/Cannot use wildcard path/)
    })

    it('should reject wildcard "*/*" path', () => {
      const adapter = new PhotonAdapter()

      expect(() => {
        adapter.useScoped('/api', '*/*', async (c, next) => next())
      }).toThrow(/Cannot use wildcard path/)
    })

    it('should accept specific paths under scope', () => {
      const adapter = new PhotonAdapter()

      expect(() => {
        adapter.useScoped('/api', '/users', async (c, next) => next())
      }).not.toThrow()

      expect(() => {
        adapter.useScoped('/api', '/users/*', async (c, next) => next())
      }).not.toThrow()
    })

    it('should normalize scope prefix correctly', () => {
      const adapter = new PhotonAdapter()

      // Should work with leading slash
      expect(() => {
        adapter.useScoped('/api', '/users', async (c, next) => next())
      }).not.toThrow()

      // Should work without leading slash
      expect(() => {
        adapter.useScoped('api', '/users', async (c, next) => next())
      }).not.toThrow()
    })
  })

  describe('useScoped() validation in BunNativeAdapter', () => {
    it('should reject wildcard "*" path', () => {
      const adapter = new BunNativeAdapter()

      expect(() => {
        adapter.useScoped('/api', '*', async (c, next) => next())
      }).toThrow(/Cannot use wildcard path/)
    })

    it('should reject wildcard "*/*" path', () => {
      const adapter = new BunNativeAdapter()

      expect(() => {
        adapter.useScoped('/api', '*/*', async (c, next) => next())
      }).toThrow(/Cannot use wildcard path/)
    })

    it('should accept specific paths under scope', () => {
      const adapter = new BunNativeAdapter()

      expect(() => {
        adapter.useScoped('/api', '/users', async (c, next) => next())
      }).not.toThrow()
    })
  })

  describe('PlanetCore.mountOrbit() basic functionality', () => {
    it('should successfully mount and route to an Orbit', async () => {
      const core = new PlanetCore()
      const orbitApp = new PlanetCore()

      orbitApp.adapter.use('/', async (c) => c.text('orbit response'))

      core.mountOrbit('/blog', orbitApp)

      const req = new Request('http://localhost:3000/blog/posts')
      const res = await core.adapter.fetch(req)

      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toBe('orbit response')
    })

    it('should isolate middleware between different Orbits', async () => {
      const core = new PlanetCore()
      const blogOrbit = new PlanetCore()
      const apiOrbit = new PlanetCore()

      let blogCalled = false
      let apiCalled = false

      blogOrbit.adapter.use('/', async (c) => {
        blogCalled = true
        return c.text('blog')
      })

      apiOrbit.adapter.use('/', async (c) => {
        apiCalled = true
        return c.text('api')
      })

      core.mountOrbit('/blog', blogOrbit)
      core.mountOrbit('/api', apiOrbit)

      await core.adapter.fetch(new Request('http://localhost:3000/blog/posts'))
      expect(blogCalled).toBe(true)
      expect(apiCalled).toBe(false)

      blogCalled = false
      await core.adapter.fetch(new Request('http://localhost:3000/api/users'))
      expect(blogCalled).toBe(false)
      expect(apiCalled).toBe(true)
    })
  })
})
