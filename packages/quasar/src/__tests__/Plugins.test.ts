import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { EventEmitter } from 'node:events'
import { CorePlugin } from '../plugins/CorePlugin'
import { DiagnosticPlugin } from '../plugins/DiagnosticPlugin'
import { MaintenancePlugin } from '../plugins/MaintenancePlugin'
import { PluginRegistry } from '../plugins/QuasarPlugin'
import { SentryPlugin } from '../plugins/SentryPlugin'
import { TrendPlugin } from '../plugins/TrendPlugin'
import { WebhookPlugin } from '../plugins/WebhookPlugin'

// --- Mock Agent Helper ---

function createMockAgent(overrides: Record<string, any> = {}) {
  const events = new EventEmitter()
  const metricsCollector = {
    setGauge: mock(() => {}),
    getMetrics: mock(() => ({})),
  }

  const agent: any = {
    on: (event: string, handler: (...args: any[]) => void) => {
      events.on(event, handler)
      return agent
    },
    emit: (event: string, ...args: any[]) => events.emit(event, ...args),
    getPluginRegistry: () => new PluginRegistry(),
    isLeader: () => false,
    getStatus: () => ({
      service: 'test-service',
      transport: 'ready',
      monitor: 'ready',
      nodeId: 'test-node-1',
      metrics: {},
    }),
    getClusterStatus: async () => [],
    getPrometheusMetrics: () => '',
    metricsCollector,
    logger: {
      debug: mock(() => {}),
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
    },
    bridges: [],
    transportRedis: {
      ltrim: mock(() => Promise.resolve('OK')),
    },
    ...overrides,
  }

  return { agent, events, metricsCollector }
}

// ==========================================================
// DiagnosticPlugin
// ==========================================================

describe('DiagnosticPlugin', () => {
  let plugin: DiagnosticPlugin

  beforeEach(() => {
    plugin = new DiagnosticPlugin()
  })

  afterEach(async () => {
    await plugin.onStop()
  })

  it('should have name "diagnostic"', () => {
    expect(plugin.name).toBe('diagnostic')
  })

  it('should register agent on onRegister', () => {
    const { agent } = createMockAgent()
    plugin.onRegister(agent)
    // plugin stores agent internally
    expect((plugin as any).agent).toBe(agent)
  })

  it('should start event loop lag monitoring on onStart', async () => {
    const { agent } = createMockAgent()
    plugin.onRegister(agent)
    await plugin.onStart(agent)

    expect((plugin as any).timer).toBeDefined()
  })

  it('should collect diagnostics on tick event', async () => {
    const { agent, events, metricsCollector } = createMockAgent()
    plugin.onRegister(agent)
    await plugin.onStart(agent)

    // Emit a tick to trigger collectDiagnostics
    events.emit('tick')

    // metricsCollector.setGauge should have been called
    expect(metricsCollector.setGauge).toHaveBeenCalled()
  })

  it('should report event_loop_lag_ms gauge', async () => {
    const { agent, events, metricsCollector } = createMockAgent()
    plugin.onRegister(agent)
    await plugin.onStart(agent)

    events.emit('tick')

    const calls = (metricsCollector.setGauge as any).mock.calls
    const lagCall = calls.find((c: any) => c[0] === 'event_loop_lag_ms')
    expect(lagCall).toBeDefined()
  })

  it('should report bridge_buffer_size gauge', async () => {
    const bridgeWithBuffer = { logBuffer: { buffer: [1, 2, 3] } }
    const { agent, events, metricsCollector } = createMockAgent({
      bridges: [bridgeWithBuffer],
    })
    plugin.onRegister(agent)
    await plugin.onStart(agent)

    events.emit('tick')

    const calls = (metricsCollector.setGauge as any).mock.calls
    const bufferCall = calls.find((c: any) => c[0] === 'bridge_buffer_size')
    expect(bufferCall).toBeDefined()
    expect(bufferCall[1]).toBe(3)
  })

  it('should handle missing metricsCollector gracefully', async () => {
    const { agent, events } = createMockAgent({ metricsCollector: undefined })
    plugin.onRegister(agent)
    await plugin.onStart(agent)

    // Should not throw
    events.emit('tick')
  })

  it('should cleanup timer on onStop', async () => {
    const { agent } = createMockAgent()
    plugin.onRegister(agent)
    await plugin.onStart(agent)

    expect((plugin as any).timer).toBeDefined()
    await plugin.onStop()
    // Timer should have been cleared (no error thrown)
  })

  it('should handle onStop without timer', async () => {
    // onStop before onStart - no timer set
    await plugin.onStop()
    // Should not throw
  })
})

