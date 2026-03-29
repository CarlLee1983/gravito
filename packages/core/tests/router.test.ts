import { describe, expect, it, spyOn } from 'bun:test'
import type { GravitoContext as Context, GravitoMiddleware } from '../src/index'
import { PlanetCore } from '../src/PlanetCore'
import { Router } from '../src/Router'

class TestController {
  index(c: Context) {
    return c.text('index')
  }

  api(c: Context) {
    return c.text('api')
  }

  [key: string]: unknown
}

describe('Router', () => {
  it('should register basic routes with controller binding', async () => {
    const core = new PlanetCore()
    const router = new Router(core)

    router.get('/', [TestController, 'index'])

    const res = await core.adapter.fetch(new Request('http://localhost/'))
    expect(await res.text()).toBe('index')
  })

  it('should handle route groups with prefix', async () => {
    const core = new PlanetCore()
    const router = new Router(core)

    router.prefix('/api').group((r) => {
      r.get('/test', [TestController, 'api'])
    })

    const res = await core.adapter.fetch(new Request('http://localhost/api/test'))
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

    const res = await core.adapter.fetch(new Request('http://localhost/api/v1/users'))
    expect(await res.text()).toBe('api')
  })

  it('should handle middleware in groups', async () => {
    const core = new PlanetCore()
    const router = new Router(core)
    let middlewareCalled = false

    const testMiddleware: GravitoMiddleware = async (_c, next) => {
      middlewareCalled = true
      await next()
      return undefined
    }

    router
      .prefix('/mw')
      .middleware(testMiddleware)
      .group((r) => {
        r.get('/test', [TestController, 'api'])
      })

    const res = await core.adapter.fetch(new Request('http://localhost/mw/test'))
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
    const res1 = await core.adapter.fetch(
      new Request('http://localhost/', { headers: { host: 'api.example.com' } })
    )
    expect(await res1.text()).toBe('api')

    // No Match (fallback or 404)
    const res2 = await core.adapter.fetch(
      new Request('http://localhost/', { headers: { host: 'www.example.com' } })
    )
    expect(res2.status).toBe(404)
  })

  it('should accept middleware as array', async () => {
    const core = new PlanetCore()
    const router = new Router(core)
    const callOrder: string[] = []

    const mw1: GravitoMiddleware = async (_c, next) => {
      callOrder.push('mw1')
      await next()
      return undefined
    }
    const mw2: GravitoMiddleware = async (_c, next) => {
      callOrder.push('mw2')
      await next()
      return undefined
    }
    const mw3: GravitoMiddleware = async (_c, next) => {
      callOrder.push('mw3')
      await next()
      return undefined
    }

    // Pass array directly
    router
      .prefix('/arr')
      .middleware([mw1, mw2], mw3)
      .group((r) => {
        r.get('/test', (c) => c.text('ok'))
      })

    const res = await core.adapter.fetch(new Request('http://localhost/arr/test'))
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

      async validate(ctx: unknown) {
        const c = ctx as Context
        const body = (await c.req.json().catch(() => ({}))) as { name?: string }
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
    const res1 = await core.adapter.fetch(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Carl' }),
      })
    )
    expect(res1.status).toBe(200)
    const json1 = (await res1.json()) as { user: { name: string } }
    expect(json1.user.name).toBe('Carl')

    // Invalid request
    const res2 = await core.adapter.fetch(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A' }),
      })
    )
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

      async validate(ctx: unknown) {
        const c = ctx as Context
        const query = c.req.queries()
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
    const res1 = await core.adapter.fetch(new Request('http://localhost/api/search?q=hello'))
    expect(res1.status).toBe(200)
    const json1 = (await res1.json()) as { query: string }
    expect(json1.query).toBe('hello')

    // Invalid
    const res2 = await core.adapter.fetch(new Request('http://localhost/api/search'))
    expect(res2.status).toBe(422)
  })

  it('should generate URL from named routes', () => {
    const core = new PlanetCore()
    const router = new Router(core)

    router.get('/users/:id/posts/:postId', () => new Response('ok')).name('user.post.show')

    // Basic generation
    expect(router.url('user.post.show', { id: 1, postId: 42 })).toBe('/users/1/posts/42')

    // With query parameters
    expect(
      router.url(
        'user.post.show',
        { id: 'foo', postId: 'bar' },
        { sort: 'desc', filter: 'active', empty: null, undef: undefined }
      )
    ).toBe('/users/foo/posts/bar?sort=desc&filter=active')

    // Missing param throws
    expect(() => router.url('user.post.show', { id: 1 })).toThrow(
      "Missing route param 'postId' for route 'user.post.show'"
    )

    // Unregistered route throws
    expect(() => router.url('unknown.route')).toThrow("Named route 'unknown.route' not found")
  })
})

describe('API Footgun Fixes', () => {
  it('should not log to console when registering routes', () => {
    const core = new PlanetCore()
    const spy = spyOn(console, 'log').mockImplementation(() => {})
    try {
      core.router.get('/test-silent', async (c) => c.text('ok'))
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  it('should throw ModelNotFoundException (not string sentinel) from model binding', async () => {
    const core = new PlanetCore()
    const { ModelNotFoundException } = await import('../src/exceptions/ModelNotFoundException')

    // Create a mock model class whose find() returns null
    const MockModel = {
      find: async (_id: string) => null,
    }

    core.router.model('post', MockModel)
    core.router.get('/posts/:post', async (c) => c.text('ok'))

    const req = new Request('http://localhost:3000/posts/999')
    const res = await core.adapter.fetch(req)

    // ModelNotFoundException has status 404
    expect(res.status).toBe(404)
  })
})
