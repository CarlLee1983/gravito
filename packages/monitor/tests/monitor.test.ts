import { describe, expect, mock, test } from 'bun:test'
import { defaultConfig, defineMonitorConfig, resolveConfig } from '../src/config'
import {
  createDatabaseCheck,
  createDiskCheck,
  createHttpCheck,
  createMemoryCheck,
  createRedisCheck,
} from '../src/health'
import { HealthController } from '../src/health/HealthController'
import { HealthRegistry } from '../src/health/HealthRegistry'
import { MonitorOrbit } from '../src/index'
import { createHttpMetricsMiddleware } from '../src/metrics'
import { MetricsController } from '../src/metrics/MetricsController'
import { MetricsRegistry } from '../src/metrics/MetricsRegistry'
import { createTracingMiddleware, TracingManager } from '../src/tracing'

const createJsonContext = () => ({
  json: (data: unknown, status: number) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
})

describe('MonitorOrbit', () => {
  test('registers services and routes', async () => {
    const routes = new Map<string, (c: unknown) => Promise<Response> | Response>()
    const core = {
      services: new Map<string, unknown>(),
      router: {
        get: (path: string, handler: (c: unknown) => Promise<Response> | Response) => {
          routes.set(path, handler)
        },
      },
    }

    const orbit = new MonitorOrbit({
      health: { enabled: true },
      metrics: { enabled: true },
      tracing: { enabled: false },
    })

    await orbit.install(core as any)

    expect(core.services.get('monitor')).toBeDefined()
    expect(core.services.get('health')).toBeDefined()
    expect(core.services.get('metrics')).toBeDefined()
    expect(core.services.get('tracing')).toBeDefined()
    expect(routes.has('/health')).toBe(true)
    expect(routes.has('/ready')).toBe(true)
    expect(routes.has('/live')).toBe(true)
    expect(routes.has('/metrics')).toBe(true)
  })
})

describe('HealthRegistry', () => {
  test('registers and executes health checks', async () => {
    const registry = new HealthRegistry({
      enabled: true,
      path: '/health',
      readyPath: '/ready',
      livePath: '/live',
      timeout: 5000,
      cacheTtl: 0,
    })

    registry.register('database', async () => ({
      status: 'healthy',
      message: 'Connected',
    }))

    const report = await registry.check()

    expect(report.status).toBe('healthy')
    expect(report.checks.database).toBeDefined()
    expect(report.checks.database?.status).toBe('healthy')
    expect(report.uptime).toBeGreaterThanOrEqual(0)
  })

  test('returns unhealthy when a check fails', async () => {
    const registry = new HealthRegistry({
      enabled: true,
      path: '/health',
      readyPath: '/ready',
      livePath: '/live',
      timeout: 5000,
      cacheTtl: 0,
    })

    registry.register('healthy-check', () => ({ status: 'healthy' }))
    registry.register('broken-check', () => ({ status: 'unhealthy', message: 'Broken' }))

    const report = await registry.check()

    expect(report.status).toBe('unhealthy')
    expect(report.checks['broken-check']?.status).toBe('unhealthy')
  })

  test('liveness always returns healthy', async () => {
    const registry = new HealthRegistry({
      enabled: true,
      path: '/health',
      readyPath: '/ready',
      livePath: '/live',
      timeout: 5000,
      cacheTtl: 0,
    })

    const result = await registry.liveness()
    expect(result.status).toBe('healthy')
  })

  test('readiness returns unhealthy when checks fail', async () => {
    const registry = new HealthRegistry({
      enabled: true,
      path: '/health',
      readyPath: '/ready',
      livePath: '/live',
      timeout: 5000,
      cacheTtl: 0,
    })

    registry.register('db', () => ({ status: 'unhealthy', message: 'Disconnected' }))

    const result = await registry.readiness()
    expect(result.status).toBe('unhealthy')
    expect(result.reason).toContain('db')
  })
})

