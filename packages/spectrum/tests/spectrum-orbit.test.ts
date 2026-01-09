import { describe, expect, mock, test } from 'bun:test'
import { SpectrumOrbit } from '../src/SpectrumOrbit'

function createCore() {
  const routes: Record<string, any> = {}
  return {
    routes,
    adapter: {
      use: mock((path: string, handler: any) => {
        routes[`use:${path}`] = handler
      }),
      fetch: mock(async () => new Response('ok')),
    },
    router: {
      get: mock((path: string, handler: any) => {
        routes[`get:${path}`] = handler
      }),
      post: mock((path: string, handler: any) => {
        routes[`post:${path}`] = handler
      }),
    },
    logger: {
      info: mock(() => {}),
      debug: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
    },
  }
}

describe('SpectrumOrbit', () => {
  test('shouldCapture respects sampleRate', () => {
    const orbit = new SpectrumOrbit({ sampleRate: 1 })
    expect((orbit as any).shouldCapture()).toBe(true)

    const originalRandom = Math.random
    Math.random = () => 0.9

    const lowOrbit = new SpectrumOrbit({ sampleRate: 0.1 })
    try {
      expect((lowOrbit as any).shouldCapture()).toBe(false)
    } finally {
      Math.random = originalRandom
    }
  })

  test('broadcast notifies listeners', () => {
    const orbit = new SpectrumOrbit()
    const listener = mock(() => {})
    ;(orbit as any).listeners.add(listener)

    ;(orbit as any).broadcast('log', { message: 'hello' })
    expect(listener).toHaveBeenCalled()
  })

  test('setupHttpCollection skips spectrum path and captures requests', async () => {
    const storage = {
      init: async () => {},
      storeRequest: mock(async () => {}),
      storeLog: mock(async () => {}),
      storeQuery: mock(async () => {}),
      getRequests: async () => [],
      getLogs: async () => [],
      getQueries: async () => [],
      clear: async () => {},
      getRequest: async () => null,
    }

    const orbit = new SpectrumOrbit({ storage })
    const core = createCore()

    ;(orbit as any).setupHttpCollection(core as any)

    const middleware = core.routes['use:*']
    expect(middleware).toBeTypeOf('function')

    const skipCtx = {
      req: {
        path: '/gravito/spectrum/api/requests',
      },
    } as any

    const next = mock(async () => new Response('ok'))
    await middleware(skipCtx, next)
    expect(storage.storeRequest).not.toHaveBeenCalled()

    const ctx = {
      req: {
        path: '/hello',
        method: 'GET',
        url: 'http://localhost/hello',
        header: (key: string) => (key === 'x-forwarded-for' ? '1.2.3.4' : undefined),
        raw: { headers: new Headers({ 'x-test': '1' }) },
      },
    } as any

    await middleware(ctx, async () => new Response('ok', { status: 201 }))
    expect(storage.storeRequest).toHaveBeenCalled()
  })

  test('registerRoutes honors gate', async () => {
    const storage = {
      init: async () => {},
      storeRequest: async () => {},
      storeLog: async () => {},
      storeQuery: async () => {},
      getRequests: async () => [{ id: 'r1' }],
      getLogs: async () => [{ id: 'l1' }],
      getQueries: async () => [{ id: 'q1' }],
      clear: async () => {},
      getRequest: async () => null,
    }

    const orbit = new SpectrumOrbit({ storage, gate: async () => true })
    const core = createCore()

    ;(orbit as any).registerRoutes(core as any)

    const handler = core.routes['get:/gravito/spectrum/api/requests']
    const ctx = {
      json: (data: any, status?: number) => ({ data, status }),
    }

    const res = await handler(ctx)
    expect(res.data).toEqual([{ id: 'r1' }])
  })

  test('registerRoutes blocks when gate rejects', async () => {
    const storage = {
      init: async () => {},
      storeRequest: async () => {},
      storeLog: async () => {},
      storeQuery: async () => {},
      getRequests: async () => [],
      getLogs: async () => [],
      getQueries: async () => [],
      clear: async () => {},
      getRequest: async () => null,
    }

    const orbit = new SpectrumOrbit({ storage, gate: async () => false })
    const core = createCore()

    ;(orbit as any).registerRoutes(core as any)

    const handler = core.routes['get:/gravito/spectrum/api/logs']
    const ctx = {
      json: (data: any, status?: number) => ({ data, status }),
    }

    const res = await handler(ctx)
    expect(res.status).toBe(403)
  })
})
