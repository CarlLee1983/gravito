/**
 * @fileoverview Optimization Baseline Benchmarks
 *
 * Measures performance of optimized features:
 * - Body payload caching (json, text, formData)
 * - Query parameter caching
 * - Middleware precompilation and caching
 *
 * Run with: bun benchmarks/optimization-baseline.bench.ts
 */

import { bench, group, run } from 'mitata'
import { FastContext } from '../src/engine/FastContext'
import { Gravito } from '../src/engine/Gravito'
import { MinimalContext } from '../src/engine/MinimalContext'
import type { Middleware } from '../src/engine/types'

// ─────────────────────────────────────────────────────────────────────────
// Body Caching Benchmarks
// ─────────────────────────────────────────────────────────────────────────

group('Body Caching - FastContext', () => {
  const jsonBody = JSON.stringify({ id: 1, name: 'test', email: 'test@example.com' })
  const textBody = 'Hello World - This is a test response body'

  bench('json() single call', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: jsonBody,
    })
    const ctx = new FastContext()
    ctx.init(request)
    await ctx.req.json()
  })

  bench('json() cached (3x calls)', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: jsonBody,
    })
    const ctx = new FastContext()
    ctx.init(request)
    await ctx.req.json()
    await ctx.req.json()
    await ctx.req.json()
  })

  bench('text() single call', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: textBody,
    })
    const ctx = new FastContext()
    ctx.init(request)
    await ctx.req.text()
  })

  bench('text() cached (3x calls)', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: textBody,
    })
    const ctx = new FastContext()
    ctx.init(request)
    await ctx.req.text()
    await ctx.req.text()
    await ctx.req.text()
  })
})

group('Body Caching - MinimalContext', () => {
  const jsonBody = JSON.stringify({ id: 1, name: 'test', email: 'test@example.com' })

  bench('json() single call', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: jsonBody,
    })
    const ctx = new MinimalContext(request, {}, '/api/test')
    await ctx.req.json()
  })

  bench('json() cached (3x calls)', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      body: jsonBody,
    })
    const ctx = new MinimalContext(request, {}, '/api/test')
    await ctx.req.json()
    await ctx.req.json()
    await ctx.req.json()
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Query Parameter Caching Benchmarks
// ─────────────────────────────────────────────────────────────────────────

group('Query Caching - MinimalContext', () => {
  const urlSimple = 'http://localhost/api/test?id=1&name=john'
  const urlComplex =
    'http://localhost/api/test?page=1&limit=10&sort=name&filter=active&tag=js&tag=ts&search=hello%20world'

  bench('queries() simple URL single call', () => {
    const request = new Request(urlSimple, { method: 'GET' })
    const ctx = new MinimalContext(request, {}, '/api/test')
    ctx.req.queries()
  })

  bench('queries() simple URL cached (5x calls)', () => {
    const request = new Request(urlSimple, { method: 'GET' })
    const ctx = new MinimalContext(request, {}, '/api/test')
    for (let i = 0; i < 5; i++) {
      ctx.req.queries()
    }
  })

  bench('queries() complex URL single call', () => {
    const request = new Request(urlComplex, { method: 'GET' })
    const ctx = new MinimalContext(request, {}, '/api/test')
    ctx.req.queries()
  })

  bench('queries() complex URL cached (5x calls)', () => {
    const request = new Request(urlComplex, { method: 'GET' })
    const ctx = new MinimalContext(request, {}, '/api/test')
    for (let i = 0; i < 5; i++) {
      ctx.req.queries()
    }
  })
})

group('Query Caching - FastContext', () => {
  const urlSimple = 'http://localhost/api/test?id=1&name=john'

  bench('queries() simple URL single call', () => {
    const request = new Request(urlSimple, { method: 'GET' })
    const ctx = new FastContext()
    ctx.init(request)
    ctx.req.queries()
  })

  bench('queries() simple URL cached (5x calls)', () => {
    const request = new Request(urlSimple, { method: 'GET' })
    const ctx = new FastContext()
    ctx.init(request)
    for (let i = 0; i < 5; i++) {
      ctx.req.queries()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Middleware Precompilation and Caching Benchmarks
// ─────────────────────────────────────────────────────────────────────────

group('Middleware Collection Caching', () => {
  const app = new Gravito()

  // Setup middleware
  const m1: Middleware = async (c, next) => next()
  const m2: Middleware = async (c, next) => next()
  const m3: Middleware = async (c, next) => next()

  app.use(m1)
  app.use(m2)
  app.usePattern('/api/*', m3)

  // Setup routes
  for (let i = 0; i < 50; i++) {
    app.get(`/api/route-${i}`, (c) => c.text('OK'))
  }

  bench('Middleware collection (first call - cache miss)', () => {
    // This simulates first-time middleware collection
    const request = new Request('http://localhost/api/route-25')
    app.fetch(request)
  })

  bench('Middleware collection (repeated path - cache hit)', () => {
    // Repeated requests to same path should hit cache
    const request = new Request('http://localhost/api/route-25')
    app.fetch(request)
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Context Creation Performance
// ─────────────────────────────────────────────────────────────────────────

group('Context Creation', () => {
  bench('FastContext initialization', () => {
    const ctx = new FastContext()
    const request = new Request('http://localhost/api/test?id=1', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    })
    ctx.init(request, { userId: '123' }, '/api/test')
  })

  bench('MinimalContext creation', () => {
    const request = new Request('http://localhost/api/test?id=1', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    })
    new MinimalContext(request, { userId: '123' }, '/api/test')
  })

  bench('FastContext reset', () => {
    const ctx = new FastContext()
    const request = new Request('http://localhost/api/test')
    ctx.init(request)
    ctx.reset()
  })
})

// ─────────────────────────────────────────────────────────────────────────
// End-to-End Request Handling
// ─────────────────────────────────────────────────────────────────────────

group('End-to-End Request Handling', () => {
  const app = new Gravito()

  // Handler that reads body
  app.post('/body-read', async (c) => {
    const data = await c.req.json()
    return c.json({ received: data })
  })

  // Handler that reads query
  app.get('/query-read', (c) => {
    const queries = c.req.queries()
    return c.json({ queries })
  })

  // Handler with middleware
  const authMiddleware: Middleware = async (c, next) => {
    c.set('userId', '123')
    await next()
  }

  app.use(authMiddleware)

  app.get('/with-middleware', (c) => {
    const userId = c.get('userId')
    return c.text(`User: ${userId}`)
  })

  const bodyRequest = new Request('http://localhost/body-read', {
    method: 'POST',
    body: JSON.stringify({ id: 1, name: 'test' }),
  })

  const queryRequest = new Request('http://localhost/query-read?page=1&limit=10&sort=name')

  const middlewareRequest = new Request('http://localhost/with-middleware')

  bench('POST with body caching', async () => {
    await app.fetch(bodyRequest.clone())
  })

  bench('GET with query caching', async () => {
    await app.fetch(queryRequest.clone())
  })

  bench('GET with middleware', async () => {
    await app.fetch(middlewareRequest.clone())
  })
})

await run()
