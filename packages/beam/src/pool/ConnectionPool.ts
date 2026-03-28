/**
 * @fileoverview Core connection pool implementation
 * @module @gravito/beam/pool
 */

import { randomUUID } from 'node:crypto'
import { BeamError, BeamErrorCodes, BeamPoolExhaustedError } from '../errors'
import { PoolEntry } from './PoolEntry'
import { PoolHealthChecker } from './PoolHealthChecker'
import { PoolMetricsCollector } from './PoolMetrics'
import type { ConnectionPoolConfig, PoolMetricsSnapshot } from './types'

interface WaitingRequest {
  promise: Promise<PoolEntry | null>
  resolve: (entry: PoolEntry | null) => void
  reject: (err: unknown) => void
}

interface HostPool {
  config: Required<ConnectionPoolConfig>
  idle: PoolEntry[]
  active: Set<PoolEntry>
  waiting: WaitingRequest[]
}

/**
 * Connection pool for managing HTTP connections
 *
 * Manages per-host connection pools with keep-alive support, health checks,
 * and metrics collection. Reduces overhead of TCP handshakes and TLS negotiation.
 */
export class ConnectionPool {
  private pools = new Map<string, HostPool>()
  private config: Required<ConnectionPoolConfig>
  private healthChecker: PoolHealthChecker | null = null
  private metrics: PoolMetricsCollector
  private closed = false

  /**
   * Create a connection pool
   *
   * @param config - Pool configuration options
   */
  constructor(config: ConnectionPoolConfig = {}) {
    this.config = {
      maxConnectionsPerHost: config.maxConnectionsPerHost ?? 6,
      minIdlePerHost: config.minIdlePerHost ?? 0,
      idleTimeoutMs: config.idleTimeoutMs ?? 30000,
      maxLifetimeMs: config.maxLifetimeMs ?? 300000,
      acquireTimeoutMs: config.acquireTimeoutMs ?? 5000,
      healthCheck: config.healthCheck ?? true,
      healthCheckIntervalMs: config.healthCheckIntervalMs ?? 60000,
      metrics: config.metrics ?? false,
    }

    this.metrics = new PoolMetricsCollector()

    if (this.config.healthCheck) {
      this.healthChecker = new PoolHealthChecker(
        () => this.performHealthCheck(),
        this.config.healthCheckIntervalMs
      )
      this.healthChecker.start()
    }
  }

  /**
   * Create a fetch function with connection pooling
   *
   * Returns a fetch-compatible function that acquires connections
   * from the pool before making requests.
   */
  createPooledFetch(
    executeFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = (
      input,
      init
    ) => fetch(input, init)
  ): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      if (this.closed) {
        throw new BeamError('Connection pool has been closed', 503, BeamErrorCodes.POOL_CLOSED)
      }

      // Extract hostname from input URL
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const hostname = new URL(url).hostname

      // Acquire a connection from pool
      const entry = await this.acquire(hostname)
      if (!entry) {
        throw new BeamPoolExhaustedError(hostname, this.config.acquireTimeoutMs)
      }