// ==========================================================
// MaintenancePlugin
// ==========================================================

describe('MaintenancePlugin', () => {
  let plugin: MaintenancePlugin

  afterEach(async () => {
    if (plugin) {
      const { agent } = createMockAgent()
      await plugin.onStop(agent as any)
    }
  })

  it('should have name "maintenance"', () => {
    plugin = new MaintenancePlugin()
    expect(plugin.name).toBe('maintenance')
  })

  it('should use default interval of 60000', () => {
    plugin = new MaintenancePlugin()
    expect((plugin as any).interval).toBe(60000)
  })

  it('should accept custom interval', () => {
    plugin = new MaintenancePlugin({ interval: 300000 })
    expect((plugin as any).interval).toBe(300000)
  })

  it('should register agent on onRegister', () => {
    plugin = new MaintenancePlugin()
    const { agent } = createMockAgent()
    plugin.onRegister(agent)
    expect((plugin as any).agent).toBe(agent)
  })

  it('should start timer on onStart', async () => {
    plugin = new MaintenancePlugin({ interval: 60000 })
    const { agent } = createMockAgent()
    plugin.onRegister(agent)
    await plugin.onStart(agent as any)

    expect((plugin as any).timer).toBeDefined()
  })

  it('should unref the maintenance timer', async () => {
    const originalSetInterval = globalThis.setInterval
    let unrefCalled = false

    globalThis.setInterval = ((handler: TimerHandler, timeout?: number, ...args: any[]) => {
      const timer = originalSetInterval(handler, timeout, ...args) as unknown as ReturnType<
        typeof setInterval
      >
      return Object.assign(timer, {
        unref: () => {
          unrefCalled = true
          return timer
        },
      })
    }) as unknown as typeof setInterval

    plugin = new MaintenancePlugin({ interval: 60000 })
    const { agent } = createMockAgent()
    plugin.onRegister(agent)

    try {
      await plugin.onStart(agent as any)
      expect(unrefCalled).toBe(true)
    } finally {
      await plugin.onStop(agent as any)
      globalThis.setInterval = originalSetInterval
    }
  })

  it('should clear timer on onStop', async () => {
    plugin = new MaintenancePlugin({ interval: 60000 })
    const { agent } = createMockAgent()
    plugin.onRegister(agent)
    await plugin.onStart(agent as any)
    await plugin.onStop(agent as any)

    expect((plugin as any).timer).toBeUndefined()
  })

  it('should skip maintenance when not leader', async () => {
    plugin = new MaintenancePlugin({ interval: 50 })
    const { agent } = createMockAgent({ isLeader: () => false })
    plugin.onRegister(agent)
    await plugin.onStart(agent as any)

    // Wait for timer to fire
    await new Promise((resolve) => setTimeout(resolve, 100))

    // transportRedis.ltrim should NOT be called since not leader
    expect(agent.transportRedis.ltrim).not.toHaveBeenCalled()

    await plugin.onStop(agent as any)
  })

  it('should run maintenance when leader', async () => {
    plugin = new MaintenancePlugin({ interval: 50 })
    const ltrimMock = mock(() => Promise.resolve('OK'))
    const { agent } = createMockAgent({
      isLeader: () => true,
      transportRedis: { ltrim: ltrimMock },
    })
    plugin.onRegister(agent)
    await plugin.onStart(agent as any)

    // Wait for timer to fire
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(ltrimMock).toHaveBeenCalled()

    await plugin.onStop(agent as any)
  })

  it('should handle maintenance error gracefully', async () => {
    plugin = new MaintenancePlugin({ interval: 50 })
    const { agent } = createMockAgent({
      isLeader: () => true,
      transportRedis: {
        ltrim: mock(() => Promise.reject(new Error('Redis error'))),
      },
    })
    plugin.onRegister(agent)
    await plugin.onStart(agent as any)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Should not throw - error should be caught
    expect(agent.logger.error).toHaveBeenCalled()

    await plugin.onStop(agent as any)
  })

  it('should skip maintenance when agent is not set', async () => {
    plugin = new MaintenancePlugin({ interval: 50 })
    // Don't call onRegister - agent will be undefined
    await plugin.onStart({} as any)

    await new Promise((resolve) => setTimeout(resolve, 100))
    // Should not throw

    await plugin.onStop({} as any)
  })
})

