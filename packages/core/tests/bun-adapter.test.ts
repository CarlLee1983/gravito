import { describe, expect, it } from 'bun:test'
import { BunNativeAdapter } from '../src/adapters/bun/BunNativeAdapter'

describe('BunNativeAdapter', () => {
  it('handles basic GET request', async () => {
    const adapter = new BunNativeAdapter()

    adapter.route('get', '/hello', async (ctx) => {
      return ctx.text('Hello World')
    })

    const req = new Request('http://localhost/hello')
    const res = await adapter.fetch(req)

    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Hello World')
    expect(res.headers.get('Content-Type')).toBe('text/plain')
  })

  it('handles dynamic parameters', async () => {
    const adapter = new BunNativeAdapter()

    adapter.route('get', '/users/:id', async (ctx) => {
      const id = ctx.req.param('id')
      return ctx.json({ id })
    })

    const req = new Request('http://localhost/users/123')
    const res = await adapter.fetch(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ id: '123' })
  })

  it('runs middleware chain', async () => {
    // TODO: Fix path-specific middleware matching in BunNativeAdapter
    // Issue: Path middleware (/api) not being triggered for /api/test route
    const adapter = new BunNativeAdapter()
    const trace: string[] = []

    // Global Middleware
    adapter.use('*', async (_ctx, next) => {
      trace.push('global-start')
      await next()
      trace.push('global-end')
    })

    // Path Middleware
    adapter.use('/api', async (_ctx, next) => {
      trace.push('api-start')
      await next()
      trace.push('api-end')
    })

    adapter.route('get', '/api/test', async (ctx) => {
      trace.push('handler')
      return ctx.text('ok')
    })

    const req = new Request('http://localhost/api/test')
    const res = await adapter.fetch(req)

    expect(res.status).toBe(200)
    expect(trace).toEqual(['global-start', 'api-start', 'handler', 'api-end', 'global-end'])
  })

  it('handles 404', async () => {
    const adapter = new BunNativeAdapter()
    const req = new Request('http://localhost/not-found')
    const res = await adapter.fetch(req)
    expect(res.status).toBe(404)
  })

  it('handles errors', async () => {
    const adapter = new BunNativeAdapter()

    adapter.route('get', '/error', async () => {
      throw new Error('Boom')
    })

    adapter.onError(async (err, ctx) => {
      return ctx.json({ error: err.message }, 500)
    })

    const req = new Request('http://localhost/error')
    const res = await adapter.fetch(req)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Boom' })
  })

  it('supports context variables', async () => {
    const adapter = new BunNativeAdapter()

    adapter.use('*', async (ctx, next) => {
      ctx.set('user', { name: 'Carl' })
      await next()
    })

    adapter.route('get', '/me', async (ctx) => {
      const user = ctx.get('user')
      return ctx.json(user)
    })

    const req = new Request('http://localhost/me')
    const res = await adapter.fetch(req)
    expect(await res.json()).toEqual({ name: 'Carl' })
  })
})