      try {
        // Use keep-alive header to reuse connection
        const headers = {
          ...((init?.headers as Record<string, string>) ?? {}),
          Connection: 'keep-alive',
        }

        const response = await executeFetch(input, {
          ...init,
          headers,
        })

        return response
      } finally {
        // Release connection back to pool
        this.release(entry)
      }
    }
  }

  /**
   * Acquire a connection for the given hostname
   *
   * Attempts to reuse an idle connection. If none available and pool
   * not at max capacity, creates a new connection. Otherwise, waits
   * for one to become available.
   *
   * @param hostname - Hostname to acquire connection for
   * @returns Connection entry, or null if acquisition timeout
   */
  async acquire(hostname: string): Promise<PoolEntry | null> {
    const pool = this.ensurePool(hostname)
    const startTime = Date.now()

    // Try to get an idle connection
    let entry: PoolEntry | null = null
    while (pool.idle.length > 0) {
      const candidate = pool.idle.shift()
      if (candidate?.isHealthy()) {
        entry = candidate
        break
      }
    }

    // If no idle connection, try to create a new one
    if (!entry && pool.active.size < pool.config.maxConnectionsPerHost) {
      entry = new PoolEntry(randomUUID(), hostname)
      this.metrics.recordCreate(hostname)
    }

    // If still no connection, wait for one to become available
    if (!entry) {
      const result = await this.waitForConnection(hostname, pool)
      if (!result) {
        this.metrics.recordTimeout(hostname)
        return null
      }
      entry = result
    }

    // Mark as active and record metrics
    entry.markActive()
    pool.active.add(entry)

    const duration = Date.now() - startTime
    const isReused = entry.getMetadata().useCount > 1
    this.metrics.recordAcquire(hostname, duration, isReused)
    this.updateMetrics(hostname, pool)

    return entry
  }

  /**
   * Release a connection back to the pool
   *
   * Connection is marked as idle and can be reused. If connection
   * has exceeded max lifetime, it's destroyed instead.
   */
  release(entry: PoolEntry): void {
    const hostname = entry.getHostname()
    const pool = this.pools.get(hostname)

    if (!pool) {
      return
    }

    pool.active.delete(entry)

    // Check if connection should be kept or destroyed
    if (entry.isExpired(pool.config.maxLifetimeMs)) {
      this.metrics.recordDestroy(hostname)
    } else {
      entry.markIdle()
      pool.idle.push(entry)

      // Process waiting requests
      if (pool.waiting.length > 0) {
        const waiter = pool.waiting.shift()
        if (waiter) {
          waiter.resolve(entry)
          pool.active.add(entry)
          entry.markActive()
        }
      }
    }

    this.updateMetrics(hostname, pool)
  }

  /**
   * Get metrics snapshot
   *
   * @returns Immutable metrics snapshot
   */
  getMetrics(): PoolMetricsSnapshot {
    return this.metrics.getSnapshot()
  }

  /**
   * Evict idle connections from all pools
   *
   * @returns Number of connections removed
   */
  evictIdle(): number {
    let removed = 0

    for (const pool of this.pools.values()) {
      const before = pool.idle.length
      pool.idle = pool.idle.filter((entry) => {
        if (entry.isIdleTooLong(pool.config.idleTimeoutMs)) {
          this.metrics.recordDestroy(entry.getHostname())
          return false
        }
        return true
      })
      removed += before - pool.idle.length
    }

    return removed
  }

  /**
   * Perform health check on all pools
   *
   * @returns Number of connections removed
   */
  private performHealthCheck(): number {
    let removed = 0

    for (const [hostname, pool] of this.pools) {
      // Remove idle connections older than maxLifetime
      const before = pool.idle.length
      pool.idle = pool.idle.filter((entry) => {
        if (entry.isExpired(pool.config.maxLifetimeMs)) {
          this.metrics.recordDestroy(hostname)
          return false
        }
        return true
      })
      removed += before - pool.idle.length

      // Ensure minimum idle connections
      while (pool.idle.length < pool.config.minIdlePerHost) {
        const entry = new PoolEntry(randomUUID(), hostname)
        pool.idle.push(entry)
        this.metrics.recordCreate(hostname)
      }

      this.updateMetrics(hostname, pool)
    }

    return removed
  }

  /**
   * Close the pool and release all connections
   */
  async close(): Promise<void> {
    this.closed = true

    if (this.healthChecker) {
      this.healthChecker.stop()
    }

    for (const pool of this.pools.values()) {
      pool.idle = []
      pool.active.clear()
      pool.waiting = []
    }

    this.pools.clear()
  }

  /**
   * Wait for a connection to become available
   */
  private async waitForConnection(_hostname: string, pool: HostPool): Promise<PoolEntry | null> {
    let resolveConn: ((entry: PoolEntry | null) => void) | null = null
    let rejectConn: ((err: unknown) => void) | null = null

    const promise = new Promise<PoolEntry | null>((resolve, reject) => {
      resolveConn = resolve
      rejectConn = reject
    })

    const timeoutId = setTimeout(() => {
      const index = pool.waiting.findIndex((w) => w.promise === promise)
      if (index >= 0) {
        pool.waiting.splice(index, 1)
      }
      if (resolveConn) {
        resolveConn(null)
      }
    }, pool.config.acquireTimeoutMs)

    const waiter: WaitingRequest = {
      promise,
      resolve: (entry: PoolEntry | null) => {
        clearTimeout(timeoutId)
        if (resolveConn) {
          resolveConn(entry)
        }
      },
      reject: (err: unknown) => {
        clearTimeout(timeoutId)
        if (rejectConn) {
          rejectConn(err)
        }
      },
    }

    pool.waiting.push(waiter)

    return promise
  }

  /**
   * Ensure a pool exists for the given hostname
   */
  private ensurePool(hostname: string): HostPool {
    if (!this.pools.has(hostname)) {
      const pool: HostPool = {
        config: this.config,
        idle: [],
        active: new Set(),
        waiting: [],
      }
      this.pools.set(hostname, pool)
      this.updateMetrics(hostname, pool)
    }
    const pool = this.pools.get(hostname)
    if (!pool) {
      throw new BeamError(`No pool found for hostname: ${hostname}`, 503, BeamErrorCodes.NO_POOL)
    }
    return pool
  }

  /**
   * Update metrics for a pool
   */
  private updateMetrics(hostname: string, pool: HostPool): void {
    this.metrics.setActiveConnections(hostname, pool.active.size)
    this.metrics.setIdleConnections(hostname, pool.idle.length)
    this.metrics.setWaitingRequests(hostname, pool.waiting.length)
    this.metrics.setMaxConnections(hostname, pool.config.maxConnectionsPerHost)
  }
}
