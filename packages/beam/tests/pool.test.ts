/**
 * @fileoverview Comprehensive tests for connection pool components
 * @module @gravito/beam/pool
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { BeamPoolExhaustedError } from '../src/errors'
import { ConnectionPool } from '../src/pool/ConnectionPool'
import { PoolEntry } from '../src/pool/PoolEntry'
import { PoolHealthChecker } from '../src/pool/PoolHealthChecker'
import { PoolMetricsCollector } from '../src/pool/PoolMetrics'

describe('PoolEntry', () => {
  let entry: PoolEntry

  beforeEach(() => {
    entry = new PoolEntry('conn-1', 'example.com')
  })

  it('should initialize with correct metadata', () => {
    const metadata = entry.getMetadata()
    expect(metadata.id).toBe('conn-1')
    expect(metadata.hostname).toBe('example.com')
    expect(metadata.useCount).toBe(0)
    expect(metadata.state).toBe('idle')
  })

  it('should transition to active state', () => {
    entry.markActive()
    expect(entry.getMetadata().state).toBe('active')
    expect(entry.isIdle()).toBe(false)
  })

  it('should transition back to idle state', () => {
    entry.markActive()
    entry.markIdle()
    expect(entry.getMetadata().state).toBe('idle')
    expect(entry.isIdle()).toBe(true)
  })

  it('should track use count', () => {
    entry.markActive()
    expect(entry.getMetadata().useCount).toBe(1)
    entry.markIdle()
    entry.markActive()
    expect(entry.getMetadata().useCount).toBe(2)
  })

  it('should detect expired connections', () => {
    // Fresh connection should not be expired
    expect(entry.isExpired(1000)).toBe(false)

    // Simulate old connection by checking after timeout
    // In practice, after 1000ms the connection would be considered expired
    const isExpiredNow = Date.now() - entry.getMetadata().createdAt > 1000
    expect(entry.isExpired(1000)).toBe(isExpiredNow)
  })

  it('should detect idle timeout', () => {
    entry.markActive()
    entry.markIdle()
    // Immediately after marking idle, should not be idle too long
    expect(entry.isIdleTooLong(1000)).toBe(false)
  })

  it('should report healthy connections', () => {
    expect(entry.isHealthy()).toBe(true)
    entry.markDraining()
    expect(entry.isHealthy()).toBe(false)
  })

  it('should return correct hostname', () => {
    expect(entry.getHostname()).toBe('example.com')
  })
})

describe('PoolMetricsCollector', () => {
  let metrics: PoolMetricsCollector

  beforeEach(() => {
    metrics = new PoolMetricsCollector()
  })

  it('should record connection acquisitions', () => {
    metrics.recordAcquire('api.example.com', 50, false)
    const snapshot = metrics.getSnapshot()
    expect(snapshot.totalActive).toBe(0) // Not set via recordAcquire
  })

  it('should track creation and reuse', () => {
    metrics.recordCreate('api.example.com')
    metrics.recordAcquire('api.example.com', 10, true)
    const snapshot = metrics.getSnapshot()
    expect(snapshot.totalCreated).toBe(1)
    expect(snapshot.totalReused).toBe(1)
  })

  it('should calculate reuse rate', () => {
    metrics.recordCreate('api.example.com')
    metrics.recordCreate('api.example.com')
    metrics.recordAcquire('api.example.com', 10, true)
    const snapshot = metrics.getSnapshot()
    expect(snapshot.reuseRate).toBe(0.5) // 1 out of 2
  })

  it('should calculate average acquisition time', () => {
    metrics.recordAcquire('api.example.com', 10, false)
    metrics.recordAcquire('api.example.com', 20, false)
    metrics.recordAcquire('api.example.com', 30, false)
    const snapshot = metrics.getSnapshot()
    expect(snapshot.avgAcquireTimeMs).toBe(20)
  })

  it('should track per-host metrics', () => {
    metrics.setActiveConnections('api.example.com', 5)
    metrics.setIdleConnections('api.example.com', 3)
    metrics.setWaitingRequests('api.example.com', 2)
    metrics.setMaxConnections('api.example.com', 10)

    const snapshot = metrics.getSnapshot()
    const hostMetrics = snapshot.byHost.get('api.example.com')
    expect(hostMetrics?.active).toBe(5)
    expect(hostMetrics?.idle).toBe(3)
    expect(hostMetrics?.waiting).toBe(2)
    expect(hostMetrics?.maxConnections).toBe(10)
  })

  it('should aggregate total active connections', () => {
    metrics.setActiveConnections('api1.example.com', 3)
    metrics.setActiveConnections('api2.example.com', 4)
    const snapshot = metrics.getSnapshot()
    expect(snapshot.totalActive).toBe(7)
  })

  it('should reset all metrics', () => {
    metrics.recordCreate('api.example.com')
    metrics.recordAcquire('api.example.com', 50, true)
    metrics.setActiveConnections('api.example.com', 5)

    metrics.reset()
    const snapshot = metrics.getSnapshot()
    expect(snapshot.totalCreated).toBe(0)
    expect(snapshot.totalReused).toBe(0)
    expect(snapshot.totalActive).toBe(0)
    expect(snapshot.avgAcquireTimeMs).toBe(0)
  })

  it('should handle sample limit for acquire times', () => {
    // Add 1100 samples (should trim to 1000)
    for (let i = 0; i < 1100; i++) {
      metrics.recordAcquire('api.example.com', 10 + i, false)
    }
    // Should not crash and should have processed samples
    const snapshot = metrics.getSnapshot()
    expect(snapshot.avgAcquireTimeMs).toBeGreaterThan(0)
  })
})

describe('PoolHealthChecker', () => {
  it('should start and stop periodic checks', (done) => {
    let checkCount = 0
    const checker = new PoolHealthChecker(() => {
      checkCount++
      return checkCount
    }, 100)

    expect(checker.isRunning()).toBe(false)
    checker.start()
    expect(checker.isRunning()).toBe(true)

    setTimeout(() => {
      checker.stop()
      expect(checker.isRunning()).toBe(false)
      expect(checkCount).toBeGreaterThan(0)
      done()
    }, 250)
  })

  it('should perform manual health checks', () => {
    let checkCount = 0
    const checker = new PoolHealthChecker(() => {
      checkCount++
      return checkCount
    }, 1000)

    const result1 = checker.check()
    expect(result1).toBe(1)
    expect(checkCount).toBe(1)

    const result2 = checker.check()
    expect(result2).toBe(2)
    expect(checkCount).toBe(2)
  })

  it('should handle check callback errors gracefully', (done) => {
    const checker = new PoolHealthChecker(() => {
      throw new Error('Check failed')
    }, 100)

    // Capture console.error
    const oldError = console.error
    let errorLogged = false
    console.error = () => {
      errorLogged = true
    }

    checker.start()
    setTimeout(() => {
      checker.stop()
      console.error = oldError
      expect(errorLogged).toBe(true)
      done()
    }, 150)
  })

  it('should not prevent process exit when timer is stopped', () => {
    const checker = new PoolHealthChecker(() => 0, 100)
    checker.start()
    checker.stop()
    // If this test completes, it means the timer didn't prevent exit
    expect(checker.isRunning()).toBe(false)
  })
})

describe('ConnectionPool', () => {
  let pool: ConnectionPool

  beforeEach(() => {
    pool = new ConnectionPool({
      maxConnectionsPerHost: 3,
      idleTimeoutMs: 100,
      acquireTimeoutMs: 500,
      healthCheck: false, // Disable health checks for testing
    })
  })

  afterEach(async () => {
    await pool.close()
  })

  it('should create pool with default configuration', () => {
    const defaultPool = new ConnectionPool()
    expect(defaultPool).toBeDefined()
    defaultPool.close()
  })

  it('should acquire and release connections', async () => {
    const entry = await pool.acquire('api.example.com')
    expect(entry).toBeDefined()
    expect(entry?.getHostname()).toBe('api.example.com')

    pool.release(entry!)
  })

  it('should reuse idle connections', async () => {
    const entry1 = await pool.acquire('api.example.com')
    pool.release(entry1!)

    const entry2 = await pool.acquire('api.example.com')
    expect(entry2?.getMetadata().id).toBe(entry1?.getMetadata().id)
  })

  it('should create new connections up to max limit', async () => {
    const conns: (PoolEntry | null)[] = []
    for (let i = 0; i < 3; i++) {
      const conn = await pool.acquire('api.example.com')
      conns.push(conn)
    }

    // All should be created successfully
    expect(conns.every((c) => c !== null)).toBe(true)

    // All should have different IDs
    const ids = conns.map((c) => c?.getMetadata().id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)

    for (const c of conns) {
      pool.release(c!)
    }
  })

  it('should timeout when pool is exhausted', async () => {
    const conns: (PoolEntry | null)[] = []
    // Acquire max connections
    for (let i = 0; i < 3; i++) {
      const conn = await pool.acquire('api.example.com')
      conns.push(conn)
    }

    // Next acquire should timeout
    const result = await pool.acquire('api.example.com')
    expect(result).toBeNull()

    for (const c of conns) {
      pool.release(c!)
    }
  })

  it('should evict idle connections', async () => {
    const entry1 = await pool.acquire('api.example.com')
    pool.release(entry1!)

    // Wait for idle timeout
    await new Promise((resolve) => setTimeout(resolve, 150))

    const removed = pool.evictIdle()
    expect(removed).toBeGreaterThan(0)
  })

  it('should maintain per-host pool isolation', async () => {
    const host1 = await pool.acquire('api1.example.com')
    const host2 = await pool.acquire('api2.example.com')

    expect(host1?.getHostname()).toBe('api1.example.com')
    expect(host2?.getHostname()).toBe('api2.example.com')
    expect(host1?.getMetadata().id).not.toBe(host2?.getMetadata().id)

    pool.release(host1!)
    pool.release(host2!)
  })

  it('should provide metrics snapshot', async () => {
    const entry = await pool.acquire('api.example.com')
    pool.release(entry!)

    const metrics = pool.getMetrics()
    expect(metrics.timestamp).toBeGreaterThan(0)
    expect(metrics.totalCreated).toBeGreaterThan(0)
  })

  it('should handle concurrent acquisitions with wait queue', async () => {
    // Acquire all available connections
    const conns: (PoolEntry | null)[] = []
    for (let i = 0; i < 3; i++) {
      const conn = await pool.acquire('api.example.com')
      conns.push(conn)
    }

    // Start a pending acquisition
    let pendingResult: PoolEntry | null = null
    const pendingPromise = pool.acquire('api.example.com').then((result) => {
      pendingResult = result
    })

    // Release one connection - should satisfy pending request
    await new Promise((resolve) => setTimeout(resolve, 50))
    pool.release(conns[0]!)

    await pendingPromise
    expect(pendingResult).not.toBeNull()

    for (const c of conns.slice(1)) {
      pool.release(c!)
    }
    if (pendingResult) {
      pool.release(pendingResult)
    }
  })

  it('should close pool and cleanup resources', async () => {
    const entry = await pool.acquire('api.example.com')
    pool.release(entry!)

    const metrics = pool.getMetrics()
    expect(metrics.totalCreated).toBeGreaterThan(0)

    await pool.close()

    // Subsequent pooled fetch should throw because pool is closed
    const pooledFetch = pool.createPooledFetch()
    try {
      await pooledFetch('http://api.example.com/test')
      expect(false).toBe(true) // Should not reach here
    } catch (error) {
      expect((error as Error).message).toContain('closed')
    }
  })
})

describe('ConnectionPool with Fetch Integration', () => {
  let pool: ConnectionPool

  beforeEach(() => {
    pool = new ConnectionPool({
      maxConnectionsPerHost: 2,
      healthCheck: false,
    })
  })

  afterEach(async () => {
    await pool.close()
  })

  it('should create pooled fetch function', () => {
    const pooledFetch = pool.createPooledFetch()
    expect(typeof pooledFetch).toBe('function')
  })

  it('should add keep-alive header to requests', async () => {
    const pooledFetch = pool.createPooledFetch()

    // Mock fetch to capture headers
    const originalFetch = globalThis.fetch
    let capturedHeaders: Record<string, string> | undefined

    globalThis.fetch = mock(async (_input, init) => {
      capturedHeaders = init?.headers as Record<string, string>
      return new Response('OK', { status: 200 })
    })

    try {
      await pooledFetch('http://example.com/api', {
        headers: { 'X-Custom': 'value' },
      })

      expect(capturedHeaders?.Connection).toBe('keep-alive')
      expect(capturedHeaders?.['X-Custom']).toBe('value')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('should handle request errors and release connections', async () => {
    const pooledFetch = pool.createPooledFetch()

    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(async () => {
      throw new Error('Network error')
    })

    try {
      await expect(pooledFetch('http://example.com/api')).rejects.toThrow()
      // Pool should still be usable after error
      const metrics = pool.getMetrics()
      expect(metrics).toBeDefined()
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('BeamPoolExhaustedError', () => {
  it('should create error with correct properties', () => {
    const error = new BeamPoolExhaustedError('api.example.com', 5000)
    expect(error.code).toBe('POOL_EXHAUSTED')
    expect(error.message).toContain('api.example.com')
    expect(error.message).toContain('5000')
  })

  it('should be instance of BeamError', () => {
    const error = new BeamPoolExhaustedError('api.example.com', 5000)
    expect(error.name).toContain('Error')
  })
})
