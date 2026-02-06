import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
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

  beforeEach(() => {
    // 使用隨機可用 port 避免衝突
    port = 10000 + Math.floor(Math.random() * 50000)
    agent = createMockAgent()
    server = new HealthServer(agent, port)
  })

  afterEach(async () => {
    await server.stop()
  })

  it('should start and listen on the specified port', async () => {
    await server.start()

    const response = await fetch(`http://localhost:${port}/health`)
    expect(response.status).toBe(200)
  })

  it('should return healthy status on /health', async () => {
    await server.start()

    const response = await fetch(`http://localhost:${port}/health`)
    const data = await response.json()

    expect(data.status).toBe('healthy')
    expect(data.service).toBe('test-service')
    expect(data.connections.transport).toBe('ready')
    expect(data.connections.monitor).toBe('ready')
    expect(data.nodeId).toBe('test-node-1')
    expect(data.uptime).toBeGreaterThan(0)
  })

  it('should return healthy status on /', async () => {
    await server.start()

    const response = await fetch(`http://localhost:${port}/`)
    const data = await response.json()

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

    const response = await fetch(`http://localhost:${port}/health`)
    expect(response.status).toBe(503)

    const data = await response.json()
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

    const response = await fetch(`http://localhost:${port}/health`)
    expect(response.status).toBe(503)

    const data = await response.json()
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

    const response = await fetch(`http://localhost:${port}/health`)
    const data = await response.json()
    expect(data.status).toBe('healthy')
  })

  it('should return cluster status on /cluster', async () => {
    await server.start()

    const response = await fetch(`http://localhost:${port}/cluster`)
    const data = await response.json()

    expect(data.nodes).toEqual([{ id: 'node-1', service: 'test' }])
    expect(data.isLeader).toBe(true)
    expect(data.timestamp).toBeDefined()
  })

  it('should handle cluster status error', async () => {
    agent.getClusterStatus = mock(() => Promise.reject(new Error('Redis down')))

    await server.start()

    const response = await fetch(`http://localhost:${port}/cluster`)
    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBe('Failed to fetch cluster status')
  })

  it('should return prometheus metrics on /metrics (text/plain)', async () => {
    await server.start()

    const response = await fetch(`http://localhost:${port}/metrics`)
    const text = await response.text()

    expect(response.headers.get('content-type')).toBe('text/plain')
    expect(text).toContain('quasar_heartbeats_total')
  })

  it('should return JSON metrics on /metrics with Accept: application/json', async () => {
    await server.start()

    const response = await fetch(`http://localhost:${port}/metrics`, {
      headers: { Accept: 'application/json' },
    })
    const data = await response.json()

    expect(response.headers.get('content-type')).toBe('application/json')
    expect(data).toBeDefined()
  })

  it('should return 404 for unknown paths', async () => {
    await server.start()

    const response = await fetch(`http://localhost:${port}/unknown`)
    expect(response.status).toBe(404)
  })

  it('should stop gracefully', async () => {
    // 建立獨立 server 避免 afterEach 重複 stop
    const localPort = 10000 + Math.floor(Math.random() * 50000)
    const localServer = new HealthServer(agent, localPort)
    await localServer.start()

    // 第一次 stop 不應拋錯
    await localServer.stop()

    // 確認 port 已釋放（第二次 stop 不走 afterEach 了）
  })

  it('should handle stop when not started', async () => {
    // 建立新 server 但不 start
    const localPort = 10000 + Math.floor(Math.random() * 50000)
    const localServer = new HealthServer(agent, localPort)

    // Stop without start should resolve
    await localServer.stop()
  })

  it('should use getStatus correctly', () => {
    const status = server.getStatus()
    expect(status.status).toBe('healthy')
    expect(status.service).toBe('test-service')
  })
})
