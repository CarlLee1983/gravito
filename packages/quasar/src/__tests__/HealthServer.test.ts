import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { IncomingMessage, RequestListener, ServerResponse } from 'node:http'
import { HealthServer } from '../health/HealthServer'

function createMockAgent(overrides: Record<string, any> = {}) {
  return {
    getStatus: mock(() => ({
      nodeId: 'test-node-1',
      service: 'test-service',
      transport: 'ready',
      monitor: 'ready',
      metrics: { heartbeats: { total: 10 }, custom: {} },
    })),
    getClusterStatus: mock(() => Promise.resolve([{ id: 'node-1', service: 'test' }])),
    isLeader: mock(() => true),
    getPrometheusMetrics: mock(
      () =>
        'quasar_heartbeats_total{status="success"} 10\nquasar_heartbeats_total{status="failed"} 0'
    ),
    ...overrides,
  }
}

describe('HealthServer', () => {
  let server: HealthServer
  let agent: any
  let port: number
  let requestHandler:
    | ((req: IncomingMessage, res: ServerResponse<IncomingMessage>) => void | Promise<void>)
    | undefined
  let fakeNodeServer: {
    listen: (port: number, cb: () => void) => void
    close: (cb: (err?: Error | null) => void) => void
    once: (event: string, cb: (error: Error) => void) => void
    off: (event: string, cb: (error: Error) => void) => void
  }

  async function invoke(url: string, headers: Record<string, string> = {}) {
    let statusCode = 200
    let responseHeaders: Record<string, string> = {}
    let body = ''

    const req = {
      url,
      headers,
    } as IncomingMessage

    const res = {
      writeHead(code: number, headers?: Record<string, string>) {
        statusCode = code
        responseHeaders = headers ?? {}
        return res
      },
      end(chunk?: string) {
        body = chunk ?? ''
        return res
      },
    } as unknown as ServerResponse<IncomingMessage>

    await requestHandler?.(req, res)

    return {
      statusCode,
      headers: responseHeaders,
      body,
      json: () => JSON.parse(body),
    }
  }

  beforeEach(() => {
    port = 10000 + Math.floor(Math.random() * 50000)
    agent = createMockAgent()
    fakeNodeServer = {
      listen(_port, cb) {
        cb()
      },
      close(cb) {
        cb(null)
      },
      once() {},
      off() {},
    }
    server = new HealthServer(agent, port, ((handler: RequestListener) => {
      requestHandler = handler
      return fakeNodeServer as any
    }) as any)
  })

  afterEach(async () => {
    await server.stop()
  })

  it('should start and listen on the specified port', async () => {
    await server.start()
    const response = await invoke('/health')
    expect(response.statusCode).toBe(200)
  })

  it('should return healthy status on /health', async () => {
    await server.start()
    const response = await invoke('/health')
    const data = response.json()

    expect(data.status).toBe('healthy')
    expect(data.service).toBe('test-service')
    expect(data.connections.transport).toBe('ready')
    expect(data.connections.monitor).toBe('ready')
    expect(data.nodeId).toBe('test-node-1')
    expect(data.uptime).toBeGreaterThan(0)
  })

  it('should return healthy status on /', async () => {
    await server.start()
    const response = await invoke('/')
    const data = response.json()

    expect(data.status).toBe('healthy')
  })

  it('should return unhealthy status when transport is not ready', async () => {
    agent.getStatus = mock(() => ({
      nodeId: 'test-node-1',
      service: 'test-service',
      transport: 'error',
      monitor: 'ready',
      metrics: {},
    }))

    await server.start()
    const response = await invoke('/health')
    expect(response.statusCode).toBe(503)

    const data = response.json()
    expect(data.status).toBe('unhealthy')
  })

  it('should return degraded status when monitor is not ready', async () => {
    agent.getStatus = mock(() => ({
      nodeId: 'test-node-1',
      service: 'test-service',
      transport: 'ready',
      monitor: 'error',
      metrics: {},
    }))

    await server.start()
    const response = await invoke('/health')
    expect(response.statusCode).toBe(503)

    const data = response.json()
    expect(data.status).toBe('degraded')
  })

  it('should not be degraded when monitor is not_configured', async () => {
    agent.getStatus = mock(() => ({
      nodeId: 'test-node-1',
      service: 'test-service',
      transport: 'ready',
      monitor: 'not_configured',
      metrics: {},
    }))

    await server.start()
    const response = await invoke('/health')
    const data = response.json()
    expect(data.status).toBe('healthy')
  })

  it('should return cluster status on /cluster', async () => {
    await server.start()
    const response = await invoke('/cluster')
    const data = response.json()

    expect(data.nodes).toEqual([{ id: 'node-1', service: 'test' }])
    expect(data.isLeader).toBe(true)
    expect(data.timestamp).toBeDefined()
  })

  it('should handle cluster status error', async () => {
    agent.getClusterStatus = mock(() => Promise.reject(new Error('Redis down')))

    await server.start()
    const response = await invoke('/cluster')
    expect(response.statusCode).toBe(500)

    const data = response.json()
    expect(data.error).toBe('Failed to fetch cluster status')
  })

  it('should return prometheus metrics on /metrics (text/plain)', async () => {
    await server.start()
    const response = await invoke('/metrics')
    const text = response.body

    expect(response.headers['Content-Type']).toBe('text/plain')
    expect(text).toContain('quasar_heartbeats_total')
  })

  it('should return JSON metrics on /metrics with Accept: application/json', async () => {
    await server.start()
    const response = await invoke('/metrics', { accept: 'application/json' })
    const data = response.json()

    expect(response.headers['Content-Type']).toBe('application/json')
    expect(data).toBeDefined()
  })

  it('should return 404 for unknown paths', async () => {
    await server.start()
    const response = await invoke('/unknown')
    expect(response.statusCode).toBe(404)
  })

  it('should stop gracefully', async () => {
    const localServer = new HealthServer(agent, port, ((handler: RequestListener) => {
      requestHandler = handler
      return fakeNodeServer as any
    }) as any)
    await localServer.start()
    await localServer.stop()
  })

  it('should handle stop when not started', async () => {
    const localServer = new HealthServer(agent, port, (() => fakeNodeServer as any) as any)
    await localServer.stop()
  })

  it('should use getStatus correctly', () => {
    const status = server.getStatus()
    expect(status.status).toBe('healthy')
    expect(status.service).toBe('test-service')
  })
})
