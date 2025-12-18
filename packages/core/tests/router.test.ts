import { describe, expect, it } from 'bun:test'
import { PlanetCore } from '../src/PlanetCore'
import { Router } from '../src/Router'

class TestController {
  index(c: any) {
    return c.text('index')
  }

  api(c: any) {
    return c.text('api')
  }
}

describe('Router', () => {
  it('should register basic routes with controller binding', async () => {
    const core = new PlanetCore()
    const router = new Router(core)

    router.get('/', [TestController, 'index'])

    const res = await core.app.request('/')
    expect(await res.text()).toBe('index')
  })

  it('should handle route groups with prefix', async () => {
    const core = new PlanetCore()
    const router = new Router(core)

    router.prefix('/api').group((r) => {
      r.get('/test', [TestController, 'api'])
    })

    const res = await core.app.request('/api/test')
    expect(await res.text()).toBe('api')
  })

  it('should handle nested groups', async () => {
    const core = new PlanetCore()
    const router = new Router(core)

    router.prefix('/api').group((api) => {
      api.prefix('/v1').group((v1) => {
        v1.get('/users', [TestController, 'api'])
      })
    })

    const res = await core.app.request('/api/v1/users')
    expect(await res.text()).toBe('api')
  })

  it('should handle middleware in groups', async () => {
    const core = new PlanetCore()
    const router = new Router(core)
    let middlewareCalled = false

    const testMiddleware = async (_c: any, next: any) => {
      middlewareCalled = true
      await next()
    }

    router
      .prefix('/mw')
      .middleware(testMiddleware)
      .group((r) => {
        r.get('/test', [TestController, 'api'])
      })

    const res = await core.app.request('/mw/test')
    expect(await res.text()).toBe('api')
    expect(middlewareCalled).toBe(true)
  })

  // Domain test is tricky because we need to mock Host header
  it('should handle domain routing', async () => {
    const core = new PlanetCore()
    const router = new Router(core)

    router.domain('api.example.com').group((r) => {
      r.get('/', [TestController, 'api'])
    })

    // Match
    const res1 = await core.app.request('/', { headers: { host: 'api.example.com' } })
    expect(await res1.text()).toBe('api')

    // No Match (fallback or 404)
    const res2 = await core.app.request('/', { headers: { host: 'www.example.com' } })
    expect(res2.status).toBe(404)
  })

  it('should accept middleware as array', async () => {
    const core = new PlanetCore()
    const router = new Router(core)
    const callOrder: string[] = []

    const mw1 = async (_c: any, next: any) => {
      callOrder.push('mw1')
      await next()
    }
    const mw2 = async (_c: any, next: any) => {
      callOrder.push('mw2')
      await next()
    }
    const mw3 = async (_c: any, next: any) => {
      callOrder.push('mw3')
      await next()
    }

    // Pass array directly
    router
      .prefix('/arr')
      .middleware([mw1, mw2], mw3)
      .group((r) => {
        r.get('/test', (c) => c.text('ok'))
      })

    const res = await core.app.request('/arr/test')
    expect(await res.text()).toBe('ok')
    expect(callOrder).toEqual(['mw1', 'mw2', 'mw3'])
  })

  it('should accept FormRequest as second parameter', async () => {
    const core = new PlanetCore()
    const router = new Router(core)

    // Mock FormRequest class
    class StoreUserRequest {
      schema = { _type: 'mock' }
      source = 'json'

      async validate(ctx: any) {
        const body = await ctx.req.json().catch(() => ({}))
        if (!body.name || body.name.length < 2) {
          return {
            success: false,
            error: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: [{ field: 'name', message: 'Name too short' }],
              },
            },
          }
        }
        return { success: true, data: body }
      }
    }

    router.post('/users', StoreUserRequest, (ctx) => {
      const validated = ctx.get('validated')
      return ctx.json({ user: validated })
    })

    // Valid request
    const res1 = await core.app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Carl' }),
    })
    expect(res1.status).toBe(200)
    const json1 = (await res1.json()) as { user: { name: string } }
    expect(json1.user.name).toBe('Carl')

    // Invalid request
    const res2 = await core.app.request('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'A' }),
    })
    expect(res2.status).toBe(422)
    const json2 = (await res2.json()) as { error: { code: string } }
    expect(json2.error.code).toBe('VALIDATION_ERROR')
  })

  it('should work with FormRequest in route groups', async () => {
    const core = new PlanetCore()
    const router = new Router(core)

    class QueryRequest {
      schema = {}
      source = 'query'

      async validate(ctx: any) {
        const query = ctx.req.query()
        if (!query.q) {
          return {
            success: false,
            error: {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Missing q parameter',
                details: [{ field: 'q', message: 'Required' }],
              },
            },
          }
        }
        return { success: true, data: query }
      }
    }

    router.prefix('/api').group((r) => {
      r.get('/search', QueryRequest, (ctx) => {
        const validated = ctx.get('validated') as { q: string }
        return ctx.json({ query: validated.q })
      })
    })

    // Valid
    const res1 = await core.app.request('/api/search?q=hello')
    expect(res1.status).toBe(200)
    const json1 = (await res1.json()) as { query: string }
    expect(json1.query).toBe('hello')

    // Invalid
    const res2 = await core.app.request('/api/search')
    expect(res2.status).toBe(422)
  })
})
