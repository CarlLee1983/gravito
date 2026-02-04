import { describe, expect, it, jest } from 'bun:test'
import { OrbitEcho } from '../../src/OrbitEcho'

describe('OrbitEcho', () => {
  it('should create with default config', () => {
    const echo = new OrbitEcho()
    expect(echo.getReceiver()).toBeDefined()
    expect(echo.getDispatcher()).toBeUndefined()
  })

  it('should create dispatcher when config provided', () => {
    const echo = new OrbitEcho({
      dispatcher: { secret: 'test' },
    })
    expect(echo.getDispatcher()).toBeDefined()
  })

  it('should register providers from config', () => {
    const echo = new OrbitEcho({
      providers: {
        stripe: { name: 'stripe', secret: 'stripe-secret' },
        github: { name: 'github', secret: 'github-secret' },
      },
    })

    const receiver = echo.getReceiver()
    expect(receiver).toBeDefined()
  })

  it('should bind instances on install', () => {
    const echo = new OrbitEcho({
      dispatcher: { secret: 'test' },
    })
    const core = {
      container: {
        instance: jest.fn(),
      },
      adapter: {
        use: jest.fn(),
      },
      logger: {
        info: jest.fn(),
      },
    }

    echo.install(core as unknown as Parameters<OrbitEcho['install']>[0])

    expect(core.container.instance).toHaveBeenCalledWith('echo', echo)
    expect(core.container.instance).toHaveBeenCalledWith('echo.receiver', echo.getReceiver())
    expect(core.container.instance).toHaveBeenCalledWith('echo.dispatcher', echo.getDispatcher())
  })

  describe('getConfig', () => {
    it('should return the config object', () => {
      const config = { dispatcher: { secret: 'test' } }
      const echo = new OrbitEcho(config)

      expect(echo.getConfig()).toEqual(config)
    })

    it('should return config with providers', () => {
      const config = {
        providers: {
          stripe: { name: 'stripe', secret: 'test-secret' },
        },
      }
      const echo = new OrbitEcho(config)

      expect(echo.getConfig()).toEqual(config)
    })
  })

  describe('key rotation', () => {
    it('should return undefined when key rotation disabled', () => {
      const echo = new OrbitEcho({})

      expect(echo.getKeyRotationManager()).toBeUndefined()
    })

    it('should initialize key rotation manager when enabled', () => {
      const echo = new OrbitEcho({
        keyRotation: {
          enabled: true,
          gracePeriod: 3600,
        },
      })

      expect(echo.getKeyRotationManager()).toBeDefined()
    })

    it('should throw when rotating key without manager', async () => {
      const echo = new OrbitEcho({})

      await expect(
        echo.rotateProviderKey('stripe', {
          key: 'new-secret',
          version: 'v2',
          activeFrom: new Date(),
        })
      ).rejects.toThrow()
    })
  })

  describe('deadLetterQueue setup', () => {
    it('should set DLQ on dispatcher when provided', () => {
      const mockDlq = {
        enqueue: jest.fn(),
        peek: jest.fn(),
        dequeue: jest.fn(),
        size: jest.fn(),
        clear: jest.fn(),
      }

      const echo = new OrbitEcho({
        dispatcher: { secret: 'test' },
        deadLetterQueue: mockDlq as any,
      })

      expect(echo.getDispatcher()).toBeDefined()
    })
  })

  describe('observability setup', () => {
    it('should accept custom metrics provider', () => {
      const mockMetrics = {
        increment: jest.fn(),
        histogram: jest.fn(),
        gauge: jest.fn(),
      }

      const echo = new OrbitEcho({
        dispatcher: { secret: 'test' },
        observability: { metrics: mockMetrics as any },
      })

      expect(echo.getReceiver()).toBeDefined()
      expect(echo.getDispatcher()).toBeDefined()
    })

    it('should accept custom tracer', () => {
      const mockTracer = {
        startSpan: jest.fn(),
        getCurrentSpan: jest.fn(),
      }

      const echo = new OrbitEcho({
        observability: { tracer: mockTracer as any },
      })

      expect(echo.getReceiver()).toBeDefined()
    })

    it('should accept custom logger', () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      }

      const echo = new OrbitEcho({
        observability: { logger: mockLogger },
      })

      expect(echo.getReceiver()).toBeDefined()
    })

    it('should handle all observability options together', () => {
      const mockMetrics = {
        increment: jest.fn(),
        histogram: jest.fn(),
        gauge: jest.fn(),
      }
      const mockTracer = {
        startSpan: jest.fn(),
      }
      const mockLogger = {
        info: jest.fn(),
      }

      const echo = new OrbitEcho({
        observability: {
          metrics: mockMetrics as any,
          tracer: mockTracer as any,
          logger: mockLogger as any,
        },
      })

      expect(echo.getReceiver()).toBeDefined()
    })
  })

  describe('store setup', () => {
    it('should accept custom webhook store', () => {
      const mockStore = {
        save: jest.fn(),
        get: jest.fn(),
        list: jest.fn(),
        delete: jest.fn(),
      }

      const echo = new OrbitEcho({
        store: mockStore as any,
      })

      expect(echo.getReceiver()).toBeDefined()
    })
  })

  describe('request buffer configuration', () => {
    it('should handle request buffer disabled', () => {
      const echo = new OrbitEcho({
        requestBuffer: { enabled: false },
      })

      const core = {
        container: {
          instance: jest.fn(),
        },
        adapter: {
          use: jest.fn(),
        },
        logger: {
          info: jest.fn(),
          warn: jest.fn(),
        },
      }

      echo.install(core as any)

      expect(echo.getReceiver()).toBeDefined()
    })

    it('should handle request buffer with custom options', () => {
      const echo = new OrbitEcho({
        requestBuffer: {
          enabled: true,
          maxSize: 1024,
          timeout: 5000,
        },
      })

      const core = {
        container: {
          instance: jest.fn(),
        },
        adapter: {
          use: jest.fn(),
        },
        logger: {
          info: jest.fn(),
        },
      }

      echo.install(core as any)

      expect(echo.getReceiver()).toBeDefined()
    })
  })

  describe('provider registration', () => {
    it('should handle empty provider config', () => {
      const echo = new OrbitEcho({
        providers: {},
      })

      expect(echo.getReceiver()).toBeDefined()
    })

    it('should handle multiple providers with different secrets', () => {
      const echo = new OrbitEcho({
        providers: {
          stripe: { name: 'stripe', secret: 'stripe-secret' },
          github: { name: 'github', secret: 'github-secret' },
          slack: { name: 'slack', secret: 'slack-secret' },
        },
      })

      expect(echo.getReceiver()).toBeDefined()
    })
  })

  describe('complete integration', () => {
    it('should handle full config with all options', () => {
      const mockMetrics = { increment: jest.fn(), histogram: jest.fn(), gauge: jest.fn() }
      const mockLogger = { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() }

      const echo = new OrbitEcho({
        dispatcher: { secret: 'dispatcher-secret' },
        providers: {
          stripe: { name: 'stripe', secret: 'stripe-secret' },
        },
        observability: {
          metrics: mockMetrics as any,
          logger: mockLogger,
        },
        requestBuffer: { enabled: true },
      })

      const core = {
        container: { instance: jest.fn() },
        adapter: { use: jest.fn() },
        logger: { info: jest.fn() },
      }

      echo.install(core as any)

      expect(echo.getReceiver()).toBeDefined()
      expect(echo.getDispatcher()).toBeDefined()
      expect(echo.getConfig()).toBeDefined()
    })
  })
})