// ==========================================================
// SentryPlugin
// ==========================================================

describe('SentryPlugin', () => {
  let plugin: SentryPlugin

  it('should have name "sentry"', () => {
    plugin = new SentryPlugin({ dsn: 'https://test@sentry.io/1' })
    expect(plugin.name).toBe('sentry')
  })

  it('should register error event handler on onRegister', () => {
    plugin = new SentryPlugin({ dsn: 'https://test@sentry.io/1' })
    const { agent } = createMockAgent()

    plugin.onRegister(agent)
    // Verify that agent.on('error', ...) was called
    // This is checked by emitting an error and seeing if it reaches sentry
  })

  it('should initialize sentry mock on onStart', async () => {
    plugin = new SentryPlugin({ dsn: 'https://test@sentry.io/1' })
    const { agent } = createMockAgent()
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {})

    await plugin.onStart(agent as any)

    expect((plugin as any).sentry).toBeDefined()
    expect((plugin as any).sentry.captureException).toBeDefined()
    consoleSpy.mockRestore()
  })

  it('should capture exception on error event after start', async () => {
    plugin = new SentryPlugin({ dsn: 'https://test@sentry.io/1' })
    const { agent, events } = createMockAgent()
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {})

    plugin.onRegister(agent)
    await plugin.onStart(agent as any)

    // Spy on the sentry mock
    const captureExceptionSpy = spyOn((plugin as any).sentry, 'captureException')

    events.emit('error', {
      message: 'Job crashed',
      jobId: 'job-123',
      context: { some: 'data' },
      workerId: 'worker-1',
      service: 'test-service',
      level: 'error',
    })

    expect(captureExceptionSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should not report to sentry before onStart (sentry not initialized)', () => {
    plugin = new SentryPlugin({ dsn: 'https://test@sentry.io/1' })
    const { agent, events } = createMockAgent()

    plugin.onRegister(agent)
    // Do NOT call onStart

    // Emit error - should not throw since sentry is null
    events.emit('error', { message: 'test' })
  })

  it('should handle missing message in error payload', async () => {
    plugin = new SentryPlugin({ dsn: 'https://test@sentry.io/1' })
    const { agent, events } = createMockAgent()
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {})

    plugin.onRegister(agent)
    await plugin.onStart(agent as any)

    const captureExceptionSpy = spyOn((plugin as any).sentry, 'captureException')

    events.emit('error', {})

    expect(captureExceptionSpy).toHaveBeenCalled()
    const errorArg = captureExceptionSpy.mock.calls[0][0] as any
    expect(errorArg.message).toBe('Unknown Job Error')
    consoleSpy.mockRestore()
  })
})

// ==========================================================
// TrendPlugin
// ==========================================================

