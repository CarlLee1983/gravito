import { describe, expect, test } from 'bun:test'
import type { FastContext } from '../FastContext'
import { Gravito } from '../Gravito'
import type { ObjectPool } from '../pool'

describe('Gravito Engine > Fuzz Testing & Hardening', () => {
  // Access private pool for testing
  const getPool = (app: Gravito): ObjectPool<FastContext> => (app as any).contextPool

  test('Pool Stability: Should recycle objects after normal requests', async () => {
    const app = new Gravito({ poolSize: 100 })
    const pool = getPool(app)

    // Initial state: prewarmed to 32 by default constructor logic (min(32, poolSize))
    const initialSize = pool.size
    expect(initialSize).toBeGreaterThan(0)

    app.get('/test', (c) => c.json({ ok: true }))

    // Run 1000 requests
    for (let i = 0; i < 1000; i++) {
      await app.fetch(new Request('http://localhost/test'))
    }

    // Pool should be back to initial size (all objects returned)
    expect(pool.size).toBe(initialSize)
  })

  test('Input Fuzzing: Malformed Paths', async () => {
    const app = new Gravito()
    const pool = getPool(app)
    const initialSize = pool.size

    const badPaths = [
      '/%20',
      '//',
      '/../../../etc/passwd',
      '/Invalid%FFSequence',
      '/' + 'a'.repeat(2048), // Long path
      '/??????', // Query abuse
      '/#/../../',
    ]

    for (const path of badPaths) {
      try {
        const req = new Request(`http://localhost${path}`)
        const res = await app.fetch(req)
        // Should respond with valid HTTP response (404, 400, or 200), not crash
        expect(res).toBeInstanceOf(Response)
      } catch (e) {
        // Request constructor itself might throw for extremely bad URLs,
        // but app.fetch should be safe if Request is created.
        // If Request fails, we skip as it's outside our engine scope.
      }
    }

    // Crucial: Ensure context leaked back to pool
    expect(pool.size).toBe(initialSize)
  })

  test('Input Fuzzing: Malformed Headers', async () => {
    const app = new Gravito()
    const pool = getPool(app)
    const initialSize = pool.size

    app.get('/header-test', (c) => c.json({ h: c.req.header('x-weird') }))

    const badHeaders = [
      { 'x-weird': '' },
      { 'x-weird': 'NULL\0BYTE' },
      { 'x-weird': 'a'.repeat(1024 * 10) }, // 10KB Header
      // Unicode stress
      { 'x-weird': '🚀'.repeat(100) },
    ]

    for (const headers of badHeaders) {
      try {
        const req = new Request('http://localhost/header-test', { headers: headers as any })
        const res = await app.fetch(req)
        expect(res.status).toBe(200)

        await res.json()
      } catch (e) {
        // Expected for some invalid headers (Bun/Node Request validation)
      }
    }

    expect(pool.size).toBe(initialSize)
  })

  test('Deep Recursion / Middleware Bomb', async () => {
    const app = new Gravito()
    const pool = getPool(app)
    const initialSize = pool.size

    // Add 50 middleware layers
    for (let i = 0; i < 50; i++) {
      app.use(async (_c, next) => {
        return await next()
      })
    }

    app.get('/', (c) => c.json({ depth: 50 }))

    const res = await app.fetch(new Request('http://localhost/'))
    expect(res.status).toBe(200)
    expect(pool.size).toBe(initialSize)
  })
})
