import { bench, group, run } from 'mitata'
import { PhotonContextWrapper } from '../src/adapters/PhotonAdapter'
import { FastContext } from '../src/engine/FastContext'
import { MinimalContext } from '../src/engine/MinimalContext'
import { ObjectPool } from '../src/engine/pool'

// ═══════════════════════════════════════════════════════════════════
// 1. Context Creation Benchmark
// ═══════════════════════════════════════════════════════════════════

group('Context Creation', () => {
  const mockRequest = new Request('http://localhost:3000/api/users?id=123')

  // FastContext Pool
  const fastPool = new ObjectPool(
    () => new FastContext(),
    (ctx) => ctx.reset(),
    256
  )

  bench('FastContext (pooled)', () => {
    const ctx = fastPool.acquire()
    ctx.init(mockRequest, {}, '/api/users?id=123')
    fastPool.release(ctx)
  })

  bench('FastContext (new / unpooled)', () => {
    const ctx = new FastContext()
    ctx.init(mockRequest, {}, '/api/users?id=123')
  })

  bench('MinimalContext (new)', () => {
    const ctx = new MinimalContext(mockRequest, {}, '/api/users')
    return ctx.req.url
  })

  // Mock Photon Context for Proxy test
  const mockPhotonCtx = {
    req: {
      url: 'http://localhost:3000/api/users?id=123',
      method: 'GET',
      path: '/api/users',
      param: () => ({}),
      query: () => ({ id: '123' }),
      queries: () => ({ id: ['123'] }),
      header: () => ({}),
      raw: mockRequest,
    },
    json: (d: any) => new Response(JSON.stringify(d)),
    text: (t: string) => new Response(t),
    get: (k: string) => undefined,
    set: (k: string, v: any) => {},
    header: () => {},
    status: () => {},
    executionCtx: undefined,
    env: {},
  } as any

  bench('PhotonContextWrapper.create() [with Proxy]', () => {
    PhotonContextWrapper.create(mockPhotonCtx)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 2. Proxy Overhead Benchmark
// ═══════════════════════════════════════════════════════════════════

group('Proxy Overhead', () => {
  const target = { value: 42, method: () => 'result' }
  const proxied = new Proxy(target, {
    get(t, p) {
      return Reflect.get(t, p)
    },
  })

  bench('Direct property access', () => {
    return target.value
  })

  bench('Proxy property access', () => {
    return proxied.value
  })

  bench('Direct method call', () => {
    return target.method()
  })

  bench('Proxy method call', () => {
    return proxied.method()
  })
})

// ═══════════════════════════════════════════════════════════════════
// 3. Middleware Execution Benchmark
// ═══════════════════════════════════════════════════════════════════

group('Middleware Execution', () => {
  const mockCtx = {} as any
  const mockHandler = async () => new Response('ok')

  // Current implementation: runtime closure creation
  const executeCurrentMiddleware = async (middleware: any[], handler: any) => {
    let index = 0
    const next = async () => {
      if (index < middleware.length) {
        return await middleware[index++](mockCtx, next)
      }
      return undefined
    }
    const result = await next()
    return result ?? (await handler(mockCtx))
  }

  // Precompiled version (mock for baseline)
  const compileMiddlewareChain = (middleware: any[], handler: any) => {
    // This is what we WANT to achieve in Phase 1
    // A chain of pre-bound functions
    let current = handler
    for (let i = middleware.length - 1; i >= 0; i--) {
      const m = middleware[i]
      const next = current
      current = (c: any) => m(c, next)
    }
    return current
  }

  const middleware3 = [
    async (_c: any, next: any) => {
      await next()
    },
    async (_c: any, next: any) => {
      await next()
    },
    async (_c: any, next: any) => {
      await next()
    },
  ]

  const compiled3 = compileMiddlewareChain(middleware3, mockHandler)

  bench('3 middleware (current/dynamic)', async () => {
    await executeCurrentMiddleware(middleware3, mockHandler)
  })

  bench('3 middleware (precompiled)', async () => {
    await compiled3(mockCtx)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 4. Headers Management Benchmark
// ═══════════════════════════════════════════════════════════════════

group('Headers Management', () => {
  bench('new Headers()', () => {
    return new Headers()
  })

  const reusableHeaders = new Headers()
  const trackedKeys: string[] = []

  bench('Headers reuse + delete (2 keys)', () => {
    reusableHeaders.set('Content-Type', 'application/json')
    reusableHeaders.set('X-Request-ID', '123')
    trackedKeys.push('Content-Type', 'X-Request-ID')

    for (const key of trackedKeys) {
      reusableHeaders.delete(key)
    }
    trackedKeys.length = 0
  })
})

// ═══════════════════════════════════════════════════════════════════
// 5. URL Parsing Benchmark
// ═══════════════════════════════════════════════════════════════════

group('URL Parsing', () => {
  const url = 'http://localhost:3000/api/users/123?sort=name&limit=10'

  bench('new URL()', () => {
    return new URL(url).pathname
  })

  bench('extractPath() [optimized]', () => {
    const protocolEnd = url.indexOf('://')
    const searchStart = protocolEnd === -1 ? 0 : protocolEnd + 3
    const pathStart = url.indexOf('/', searchStart)
    if (pathStart === -1) return '/'
    const queryStart = url.indexOf('?', pathStart)
    return queryStart === -1 ? url.slice(pathStart) : url.slice(pathStart, queryStart)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 6. Map Lookup Benchmark (Symbol vs String)
// ═══════════════════════════════════════════════════════════════════

group('Map Lookup', () => {
  const stringMap = new Map<string, number>()
  const symbolMap = new Map<symbol, number>()
  const key = 'UserService'
  const symKey = Symbol('UserService')

  stringMap.set(key, 42)
  symbolMap.set(symKey, 42)

  bench('Map.get(string)', () => {
    return stringMap.get(key)
  })

  bench('Map.get(symbol)', () => {
    return symbolMap.get(symKey)
  })
})

await run()