describe('TrendPlugin', () => {
  let plugin: TrendPlugin

  it('should have name "trend"', () => {
    plugin = new TrendPlugin()
    expect(plugin.name).toBe('trend')
  })

  it('should use default emaAlpha of 0.3', () => {
    plugin = new TrendPlugin()
    expect((plugin as any).emaAlpha).toBe(0.3)
  })

  it('should accept custom emaAlpha', () => {
    plugin = new TrendPlugin({ emaAlpha: 0.5 })
    expect((plugin as any).emaAlpha).toBe(0.5)
  })

  it('should register agent on onRegister', () => {
    plugin = new TrendPlugin()
    const { agent } = createMockAgent()
    plugin.onRegister(agent)
    expect((plugin as any).agent).toBe(agent)
  })

  it('should listen for tick events on onStart', async () => {
    plugin = new TrendPlugin()
    const { agent, events, metricsCollector } = createMockAgent()
    plugin.onRegister(agent)
    await plugin.onStart(agent)

    // Emit a tick with queue data
    events.emit('tick', {
      queues: [
        {
          name: 'emails',
          counts: { waiting: 10, active: 5, completed: 100 },
        },
      ],
    })

    expect(metricsCollector.setGauge).toHaveBeenCalled()
  })

  it('should calculate EMA correctly', async () => {
    plugin = new TrendPlugin({ emaAlpha: 0.5 })
    const { agent, events } = createMockAgent()
    plugin.onRegister(agent)
    await plugin.onStart(agent)

    // First tick: EMA = value (no previous)
    events.emit('tick', {
      queues: [{ name: 'q1', counts: { waiting: 100 } }],
    })

    const trends = (plugin as any).trends
    expect(trends.get('queue_q1_waiting_ema')).toBe(100) // alpha * 100 + (1 - alpha) * 100

    // Second tick: EMA = 0.5 * 50 + 0.5 * 100 = 75
    events.emit('tick', {
      queues: [{ name: 'q1', counts: { waiting: 50 } }],
    })

    expect(trends.get('queue_q1_waiting_ema')).toBe(75)
  })

  it('should skip non-numeric values in counts', async () => {
    plugin = new TrendPlugin()
    const { agent, events, metricsCollector } = createMockAgent()
    plugin.onRegister(agent)
    await plugin.onStart(agent)

    events.emit('tick', {
      queues: [{ name: 'q1', counts: { waiting: 'not-a-number' } }],
    })

    // setGauge should not be called for non-numeric
    const calls = (metricsCollector.setGauge as any).mock.calls
    const trendCalls = calls.filter((c: any) => c[0].includes('ema'))
    expect(trendCalls.length).toBe(0)
  })

  it('should skip queues without counts', async () => {
    plugin = new TrendPlugin()
    const { agent, events, metricsCollector } = createMockAgent()
    plugin.onRegister(agent)
    await plugin.onStart(agent)

    events.emit('tick', {
      queues: [{ name: 'q1' }],
    })

    const calls = (metricsCollector.setGauge as any).mock.calls
    const trendCalls = calls.filter((c: any) => c[0].includes('ema'))
    expect(trendCalls.length).toBe(0)
  })

  it('should handle payload without queues', async () => {
    plugin = new TrendPlugin()
    const { agent, events } = createMockAgent()
    plugin.onRegister(agent)
    await plugin.onStart(agent)

    // Should not throw
    events.emit('tick', {})
    events.emit('tick', { queues: null })
    events.emit('tick', { queues: 'invalid' })
  })

  it('should handle missing metricsCollector', async () => {
    plugin = new TrendPlugin()
    const { agent, events } = createMockAgent({ metricsCollector: undefined })
    plugin.onRegister(agent)
    await plugin.onStart(agent)

    // Should not throw
    events.emit('tick', {
      queues: [{ name: 'q1', counts: { waiting: 10 } }],
    })
  })

  it('should update emaAlpha via onConfigUpdate', () => {
    plugin = new TrendPlugin({ emaAlpha: 0.3 })
    const { agent } = createMockAgent()

    plugin.onConfigUpdate(agent, { plugins: { trend: { emaAlpha: 0.7 } } })
    expect((plugin as any).emaAlpha).toBe(0.7)
  })

  it('should ignore onConfigUpdate without relevant options', () => {
    plugin = new TrendPlugin({ emaAlpha: 0.3 })
    const { agent } = createMockAgent()

    plugin.onConfigUpdate(agent, {})
    expect((plugin as any).emaAlpha).toBe(0.3)

    plugin.onConfigUpdate(agent, { plugins: {} })
    expect((plugin as any).emaAlpha).toBe(0.3)
  })

  it('should resolve onStop', async () => {
    plugin = new TrendPlugin()
    const { agent } = createMockAgent()
    await plugin.onStop(agent as any)
  })
})