describe('MetricsRegistry', () => {
  test('creates and increments counters', () => {
    const registry = new MetricsRegistry({
      enabled: true,
      path: '/metrics',
      defaultMetrics: false,
      prefix: 'test_',
      defaultLabels: {},
    })

    const counter = registry.counter({
      name: 'requests_total',
      help: 'Total requests',
      labels: ['method'],
    })

    counter.inc({ method: 'GET' })
    counter.inc({ method: 'GET' })
    counter.inc({ method: 'POST' })

    const values = counter.getValues()
    expect(values.length).toBe(2)

    const getValue = values.find((v) => v.labels.method === 'GET')
    expect(getValue?.value).toBe(2)

    const postValue = values.find((v) => v.labels.method === 'POST')
    expect(postValue?.value).toBe(1)
  })

  test('creates and sets gauges', () => {
    const registry = new MetricsRegistry({
      enabled: true,
      path: '/metrics',
      defaultMetrics: false,
      prefix: 'test_',
      defaultLabels: {},
    })

    const gauge = registry.gauge({
      name: 'connections',
      help: 'Active connections',
    })

    gauge.set(10)
    expect(gauge.getValues()[0]?.value).toBe(10)

    gauge.inc()
    expect(gauge.getValues()[0]?.value).toBe(11)

    gauge.dec({}, 5)
    expect(gauge.getValues()[0]?.value).toBe(6)
  })

  test('creates and observes histograms', () => {
    const registry = new MetricsRegistry({
      enabled: true,
      path: '/metrics',
      defaultMetrics: false,
      prefix: 'test_',
      defaultLabels: {},
    })

    const histogram = registry.histogram({
      name: 'response_time',
      help: 'Response time',
      buckets: [0.1, 0.5, 1.0],
    })

    histogram.observe(0.05)
    histogram.observe(0.25)
    histogram.observe(0.75)

    const values = histogram.getValues()
    expect(values.counts.get('__default__')).toBe(3)
    expect(values.sums.get('__default__')).toBeCloseTo(1.05, 2)
  })

  test('exports metrics in Prometheus format', () => {
    const registry = new MetricsRegistry({
      enabled: true,
      path: '/metrics',
      defaultMetrics: false,
      prefix: 'app_',
      defaultLabels: {},
    })

    const counter = registry.counter({
      name: 'requests',
      help: 'Request count',
    })
    counter.inc()

    const output = registry.toPrometheus()

    expect(output).toContain('# HELP app_requests Request count')
    expect(output).toContain('# TYPE app_requests counter')
    expect(output).toContain('app_requests 1')
  })
})

describe('Controllers', () => {
  test('HealthController returns health report', async () => {
    const registry = new HealthRegistry({ cacheTtl: 0 })
    registry.register('db', () => ({ status: 'healthy', message: 'ok' }))
    const controller = new HealthController(registry)

    const response = await controller.health(createJsonContext() as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.uptime).toBeDefined()
  })

  test('HealthController returns readiness status', async () => {
    const registry = new HealthRegistry({ cacheTtl: 0 })
    registry.register('db', () => ({ status: 'unhealthy', message: 'down' }))
    const controller = new HealthController(registry)

    const response = await controller.ready(createJsonContext() as any)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('not_ready')
    expect(data.reason).toContain('db')
  })

  test('HealthController returns liveness status', async () => {
    const registry = new HealthRegistry({ cacheTtl: 0 })
    const controller = new HealthController(registry)

    const response = await controller.live(createJsonContext() as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('alive')
  })

  test('MetricsController returns Prometheus format', async () => {
    const registry = new MetricsRegistry({
      enabled: true,
      path: '/metrics',
      defaultMetrics: false,
      prefix: 'app_',
      defaultLabels: {},
    })
    registry.counter({ name: 'requests', help: 'Request count' }).inc()
    const controller = new MetricsController(registry)

    const response = await controller.metrics({} as any)
    const contentType = response.headers.get('content-type')
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(contentType).toContain('text/plain')
    expect(body).toContain('# HELP')
    expect(body).toContain('# TYPE')
  })
})

describe('Config helpers', () => {
  test('resolveConfig merges defaults with overrides', () => {
    const resolved = resolveConfig({
      health: { path: '/status' },
      metrics: { enabled: false },
      tracing: { enabled: true, serviceName: 'api' },
    })

    expect(resolved.health.path).toBe('/status')
    expect(resolved.health.readyPath).toBe(defaultConfig.health.readyPath)
    expect(resolved.metrics.enabled).toBe(false)
    expect(resolved.metrics.prefix).toBe(defaultConfig.metrics.prefix)
    expect(resolved.tracing.enabled).toBe(true)
    expect(resolved.tracing.serviceName).toBe('api')
  })

  test('defineMonitorConfig returns the input config', () => {
    const config = { health: { enabled: false } }
    expect(defineMonitorConfig(config)).toBe(config)
  })
})

describe('Health helpers', () => {
  test('createDatabaseCheck handles success and failure', async () => {
    const healthyCheck = createDatabaseCheck(() => true)
    const healthy = await healthyCheck()
    expect(healthy.status).toBe('healthy')

    const failedCheck = createDatabaseCheck(() => {
      throw new Error('db down')
    })
    const failed = await failedCheck()
    expect(failed.status).toBe('unhealthy')
    expect(failed.message).toBe('db down')
  })

  test('createRedisCheck handles ping responses', async () => {
    const healthyCheck = createRedisCheck(() => 'PONG')
    const healthy = await healthyCheck()
    expect(healthy.status).toBe('healthy')

    const unexpectedCheck = createRedisCheck(() => 'NO')
    const unexpected = await unexpectedCheck()
    expect(unexpected.status).toBe('unhealthy')
    expect(unexpected.message).toContain('Unexpected response')
  })

  test('createMemoryCheck reports degradation', () => {
    const original = process.memoryUsage
    process.memoryUsage = () =>
      ({
        heapUsed: 95,
        heapTotal: 100,
        rss: 200,
        external: 0,
        arrayBuffers: 0,
      }) as NodeJS.MemoryUsage

    const check = createMemoryCheck({ maxHeapUsedPercent: 10 })
    const result = check()

    expect(result.status).toBe('degraded')
    expect(result.message).toContain('Heap usage')

    process.memoryUsage = original
  })

  test('createMemoryCheck reports healthy usage', () => {
    const original = process.memoryUsage
    process.memoryUsage = () =>
      ({
        heapUsed: 50,
        heapTotal: 200,
        rss: 300,
        external: 0,
        arrayBuffers: 0,
      }) as NodeJS.MemoryUsage

    const check = createMemoryCheck()
    const result = check()

    expect(result.status).toBe('healthy')
    expect(result.message).toBe('Memory usage normal')

    process.memoryUsage = original
  })

  test('createHttpCheck reports status', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response('ok', { status: 200 })

    const check = createHttpCheck('https://example.com')
    const result = await check()

    expect(result.status).toBe('healthy')

    globalThis.fetch = originalFetch
  })

  test('createHttpCheck reports failures', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      throw new Error('network down')
    }

    const check = createHttpCheck('https://example.com')
    const result = await check()

    expect(result.status).toBe('unhealthy')
    expect(result.message).toBe('network down')

    globalThis.fetch = originalFetch
  })

  test('createDiskCheck returns healthy result', async () => {
    const check = createDiskCheck({ minFreePercent: 15 })
    const result = await check()

    expect(result.status).toBe('healthy')
    expect(result.details?.minFreePercent).toBe(15)
  })
})

