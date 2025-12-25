import { beforeEach, describe, expect, it } from 'bun:test'
import { BunNativeAdapter } from '../src/adapters/bun/BunNativeAdapter'
import type { PlanetCore } from '../src/PlanetCore'
import { Router } from '../src/Router'

// Actually we can mock PlanetCore easily since it just needs an adapter.

// Mock GravityCore-like structure or assume we can instantiate it
// But PlanetCore expects config.
// Let's create a minimal test setup.

describe('Router Integration (BunNativeAdapter)', () => {
  let adapter: BunNativeAdapter
  let core: PlanetCore
  let router: Router

  beforeEach(async () => {
    // Setup adapter
    adapter = new BunNativeAdapter()

    // Mock PlanetCore minimal interface required by Router
    // Router needs `core.adapter` and `core.app` (for Photon fallback, but we are testing Bun)
    // Router constructor uses `core.adapter.useGlobal`

    core = {
      adapter: adapter,
      // Mock empty app for legacy Router parts if any still exist (we removed them!)
      app: {} as any,
    } as unknown as PlanetCore

    router = new Router(core)
  })

  it('should register and match a GET route', async () => {
    router.get('/hello', (c) => c.text('Hello World'))

    const req = new Request('http://localhost/hello')
    const res = await adapter.fetch(req)

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hello World')
  })

  it('should handle route parameters', async () => {
    router.get('/user/:id', (c) => c.json({ id: c.req.param('id') }))

    const req = new Request('http://localhost/user/123')
    const res = await adapter.fetch(req)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ id: '123' })
  })

  it('should handle route groups with prefix', async () => {
    router.prefix('/api').group((r) => {
      r.get('/users', (c) => c.text('Users API'))
    })

    const req = new Request('http://localhost/api/users')
    const res = await adapter.fetch(req)

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Users API')
  })

  it('should handle middleware in routes', async () => {
    const auth = async (c: any, next: any) => {
      c.set('user', 'admin')
      await next()
    }

    router.middleware(auth).group((r) => {
      r.get('/admin', (c) => c.text(`User: ${c.get('user')}`))
    })

    const req = new Request('http://localhost/admin')
    const res = await adapter.fetch(req)

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('User: admin')
  })

  it('should handle resource routes', async () => {
    // Mock controller class
    class UserController {
      index(c: any) {
        return c.text('Index')
      }
      show(c: any) {
        return c.text(`Show ${c.req.param('id')}`)
      }
    }

    router.resource('photos', UserController as any, { only: ['index', 'show'] })

    const req1 = new Request('http://localhost/photos')
    const res1 = await adapter.fetch(req1)
    expect(await res1.text()).toBe('Index')

    const req2 = new Request('http://localhost/photos/42')
    const res2 = await adapter.fetch(req2)
    expect(await res2.text()).toBe('Show 42')
  })

  it('should handle POST requests', async () => {
    router.post('/submit', async (c) => {
      const body = await c.req.json()
      return c.json({ received: body })
    })

    const req = new Request('http://localhost/submit', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
    })
    const res = await adapter.fetch(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: { foo: 'bar' } })
  })

  it('should return 404 for unknown routes', async () => {
    const req = new Request('http://localhost/unknown')
    const res = await adapter.fetch(req)
    expect(res.status).toBe(404)
  })
})