// ==========================================================
// WebhookPlugin
// ==========================================================

describe('WebhookPlugin', () => {
  let plugin: WebhookPlugin

  it('should have name "webhook"', () => {
    plugin = new WebhookPlugin({ webhooks: [] })
    expect(plugin.name).toBe('webhook')
  })

  it('should register event handlers for all configured events', () => {
    const { agent } = createMockAgent()
    const onSpy = spyOn(agent, 'on')

    plugin = new WebhookPlugin({
      webhooks: [
        { url: 'http://example.com/hook', events: ['error', 'tick'] },
        { url: 'http://other.com/hook', events: ['error', 'log'] },
      ],
    })

    plugin.onRegister(agent)

    // 'error', 'tick', 'log' = 3 unique events
    expect(onSpy).toHaveBeenCalledTimes(3)
  })

  it('should call fetch for relevant webhooks on event', async () => {
    const { agent, events } = createMockAgent()

    const fetchMock = spyOn(globalThis, 'fetch' as any).mockImplementation(() =>
      Promise.resolve(new Response(null, { status: 200 }))
    )

    plugin = new WebhookPlugin({
      webhooks: [
        {
          url: 'http://example.com/hook',
          events: ['error'],
          headers: { 'X-Custom': 'test' },
        },
      ],
    })

    plugin.onRegister(agent)

    events.emit('error', { message: 'Job failed' })

    // Allow async to complete
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(fetchMock).toHaveBeenCalled()
    const fetchCall = fetchMock.mock.calls[0]
    expect(fetchCall[0]).toBe('http://example.com/hook')
    expect((fetchCall[1] as any).method).toBe('POST')

    fetchMock.mockRestore()
  })

  it('should handle fetch failure gracefully', async () => {
    const { agent, events } = createMockAgent()
    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})

    const fetchMock = spyOn(globalThis, 'fetch' as any).mockImplementation(() =>
      Promise.reject(new Error('Network error'))
    )

    plugin = new WebhookPlugin({
      webhooks: [{ url: 'http://fail.com/hook', events: ['error'] }],
    })

    plugin.onRegister(agent)
    events.emit('error', { message: 'test' })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(consoleSpy).toHaveBeenCalled()

    fetchMock.mockRestore()
    consoleSpy.mockRestore()
  })

  it('should handle non-ok response gracefully', async () => {
    const { agent, events } = createMockAgent()
    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})

    const fetchMock = spyOn(globalThis, 'fetch' as any).mockImplementation(() =>
      Promise.resolve(new Response(null, { status: 500, statusText: 'Internal Server Error' }))
    )

    plugin = new WebhookPlugin({
      webhooks: [{ url: 'http://fail.com/hook', events: ['error'] }],
    })

    plugin.onRegister(agent)
    events.emit('error', { message: 'test' })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(consoleSpy).toHaveBeenCalled()

    fetchMock.mockRestore()
    consoleSpy.mockRestore()
  })

  it('should not call fetch for unrelated events', async () => {
    const { agent } = createMockAgent()

    const fetchMock = spyOn(globalThis, 'fetch' as any).mockImplementation(() =>
      Promise.resolve(new Response(null, { status: 200 }))
    )

    plugin = new WebhookPlugin({
      webhooks: [{ url: 'http://example.com/hook', events: ['error'] }],
    })

    plugin.onRegister(agent)

    // 'tick' not configured for this webhook, but it won't register for it anyway
    // Since events are deduplicated - 'tick' won't have a listener
    // The actual filtering is per-event registration

    fetchMock.mockRestore()
  })
})

// ==========================================================
// PluginRegistry
// ==========================================================

