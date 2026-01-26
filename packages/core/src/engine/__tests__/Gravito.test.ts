/**
 * Basic tests for Gravito Engine
 */

import { describe, expect, it } from 'bun:test'
import { Gravito } from '../Gravito'
import type { Handler } from '../types'

describe('Gravito Engine', () => {
  describe('Basic Routing', () => {
    it('should handle GET request', async () => {
      const app = new Gravito()
      app.get('/', (c) => c.json({ message: 'Hello' }))

      const req = new Request('http://localhost/')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual({ message: 'Hello' })
    })

    it('should handle route parameters', async () => {
      const app = new Gravito()
      app.get('/users/:id', (c) => {
        const id = c.req.param('id')
        return c.json({ id })
      })

      const req = new Request('http://localhost/users/123')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual({ id: '123' })
    })

    it('should handle POST request', async () => {
      const app = new Gravito()
      app.post('/users', async (c) => {
        const body = await c.req.json()
        return c.json({ created: body }, 201)
      })

      const req = new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'John' }),
      })
      const res = await app.fetch(req)

      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data).toEqual({ created: { name: 'John' } })
    })

    it('should return 404 for unknown routes', async () => {
      const app = new Gravito()
      app.get('/', (c) => c.json({ message: 'Hello' }))

      const req = new Request('http://localhost/unknown')
      const res = await app.fetch(req)

      expect(res.status).toBe(404)
    })
  })

  describe('Route Mounting', () => {
    it('should mount sub-application routes', async () => {
      const api = new Gravito()
      api.get('/users', (c) => c.json({ users: [] }))

      const app = new Gravito()
      app.route('/api', api)

      const req = new Request('http://localhost/api/users')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual({ users: [] })
    })

    it('should mount sub-application with middleware', async () => {
      const sub = new Gravito()
      sub.use(async (c, next) => {
        c.header('X-Sub', 'true')
        return await next()
      })
      sub.get('/test', (c) => c.text('ok'))

      const app = new Gravito()
      app.route('/sub', sub)

      const req = new Request('http://localhost/sub/test')
      const res = await app.fetch(req)

      expect(res.status).toBe(200)
      expect(res.headers.get('X-Sub')).toBe('true')
      expect(await res.text()).toBe('ok')
    })
  })

  describe('Middleware', () => {
    it('should execute global middleware', async () => {
      const app = new Gravito()
      const calls: string[] = []

      app.use(async (_c, next) => {
        calls.push('middleware')
        return await next()
      })

      app.get('/', (c) => {
        calls.push('handler')
        return c.json({ ok: true })
      })

      const req = new Request('http://localhost/')
      await app.fetch(req)

      expect(calls).toEqual(['middleware', 'handler'])
    })

    it('should execute multiple middleware in order', async () => {
      const app = new Gravito()
      const calls: number[] = []

      app.use(async (_c, next) => {
        calls.push(1)
        return await next()
      })

      app.use(async (_c, next) => {
        calls.push(2)
        return await next()
      })

      app.get('/', (c) => {
        calls.push(3)
        return c.json({ ok: true })
      })

      const req = new Request('http://localhost/')
      await app.fetch(req)

      expect(calls).toEqual([1, 2, 3])
    })

    it('should support route-specific middleware', async () => {
      const app = new Gravito()
      const calls: string[] = []

      app.get(
        '/protected',
        (async (_c: any, next: any) => {
          calls.push('auth')
          return await next()
        }) as unknown as Handler,
        (c) => {
          calls.push('handler')
          return c.json({ ok: true })
        }
      )

      const req = new Request('http://localhost/protected')
      await app.fetch(req)

      expect(calls).toEqual(['auth', 'handler'])
    })
  })

  describe('Error Handling', () => {
    it('should handle errors with custom error handler', async () => {
      const app = new Gravito()

      app.onError((err, c) => {
        return c.json({ error: err.message }, 500)
      })

      app.get('/error', () => {
        throw new Error('Test error')
      })

      const req = new Request('http://localhost/error')
      const res = await app.fetch(req)

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data).toEqual({ error: 'Test error' })
    })

    it('should handle 404 with custom handler', async () => {
      const app = new Gravito()

      app.notFound((c) => {
        return c.json({ error: 'Custom 404' }, 404)
      })

      const req = new Request('http://localhost/unknown')
      const res = await app.fetch(req)

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data).toEqual({ error: 'Custom 404' })
    })
  })

  describe('HTTP Methods', () => {
    it('should support all HTTP methods', async () => {
      const app = new Gravito()

      app.get('/test', (c) => c.json({ method: 'GET' }))
      app.post('/test', (c) => c.json({ method: 'POST' }))
      app.put('/test', (c) => c.json({ method: 'PUT' }))
      app.delete('/test', (c) => c.json({ method: 'DELETE' }))
      app.patch('/test', (c) => c.json({ method: 'PATCH' }))

      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

      for (const method of methods) {
        const req = new Request('http://localhost/test', { method })
        const res = await app.fetch(req)
        const data = await res.json()
        expect(data).toEqual({ method })
      }
    })
  })

  describe('Context', () => {
    it('should provide query parameters', async () => {
      const app = new Gravito()
      app.get('/search', (c) => {
        const q = c.req.query('q')
        return c.json({ query: q })
      })

      const req = new Request('http://localhost/search?q=test')
      const res = await app.fetch(req)
      const data = await res.json()

      expect(data).toEqual({ query: 'test' })
    })

    it('should provide headers', async () => {
      const app = new Gravito()
      app.get('/headers', (c) => {
        const auth = c.req.header('Authorization')
        return c.json({ auth })
      })

      const req = new Request('http://localhost/headers', {
        headers: { Authorization: 'Bearer token' },
      })
      const res = await app.fetch(req)
      const data = await res.json()

      expect(data).toEqual({ auth: 'Bearer token' })
    })

    it('should set response headers', async () => {
      const app = new Gravito()
      app.get('/', (c) => {
        c.header('X-Custom', 'value')
        return c.json({ ok: true })
      })

      const req = new Request('http://localhost/')
      const res = await app.fetch(req)

      expect(res.headers.get('X-Custom')).toBe('value')
    })
  })
})
