import { beforeAll, describe, expect, test } from 'bun:test'
import { PlanetCore } from '../../core/src/index'
import { HealthRegistry } from '../src/health/HealthRegistry'
import { MonitorOrbit } from '../src/index'
import { MetricsRegistry } from '../src/metrics/MetricsRegistry'

describe('MonitorOrbit', () => {
  test('registers health, metrics, and tracing services', async () => {
    const core = new PlanetCore()
    core.orbit(new MonitorOrbit())

    const _server = await core.liftoff()

    expect(core.services.get('monitor')).toBeDefined()
    expect(core.services.get('health')).toBeDefined()
    expect(core.services.get('metrics')).toBeDefined()
    expect(core.services.get('tracing')).toBeDefined()
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

    // Register a simple check
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

describe('Health Endpoints', () => {
  let fetch: (req: Request) => Promise<Response>

  beforeAll(async () => {
    const core = new PlanetCore()
    core.orbit(
      new MonitorOrbit({
        health: { enabled: true },
        metrics: { enabled: true },
        tracing: { enabled: false },
      })
    )

    const server = await core.liftoff()
    fetch = server.fetch as (req: Request) => Promise<Response>
  })

  test('GET /health returns health report', async () => {
    const response = await fetch(new Request('http://localhost/health'))
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('healthy')
    expect(data.uptime).toBeDefined()
    expect(data.timestamp).toBeDefined()
  })

  test('GET /ready returns readiness status', async () => {
    const response = await fetch(new Request('http://localhost/ready'))
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('ready')
  })

  test('GET /live returns liveness status', async () => {
    const response = await fetch(new Request('http://localhost/live'))
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('alive')
  })

  test('GET /metrics returns Prometheus format', async () => {
    const response = await fetch(new Request('http://localhost/metrics'))
    expect(response.status).toBe(200)

    const contentType = response.headers.get('content-type')
    expect(contentType).toContain('text/plain')

    const text = await response.text()
    expect(text).toContain('# HELP')
    expect(text).toContain('# TYPE')
  })
})
