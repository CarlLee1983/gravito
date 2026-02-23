/**
 * BunNativeAdapter 性能基準測試
 *
 * 驗證 P2 優化（路由快取、中間件預編譯）的效能提升
 * 運行方式：bun test ./packages/core/tests/adapters-bun-performance.bench.ts
 */

import { describe, it } from 'bun:test'
import { BunNativeAdapter } from '../src/adapters/bun/BunNativeAdapter'

// 性能測試工具
async function benchmark(name: string, fn: () => Promise<void>, iterations = 10000) {
  const start = performance.now()

  for (let i = 0; i < iterations; i++) {
    await fn()
  }

  const duration = performance.now() - start
  const avgTime = duration / iterations
  console.log(
    `✓ ${name}: ${avgTime.toFixed(4)}ms avg (total: ${duration.toFixed(0)}ms, iterations: ${iterations})`
  )
  return avgTime
}

describe('BunNativeAdapter Performance Benchmarks', () => {
  it('Static route without cache warming', async () => {
    const adapter = new BunNativeAdapter()
    adapter.route('GET', '/health', (ctx) => ctx.json({ ok: true }))

    await benchmark('Static route (cold)', async () => {
      const req = new Request('http://localhost/health')
      await adapter.fetch(req)
    })
  })

  it('Static route with cache warming (route cache)', async () => {
    const adapter = new BunNativeAdapter()
    adapter.route('GET', '/health', (ctx) => ctx.json({ ok: true }))

    // Warm up the route cache
    const warmupReq = new Request('http://localhost/health')
    await adapter.fetch(warmupReq)

    await benchmark('Static route (cached)', async () => {
      const req = new Request('http://localhost/health')
      await adapter.fetch(req)
    })
  })

  it('Parameterized route (high cardinality)', async () => {
    const adapter = new BunNativeAdapter()
    adapter.route('GET', '/users/:id', (ctx) => {
      return ctx.json({ id: ctx.req.param('id') })
    })

    let counter = 0
    await benchmark(
      'Parameterized route (100 unique)',
      async () => {
        const id = (counter++ % 100).toString()
        const req = new Request(`http://localhost/users/${id}`)
        await adapter.fetch(req)
      },
      10000
    )
  })

  it('Parameterized route with cache (repeated paths)', async () => {
    const adapter = new BunNativeAdapter()
    adapter.route('GET', '/users/:id', (ctx) => {
      return ctx.json({ id: ctx.req.param('id') })
    })

    // Use same ID repeatedly to leverage cache
    await benchmark(
      'Parameterized route (cached)',
      async () => {
        const req = new Request('http://localhost/users/42')
        await adapter.fetch(req)
      },
      10000
    )
  })

  it('Middleware execution (5 middlewares)', async () => {
    const adapter = new BunNativeAdapter()

    for (let i = 0; i < 5; i++) {
      adapter.use('*', async (ctx, next) => {
        ctx.set(`x-mw-${i}` as any, 'ok')
        await next()
      })
    }

    adapter.route('GET', '/test', (ctx) => ctx.json({ ok: true }))

    await benchmark(
      '5 middlewares (global)',
      async () => {
        const req = new Request('http://localhost/test')
        await adapter.fetch(req)
      },
      5000
    )
  })

  it('Path-specific middleware with cache', async () => {
    const adapter = new BunNativeAdapter()

    adapter.use('/api/*', async (ctx, next) => {
      ctx.set('x-api' as any, 'true')
      await next()
    })

    adapter.route('GET', '/api/test', (ctx) => ctx.json({ ok: true }))

    // Warm up
    await adapter.fetch(new Request('http://localhost/api/test'))

    await benchmark(
      'Path-specific middleware (cached)',
      async () => {
        const req = new Request('http://localhost/api/test')
        await adapter.fetch(req)
      },
      5000
    )
  })

  it('Mixed routes and middleware', async () => {
    const adapter = new BunNativeAdapter()

    // Multiple middlewares
    adapter.use('*', async (ctx, next) => {
      ctx.set('x-trace' as any, 'start')
      await next()
    })

    adapter.use('/api/*', async (ctx, next) => {
      ctx.set('x-api' as any, 'true')
      await next()
    })

    // Multiple routes
    adapter.route('GET', '/', (ctx) => ctx.json({ home: true }))
    adapter.route('GET', '/health', (ctx) => ctx.json({ ok: true }))
    adapter.route('GET', '/api/users', (ctx) => ctx.json({ users: [] }))
    adapter.route('GET', '/api/users/:id', (ctx) => ctx.json({ id: ctx.req.param('id') }))

    let iteration = 0
    await benchmark(
      'Mixed (5 unique routes + 2 middlewares)',
      async () => {
        const paths = ['/', '/health', '/api/users', '/api/users/42', '/api/users/99']
        const path = paths[iteration % paths.length]
        iteration++
        const req = new Request(`http://localhost${path}`)
        await adapter.fetch(req)
      },
      10000
    )
  })

  it('Stress test: 10,000 requests', async () => {
    const adapter = new BunNativeAdapter()

    adapter.route('GET', '/health', (ctx) => ctx.json({ ok: true }))
    adapter.route('GET', '/users/:id', (ctx) => ctx.json({ id: ctx.req.param('id') }))

    const start = performance.now()
    let completed = 0

    for (let i = 0; i < 10000; i++) {
      const path = i % 2 === 0 ? '/health' : `/users/${i % 100}`
      const req = new Request(`http://localhost${path}`)
      await adapter.fetch(req)
      completed++
    }

    const duration = performance.now() - start
    const avgTime = duration / completed
    const throughput = (1000 / avgTime).toFixed(0) // req/sec

    console.log(
      `✓ Stress test: ${completed} requests in ${duration.toFixed(0)}ms, avg ${avgTime.toFixed(4)}ms, throughput ~${throughput} req/sec`
    )
  })
})