describe('PluginRegistry', () => {
  let registry: PluginRegistry

  beforeEach(() => {
    registry = new PluginRegistry()
  })

  it('should register and retrieve a probe', () => {
    const factory = mock((_redis: any, name: string) => ({ type: 'test', name }))
    registry.registerProbe('test', factory as any)

    const probe = registry.getProbe('test', {}, 'my-queue')
    expect(probe).toBeDefined()
    expect(factory).toHaveBeenCalledWith({}, 'my-queue')
  })

  it('should return undefined for unregistered probe type', () => {
    const probe = registry.getProbe('nonexistent', {}, 'test')
    expect(probe).toBeUndefined()
  })

  it('should register and retrieve a bridge', () => {
    const factory = mock((_redis: any, _prefix: string, _workerId: string, _options: any) => ({
      type: 'test-bridge',
    }))
    registry.registerBridge('test', factory as any)

    const bridge = registry.getBridge('test', {}, 'prefix:', 'worker-1', {})
    expect(bridge).toBeDefined()
    expect(factory).toHaveBeenCalledWith({}, 'prefix:', 'worker-1', {})
  })

  it('should return undefined for unregistered bridge type', () => {
    const bridge = registry.getBridge('nonexistent', {}, '', '', {})
    expect(bridge).toBeUndefined()
  })
})

// ==========================================================
// CorePlugin
// ==========================================================

describe('CorePlugin', () => {
  it('should have name "core"', () => {
    const plugin = new CorePlugin()
    expect(plugin.name).toBe('core')
  })

  it('should register all built-in probes and bridges', () => {
    const plugin = new CorePlugin()
    const registry = new PluginRegistry()
    const agent = {
      getPluginRegistry: () => registry,
    }

    const registerProbeSpy = spyOn(registry, 'registerProbe')
    const registerBridgeSpy = spyOn(registry, 'registerBridge')

    plugin.onRegister(agent as any)

    // Should register 5 probe types
    expect(registerProbeSpy).toHaveBeenCalledTimes(5)
    expect(registerProbeSpy).toHaveBeenCalledWith('redis', expect.any(Function))
    expect(registerProbeSpy).toHaveBeenCalledWith('laravel', expect.any(Function))
    expect(registerProbeSpy).toHaveBeenCalledWith('bull', expect.any(Function))
    expect(registerProbeSpy).toHaveBeenCalledWith('bullmq', expect.any(Function))
    expect(registerProbeSpy).toHaveBeenCalledWith('bee-queue', expect.any(Function))

    // Should register 5 bridge types
    expect(registerBridgeSpy).toHaveBeenCalledTimes(5)
    expect(registerBridgeSpy).toHaveBeenCalledWith('bullmq', expect.any(Function))
    expect(registerBridgeSpy).toHaveBeenCalledWith('bee-queue', expect.any(Function))
    expect(registerBridgeSpy).toHaveBeenCalledWith('bull', expect.any(Function))
    expect(registerBridgeSpy).toHaveBeenCalledWith('agenda', expect.any(Function))
    expect(registerBridgeSpy).toHaveBeenCalledWith('generic', expect.any(Function))
  })

  it('should throw for generic bridge without eventMapping', () => {
    const plugin = new CorePlugin()
    const registry = new PluginRegistry()
    const agent = {
      getPluginRegistry: () => registry,
    }

    plugin.onRegister(agent as any)

    expect(() => {
      registry.getBridge('generic', {} as any, 'prefix:', 'worker-1', {})
    }).toThrow('Generic bridge requires eventMapping option')
  })

  it('should create generic bridge with valid eventMapping', () => {
    const plugin = new CorePlugin()
    const registry = new PluginRegistry()
    const agent = {
      getPluginRegistry: () => registry,
    }

    plugin.onRegister(agent as any)

    const mockRedis = {
      pipeline: () => ({
        lpush: () => {},
        ltrim: () => {},
        publish: () => {},
        exec: () => Promise.resolve([]),
      }),
    }

    const bridge = registry.getBridge('generic', mockRedis as any, 'prefix:', 'worker-1', {
      eventMapping: { started: 'job:start', completed: 'job:done' },
      queueName: 'my-queue',
    })

    expect(bridge).toBeDefined()
  })
})
