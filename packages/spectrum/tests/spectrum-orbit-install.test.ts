import { describe, expect, mock, test } from 'bun:test'
import { MemoryStorage } from '../src/storage/MemoryStorage'

const queryListeners: Array<(query: any) => void> = []

const { SpectrumOrbit } = await import('../src/SpectrumOrbit')

function createCore() {
  const routes: Record<string, any> = {}

  const adapter = {
    use: mock((path: string, handler: any) => {
      routes[`use:${path}`] = handler
    }),
    fetch: mock(async () => new Response('ok', { status: 200, statusText: 'OK' })),
  }

  const router = {
    get: mock((path: string, handler: any) => {
      routes[`get:${path}`] = handler
    }),
    post: mock((path: string, handler: any) => {
      routes[`post:${path}`] = handler
    }),
  }

  const logger = {
    info: mock(() => {}),
    debug: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
  }

  return { routes, adapter, router, logger }
}

describe('SpectrumOrbit install flow', () => {
  test('installs and captures requests, logs, and queries', async () => {
    const storage = new MemoryStorage()
    const core = createCore()

    const orbit = new SpectrumOrbit(
      { storage, sampleRate: 1 },
      { atlas: { Connection: { queryListeners } } }
    )
    await orbit.install(core as any)

    const middleware = core.routes['use:*']
    expect(middleware).toBeTypeOf('function')

    const ctx = {
      req: {
        path: '/hello',
        method: 'GET',
        url: 'http://localhost/hello',
        header: (key: string) => (key === 'x-forwarded-for' ? '1.2.3.4' : undefined),
        raw: { headers: new Headers({ 'x-test': '1' }) },
      },
    } as any

    await middleware(ctx, async () => new Response('ok', { status: 200 }))
    expect((await storage.getRequests()).length).toBe(1)

    core.logger.info('hello')
    core.logger.debug('dbg')
    core.logger.warn('warn')
    core.logger.error('err')
    expect((await storage.getLogs()).length).toBe(6)

    await new Promise((resolve) => setTimeout(resolve, 0))
    queryListeners[0]?.({ sql: 'select 1' })
    expect((await storage.getQueries()).length).toBe(1)
  })

  test('registers routes and replays requests', async () => {
    const storage = new MemoryStorage()
    await storage.storeRequest({
      id: 'req-1',
      method: 'GET',
      url: 'http://localhost/replay',
      requestHeaders: {},
    } as any)

    const core = createCore()
    const orbit = new SpectrumOrbit({ storage, gate: async () => true })

    ;(orbit as any).registerRoutes(core as any)

    const getRequests = core.routes['get:/gravito/spectrum/api/requests']
    const response = await getRequests({ json: (data: any) => data })
    expect(response.length).toBe(1)

    const getLogs = core.routes['get:/gravito/spectrum/api/logs']
    const logsRes = await getLogs({ json: (data: any) => data })
    expect(Array.isArray(logsRes)).toBe(true)

    const getQueries = core.routes['get:/gravito/spectrum/api/queries']
    const queriesRes = await getQueries({ json: (data: any) => data })
    expect(Array.isArray(queriesRes)).toBe(true)

    const events = core.routes['get:/gravito/spectrum/api/events']
    const originalTransformStream = global.TransformStream
    const originalSetInterval = global.setInterval
    const originalClearInterval = global.clearInterval

    global.TransformStream = class {
      readable = new ReadableStream()
      writable = {
        getWriter: () => ({
          write: () => {
            throw new Error('write failed')
          },
        }),
      }
    } as any

    let heartbeatFn: (() => void) | null = null
    global.setInterval = ((fn: () => void) => {
      heartbeatFn = fn
      return 1 as any
    }) as any

    global.clearInterval = (() => {}) as any

    try {
      const eventRes = await events({})
      expect(eventRes.headers.get('Content-Type')).toBe('text/event-stream')

      const listeners = (orbit as any).listeners as Set<(payload: string) => void>
      const listener = Array.from(listeners)[0]
      listener?.('payload')
      heartbeatFn?.()
    } finally {
      global.TransformStream = originalTransformStream
      global.setInterval = originalSetInterval
      global.clearInterval = originalClearInterval
    }

    const replay = core.routes['post:/gravito/spectrum/api/replay/:id']
    const jsonReplay = mock((data: any, status?: number) => ({ data, status }))
    await replay({
      req: { param: () => 'req-1' },
      json: jsonReplay,
    })
    expect(jsonReplay).toHaveBeenCalledWith(expect.objectContaining({ success: true }))

    const jsonMissing = mock((data: any, status?: number) => ({ data, status }))
    await replay({
      req: { param: () => null },
      json: jsonMissing,
    })
    expect(jsonMissing).toHaveBeenCalledWith(expect.objectContaining({ error: 'ID required' }), 400)

    const jsonNotFound = mock((data: any, status?: number) => ({ data, status }))
    await replay({
      req: { param: () => 'missing' },
      json: jsonNotFound,
    })
    expect(jsonNotFound).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Request not found' }),
      404
    )

    const clear = core.routes['post:/gravito/spectrum/api/clear']
    const clearRes = await clear({ json: (data: any) => data })
    expect(clearRes.success).toBe(true)

    const ui = core.routes['get:/gravito/spectrum']
    const uiRes = await ui({ html: (body: string) => body })
    expect(uiRes).toContain('<title>Spectrum Dashboard</title>')
  })

  test('blocks access in production without gate', async () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const storage = new MemoryStorage()
    const core = createCore()
    const orbit = new SpectrumOrbit({ storage })

    ;(orbit as any).registerRoutes(core as any)

    const handler = core.routes['get:/gravito/spectrum/api/logs']
    const res = await handler({ json: (data: any, status?: number) => ({ data, status }) })
    expect(res.status).toBe(403)

    process.env.NODE_ENV = originalEnv
  })
})
