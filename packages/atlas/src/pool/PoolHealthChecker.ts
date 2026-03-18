/**
 * @gravito/atlas - Connection Pool Health Checker
 * @description Monitors connection pool health and triggers callbacks on state changes
 */

import type { ConnectionManager } from '../connection/ConnectionManager'
import type { PoolHealth, PoolStats } from '../types'

export interface PoolHealthCheckConfig {
  /**
   * Interval (ms) to check pool health
   * @default 30000 (30 seconds)
   */
  checkInterval: number

  /**
   * Health status thresholds
   */
  thresholds: {
    /**
     * Utilization ratio (0-1) to trigger warning
     * @default 0.7
     */
    warningUtilization: number

    /**
     * Utilization ratio (0-1) to trigger critical
     * @default 0.9
     */
    criticalUtilization: number

    /**
     * Pending ratio (0-1) to trigger warning
     * @default 0.5
     */
    maxPendingRatio: number
  }

  /**
   * Whether to test connection availability during health check
   * @default true
   */
  enableConnectionTest: boolean

  /**
   * Timeout (ms) for connection test
   * @default 5000
   */
  connectionTestTimeout: number

  /**
   * Callback when health status changes
   */
  onHealthChange?: (connectionName: string, health: PoolHealth) => void

  /**
   * Callback when pool health becomes critical
   */
  onCritical?: (connectionName: string, health: PoolHealth) => void
}

export const DEFAULT_HEALTH_CHECK_CONFIG: PoolHealthCheckConfig = {
  checkInterval: 30000,
  thresholds: {
    warningUtilization: 0.7,
    criticalUtilization: 0.9,
    maxPendingRatio: 0.5,
  },
  enableConnectionTest: true,
  connectionTestTimeout: 5000,
}

/**
 * Connection pool health checker
 * Periodically monitors pool health and triggers callbacks
 */
export class PoolHealthChecker {
  private intervalHandle?: ReturnType<typeof setInterval>
  private lastHealthStatus = new Map<string, PoolHealth>()

  constructor(
    private connectionManager: ConnectionManager,
    private config: PoolHealthCheckConfig
  ) {}

  /**
   * Start health checking
   */
  start(): void {
    if (this.intervalHandle) {
      return
    }

    this.intervalHandle = setInterval(() => {
      this.checkAllConnections()
    }, this.config.checkInterval)
    this.intervalHandle.unref?.()

    // Check immediately
    this.checkAllConnections()
  }

  /**
   * Stop health checking
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle)
      this.intervalHandle = undefined
    }
  }

  /**
   * Get current health status for a specific connection
   */
  getHealthStatus(connectionName?: string): PoolHealth | Map<string, PoolHealth> {
    if (connectionName) {
      return (
        this.lastHealthStatus.get(connectionName) ?? {
          status: 'disconnected',
          message: 'Connection not found',
        }
      )
    }

    return new Map(this.lastHealthStatus)
  }

  /**
   * Check health of all connections
   */
  private async checkAllConnections(): Promise<void> {
    const connectionNames = this.connectionManager.getConnectionNames()

    for (const name of connectionNames) {
      try {
        await this.checkConnection(name)
      } catch (error) {
        console.warn(`Health check failed for connection "${name}":`, error)
      }
    }
  }

  /**
   * Check health of a specific connection
   */
  private async checkConnection(connectionName: string): Promise<void> {
    const connection = this.connectionManager.connection(connectionName)
    const driver = connection.getDriver()

    // Get pool stats
    const stats = driver.getPoolStats?.()
    if (!stats) {
      return // Driver doesn't support pool statistics
    }

    // Evaluate health
    const health = this.evaluateHealth(connectionName, stats)

    // Check for state changes
    const lastHealth = this.lastHealthStatus.get(connectionName)
    if (!lastHealth || lastHealth.status !== health.status) {
      this.config.onHealthChange?.(connectionName, health)

      if (health.status === 'critical') {
        this.config.onCritical?.(connectionName, health)
      }
    }

    // Store current status
    this.lastHealthStatus.set(connectionName, health)

    // Optional: Test connection availability
    if (this.config.enableConnectionTest && stats.total > 0) {
      await this.testConnectionAvailability(connectionName)
    }
  }

  /**
   * Evaluate pool health based on statistics
   */
  private evaluateHealth(connectionName: string, stats: PoolStats): PoolHealth {
    const utilization = stats.active / stats.max
    const pendingRatio = stats.pending / stats.max

    if (utilization >= this.config.thresholds.criticalUtilization) {
      return {
        status: 'critical',
        message: `Pool "${connectionName}" utilization critical: ${(utilization * 100).toFixed(1)}%`,
        stats,
        lastCheck: new Date(),
      }
    }

    if (
      utilization >= this.config.thresholds.warningUtilization ||
      pendingRatio > this.config.thresholds.maxPendingRatio
    ) {
      return {
        status: 'warning',
        message: `Pool "${connectionName}" utilization high: ${(utilization * 100).toFixed(1)}%`,
        stats,
        lastCheck: new Date(),
      }
    }

    return {
      status: 'healthy',
      message: `Pool "${connectionName}" operating normally`,
      stats,
      lastCheck: new Date(),
    }
  }

  /**
   * Test connection availability
   */
  private async testConnectionAvailability(connectionName: string): Promise<void> {
    try {
      const connection = this.connectionManager.connection(connectionName)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.config.connectionTestTimeout)
      timeout.unref?.()

      try {
        await Promise.race([
          connection.raw('SELECT 1'),
          new Promise((_, reject) =>
            controller.signal.addEventListener('abort', () => reject(new Error('Test timeout')))
          ),
        ])
      } finally {
        clearTimeout(timeout)
      }
    } catch (error) {
      // Log connection test failure but don't fail the health check
      console.warn(`Connection test failed for "${connectionName}":`, error)
    }
  }
}
