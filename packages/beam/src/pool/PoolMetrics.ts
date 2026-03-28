/**
 * @fileoverview Pool metrics collection and snapshot generation
 * @module @gravito/beam/pool
 */

import { BeamError, BeamErrorCodes } from '../errors'
import type { HostPoolMetrics, PoolMetricsSnapshot } from './types'

/**
 * Metrics collector for connection pool operations
 *
 * Tracks acquisition times, reuse counts, creation/destruction events,
 * and timeouts. Provides immutable snapshots for analysis.
 */
export class PoolMetricsCollector {
  private totalCreated = 0
  private totalDestroyed = 0
  private totalReused = 0
  private acquireTimes: number[] = []
  private hostMetrics = new Map<
    string,
    {
      active: number
      idle: number
      waiting: number
      maxConnections: number
    }
  >()

  /**
   * Record a connection acquisition event
   *
   * @param hostname - Hostname for which connection was acquired
   * @param durationMs - Time taken to acquire the connection
   * @param reused - Whether this was a reused connection
   */
  recordAcquire(_hostname: string, durationMs: number, reused: boolean): void {
    this.acquireTimes.push(durationMs)
    // Keep only last 1000 samples to prevent unbounded growth
    if (this.acquireTimes.length > 1000) {
      this.acquireTimes.shift()
    }

    if (reused) {
      this.totalReused++
    }
  }

  /**
   * Record a connection creation event
   *
   * @param hostname - Hostname for which connection was created
   */
  recordCreate(hostname: string): void {
    this.totalCreated++
    this.ensureHostMetrics(hostname)
  }

  /**
   * Record a connection destruction event
   *
   * @param hostname - Hostname for which connection was destroyed
   */
  recordDestroy(_hostname: string): void {
    this.totalDestroyed++
  }

  /**
   * Record a connection timeout event
   *
   * @param hostname - Hostname where timeout occurred
   */
  recordTimeout(_hostname: string): void {
    // Timeout recorded but metrics not explicitly tracked (only in acquire totals)
  }

  /**
   * Update active connections for a hostname
   */
  setActiveConnections(hostname: string, count: number): void {
    const metrics = this.ensureHostMetrics(hostname)
    metrics.active = count
  }

  /**
   * Update idle connections for a hostname
   */
  setIdleConnections(hostname: string, count: number): void {
    const metrics = this.ensureHostMetrics(hostname)
    metrics.idle = count
  }

  /**
   * Update waiting requests for a hostname
   */
  setWaitingRequests(hostname: string, count: number): void {
    const metrics = this.ensureHostMetrics(hostname)
    metrics.waiting = count
  }

  /**
   * Set max connections for a hostname
   */
  setMaxConnections(hostname: string, max: number): void {
    const metrics = this.ensureHostMetrics(hostname)
    metrics.maxConnections = max
  }

  /**
   * Get immutable metrics snapshot
   */
  getSnapshot(): PoolMetricsSnapshot {
    const byHost = new Map<string, HostPoolMetrics>()

    for (const [hostname, metrics] of this.hostMetrics) {
      byHost.set(hostname, {
        hostname,
        active: metrics.active,
        idle: metrics.idle,
        waiting: metrics.waiting,
        maxConnections: metrics.maxConnections,
      })
    }

    const totalActive = Array.from(this.hostMetrics.values()).reduce((sum, m) => sum + m.active, 0)
    const totalIdle = Array.from(this.hostMetrics.values()).reduce((sum, m) => sum + m.idle, 0)
    const totalWaiting = Array.from(this.hostMetrics.values()).reduce(
      (sum, m) => sum + m.waiting,
      0
    )

    const reuseRate = this.totalCreated > 0 ? this.totalReused / this.totalCreated : 0

    const avgAcquireTimeMs =
      this.acquireTimes.length > 0
        ? this.acquireTimes.reduce((a, b) => a + b, 0) / this.acquireTimes.length
        : 0

    return {
      timestamp: Date.now(),
      totalActive,
      totalIdle,
      totalWaiting,
      totalCreated: this.totalCreated,
      totalDestroyed: this.totalDestroyed,
      totalReused: this.totalReused,
      reuseRate,
      avgAcquireTimeMs,
      byHost,
    }
  }

  /**
   * Reset all metrics to zero
   */
  reset(): void {
    this.totalCreated = 0
    this.totalDestroyed = 0
    this.totalReused = 0
    this.acquireTimes = []
    this.hostMetrics.clear()
  }

  /**
   * Ensure host metrics exist, creating if necessary
   */
  private ensureHostMetrics(hostname: string) {
    if (!this.hostMetrics.has(hostname)) {
      this.hostMetrics.set(hostname, {
        active: 0,
        idle: 0,
        waiting: 0,
        maxConnections: 0,
      })
    }
    const metrics = this.hostMetrics.get(hostname)
    if (!metrics) {
      throw new BeamError(
        `No metrics found for hostname: ${hostname}`,
        503,
        BeamErrorCodes.NO_METRICS
      )
    }
    return metrics
  }
}
