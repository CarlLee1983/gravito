import { describe, expect, it } from 'bun:test'
import { FastContext } from '../FastContext'

describe('FastContext', () => {
  it('should reset state correctly', () => {
    const ctx = new FastContext()
    const req = new Request('http://localhost/test')

    ctx.init(req, { id: '1' })
    expect(ctx.req.url).toBe('http://localhost/test')
    expect(ctx.req.param('id')).toBe('1')

    // Reset for pooling
    ctx.reset()
    expect(() => ctx.req.url).toThrow()

    // Re-init with new request
    const req2 = new Request('http://localhost/new')
    ctx.init(req2)
    expect(ctx.req.url).toBe('http://localhost/new')
    expect(ctx.req.param('id')).toBeUndefined()
  })

  describe('Request Helpers', () => {
    it('should parse query parameters lazily', () => {
      const ctx = new FastContext()
      const req = new Request('http://localhost/?q=hello&page=1')
      ctx.init(req)

      expect(ctx.req.query('q')).toBe('hello')
      expect(ctx.req.query('page')).toBe('1')
      expect(ctx.req.query('missing')).toBeUndefined()
    })

    it('should handle multiple query values', () => {
      const ctx = new FastContext()
      const req = new Request('http://localhost/?tag=a&tag=b')
      ctx.init(req)

      const queries = ctx.req.queries()
      expect(queries.tag).toEqual(['a', 'b'])
    })

    it('should access headers', () => {
      const ctx = new FastContext()
      const req = new Request('http://localhost/', {
        headers: { 'X-Custom': 'value' },
      })
      ctx.init(req)

      expect(ctx.req.header('x-custom')).toBe('value')
      expect(ctx.req.header('missing')).toBeUndefined()

      const all = ctx.req.headers()
      expect(all['x-custom']).toBe('value')
    })

    it('should parse body methods', async () => {
      const ctx = new FastContext()
      const body = { test: true }
      const req = new Request('http://localhost/', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      ctx.init(req)

      expect(await ctx.req.json()).toEqual(body)

      // Reset for text test (stream consumed, so need new request in real world,
      // but FastContext just proxies. Only one read allowed per request usually)
      const req2 = new Request('http://localhost/', {
        method: 'POST',
        body: 'text content',
      })
      ctx.init(req2)
      expect(await ctx.req.text()).toBe('text content')
    })
  })

  describe('Response Helpers', () => {
    it('should create JSON response', async () => {
      const ctx = new FastContext()
      ctx.init(new Request('http://localhost'))
      const res = ctx.json({ ok: true }, 201)

      expect(res.status).toBe(201)
      expect(res.headers.get('Content-Type')).toContain('application/json')
      expect(await res.json()).toEqual({ ok: true })
    })

    it('should create text response', async () => {
      const ctx = new FastContext()
      ctx.init(new Request('http://localhost'))
      const res = ctx.text('hello')

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/plain')
      expect(await res.text()).toBe('hello')
    })

    it('should create HTML response', async () => {
      const ctx = new FastContext()
      ctx.init(new Request('http://localhost'))
      const res = ctx.html('<h1>Hi</h1>')

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/html')
      expect(await res.text()).toBe('<h1>Hi</h1>')
    })

    it('should create redirect response', () => {
      const ctx = new FastContext()
      ctx.init(new Request('http://localhost'))
      const res = ctx.redirect('/new-location')

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe('/new-location')
    })

    it('should set custom headers on response', () => {
      const ctx = new FastContext()
      ctx.init(new Request('http://localhost'))
      ctx.header('X-Custom', '1')
      const res = ctx.json({})

      expect(res.headers.get('X-Custom')).toBe('1')
    })
  })
})