describe('Metrics middleware', () => {
  test('records normalized paths', async () => {
    const registry = new MetricsRegistry({
      defaultMetrics: false,
      prefix: '',
    })
    const middleware = createHttpMetricsMiddleware(registry)

    await middleware(
      { req: { method: 'GET', path: '/users/123', url: 'http://example.com/users/123' } } as any,
      async () => {}
    )

    const output = registry.toPrometheus()
    expect(output).toContain('http_requests_total')
    expect(output).toContain('path="/users/:id"')
  })
})

describe('Tracing', () => {
  test('tracing manager tracks spans and context', () => {
    const tracer = new TracingManager()
    const span = tracer.startSpan('work')

    tracer.setAttribute(span, 'key', 'value')
    tracer.addEvent(span, 'event')
    expect(tracer.getActiveSpan()).toBe(span)

    tracer.endSpan(span, 'ok')
    expect(span.status).toBe('ok')
    expect(tracer.getActiveSpan()).toBe(null)

    const headers = new Headers()
    tracer.injectContext(headers, span)
    const context = tracer.extractContext(headers)
    expect(context?.traceId).toBe(span.traceId)

    expect(tracer.getSpans().length).toBe(1)
    tracer.clearSpans()
    expect(tracer.getSpans().length).toBe(0)
  })

  test('createTracingMiddleware records errors', async () => {
    const tracer = new TracingManager()
    tracer.clearSpans()
    const middleware = createTracingMiddleware(tracer)

    const stored: Record<string, unknown> = {}
    await middleware(
      {
        req: {
          method: 'GET',
          path: '/ping',
          url: 'http://localhost/ping',
          raw: { headers: new Headers() },
        },
        set: (key: string, value: unknown) => {
          stored[key] = value
        },
      } as any,
      async () => {}
    )

    expect(stored.span).toBe(tracer.getSpans()[0])

    await expect(
      middleware(
        {
          req: {
            method: 'POST',
            path: '/fail',
            url: 'http://localhost/fail',
            raw: { headers: new Headers() },
          },
          set: () => {},
        } as any,
        async () => {
          throw new Error('boom')
        }
      )
    ).rejects.toThrow('boom')

    const span = tracer.getSpans()[1]
    expect(span.status).toBe('error')
    expect(span.attributes.error).toBe(true)
  })

  test('initialize and shutdown with opentelemetry available', async () => {
    let startCalled = false
    let shutdownCalled = false
    let exporterUrl = ''
    let resourceAttrs: Record<string, string> = {}

    mock.module('@opentelemetry/sdk-node', () => ({
      NodeSDK: class {
        async start() {
          startCalled = true
        }
        async shutdown() {
          shutdownCalled = true
        }
      },
    }))
    mock.module('@opentelemetry/exporter-trace-otlp-http', () => ({
      OTLPTraceExporter: class {
        constructor(options: { url: string }) {
          exporterUrl = options.url
        }
      },
    }))
    mock.module('@opentelemetry/resources', () => ({
      Resource: class {
        constructor(attrs: Record<string, string>) {
          resourceAttrs = attrs
        }
      },
    }))
    mock.module('@opentelemetry/semantic-conventions', () => ({
      ATTR_SERVICE_NAME: 'service.name',
      ATTR_SERVICE_VERSION: 'service.version',
    }))

    const tracer = new TracingManager({
      serviceName: 'api',
      serviceVersion: '2.0.0',
      endpoint: 'http://example.com',
    })

    await tracer.initialize()
    await tracer.shutdown()

    expect(startCalled).toBe(true)
    expect(shutdownCalled).toBe(true)
    expect(exporterUrl).toBe('http://example.com')
    expect(resourceAttrs['service.name']).toBe('api')
    expect(resourceAttrs['service.version']).toBe('2.0.0')
  })
})
