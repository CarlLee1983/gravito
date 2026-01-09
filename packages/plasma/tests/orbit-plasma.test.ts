import { describe, expect, it, mock } from 'bun:test'

const redisModule = new URL('../src/Redis.ts', import.meta.url).pathname

describe('OrbitPlasma', async () => {
  const client = {
    connected: false,
    isConnected: () => client.connected,
    connect: mock(async () => {
      client.connected = true
    }),
    disconnect: mock(async () => {
      client.connected = false
    }),
  }

  let lastConfig: unknown
  const Redis = {
    configure: mock((config: unknown) => {
      lastConfig = config
    }),
    connection: mock(() => client),
    connect: mock(async () => {
      client.connected = true
    }),
  }

  mock.module(redisModule, () => ({ Redis }))

  const { OrbitPlasma } = await import('../src/OrbitPlasma')

  const createCore = (config: unknown) => {
    let middleware: ((c: any, next: () => Promise<void>) => Promise<undefined | undefined>) | null =
      null
    let shutdownHandler: (() => Promise<void>) | null = null

    const core = {
      config: { get: () => config },
      logger: {
        warn: mock(() => {}),
        info: mock(() => {}),
        error: mock(() => {}),
      },
      adapter: {
        use: mock((_path: string, handler: typeof middleware) => {
          middleware = handler
        }),
      },
      hooks: {
        doAction: mock((_hook: string, handler?: () => Promise<void>) => {
          if (handler) {
            shutdownHandler = handler
          }
        }),
      },
      get middleware() {
        return middleware
      },
      get shutdownHandler() {
        return shutdownHandler
      },
    }

    return core
  }

  it('skips install when config is missing', () => {
    const core = createCore(null)
    const orbit = new OrbitPlasma()

    orbit.install(core as any)

    expect(core.logger.warn).toHaveBeenCalled()
    expect(core.adapter.use).not.toHaveBeenCalled()
  })

  it('creates a configured instance via static helper', () => {
    const orbit = OrbitPlasma.configure({ exposeAs: 'cache' })
    expect(orbit).toBeInstanceOf(OrbitPlasma)
  })

  it('wraps simple config into default connection', async () => {
    const core = createCore({ host: 'localhost', port: 6379 })
    const orbit = new OrbitPlasma()

    orbit.install(core as any)

    expect(Redis.configure).toHaveBeenCalled()
    expect(lastConfig).toMatchObject({
      default: 'default',
      connections: {
        default: { host: 'localhost', port: 6379 },
      },
    })

    expect(Redis.connection).toHaveBeenCalled()

    const ctx: Record<string, unknown> = {
      set: (key: string, value: unknown) => {
        ctx[key] = value
      },
    }

    await core.middleware?.(ctx, async () => {})

    expect(ctx.redis).toBe(client)
    expect(client.connect).toHaveBeenCalled()
    expect(orbit.isConnected()).toBe(true)
  })

  it('respects manager config and auto-connect', async () => {
    const core = createCore({
      default: 'main',
      connections: { main: { host: 'redis' } },
    })
    const orbit = new OrbitPlasma({ autoConnect: true })

    Redis.connect = mock(async () => {
      throw new Error('auto-connect failed')
    })

    orbit.install(core as any)

    expect(Redis.configure).toHaveBeenCalledWith({
      default: 'main',
      connections: { main: { host: 'redis' } },
    })
    expect(Redis.connect).toHaveBeenCalled()

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(core.logger.error).toHaveBeenCalledWith(
      '[OrbitPlasma] Failed to auto-connect:',
      expect.any(Error)
    )

    await core.shutdownHandler?.()
    expect(client.disconnect).toHaveBeenCalled()
  })
})
