import type { RippleServer } from '../RippleServer'
import type { RippleDriver } from '../types'

/**
 * Health status levels for individual components or the overall system.
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

/**
 * Health information for a specific system component.
 */
export interface ComponentHealth {
  /** Current health status */
  status: HealthStatus
  /** Descriptive message about the health state */
  message?: string
  /** ISO 8601 timestamp of the last check */
  lastCheck: string
}

/**
 * Result of a system-wide health check.
 */
export interface HealthCheckResult {
  /** Overall system health status */
  status: HealthStatus
  /** ISO 8601 timestamp of the check */
  timestamp: string
  /** Server uptime in milliseconds */
  uptime: number
  /** Health status of individual components */
  checks: {
    /** WebSocket server health */
    websocket: ComponentHealth
    /** Message distribution driver health */
    driver: ComponentHealth
  }
  /** Real-time performance statistics */
  stats: {
    /** Current number of active client connections */
    activeConnections: number
    /** Total number of active channels */
    totalChannels: number
    /** Average message throughput (messages per second) */
    messagesPerSecond: number
  }
}

/**
 * HealthChecker monitors the Ripple server and its driver.
 *
 * It provides real-time health diagnostics, performance metrics (MPS),
 * and tracks server uptime.
 */
export class HealthChecker {
  private startTime = Date.now()
  private messageCount = 0
  private lastMessageCountReset = Date.now()

  /**
   * Create a new HealthChecker.
   *
   * @param server - The Ripple server instance to monitor
   * @param driver - The message driver instance to monitor
   */
  constructor(
    private readonly server: RippleServer,
    private readonly driver: RippleDriver
  ) {}

  /**
   * Record a message being processed.
   *
   * Used to calculate messages-per-second (MPS) metrics.
   */
  recordMessage(): void {
    this.messageCount++
  }

  /**
   * Perform a full system health check.
   *
   * Resets the message counter and calculates MPS since the last check.
   *
   * @returns Detailed health check result
   */
  async check(): Promise<HealthCheckResult> {
    const now = new Date()
    const driverHealth = await this.checkDriver()
    const websocketHealth = this.checkWebSocket()

    const overallStatus = this.determineOverallStatus([driverHealth.status, websocketHealth.status])

    const elapsed = (Date.now() - this.lastMessageCountReset) / 1000
    const messagesPerSecond = elapsed > 0 ? this.messageCount / elapsed : 0

    this.messageCount = 0
    this.lastMessageCountReset = Date.now()

    const stats = this.server.getStats()

    return {
      status: overallStatus,
      timestamp: now.toISOString(),
      uptime: Date.now() - this.startTime,
      checks: {
        websocket: websocketHealth,
        driver: driverHealth,
      },
      stats: {
        activeConnections: stats.totalClients,
        totalChannels: stats.totalChannels,
        messagesPerSecond: Math.round(messagesPerSecond * 100) / 100,
      },
    }
  }

  /**
   * Check the health of the WebSocket server layer.
   */
  private checkWebSocket(): ComponentHealth {
    try {
      const stats = this.server.getStats()
      return {
        status: 'healthy',
        message: `${stats.totalClients} active connections`,
        lastCheck: new Date().toISOString(),
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString(),
      }
    }
  }

  /**
   * Check the health of the message distribution driver.
   */
  private async checkDriver(): Promise<ComponentHealth> {
    try {
      if ('isInitialized' in this.driver && !this.driver.isInitialized) {
        return {
          status: 'unhealthy',
          message: 'Driver not initialized',
          lastCheck: new Date().toISOString(),
        }
      }

      return {
        status: 'healthy',
        message: `${this.driver.name} driver operational`,
        lastCheck: new Date().toISOString(),
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString(),
      }
    }
  }

  /**
   * Determine the overall status based on component statuses.
   *
   * @param statuses - Array of component health statuses
   * @returns The most severe status found
   */
  private determineOverallStatus(statuses: HealthStatus[]): HealthStatus {
    if (statuses.includes('unhealthy')) {
      return 'unhealthy'
    }
    if (statuses.includes('degraded')) {
      return 'degraded'
    }
    return 'healthy'
  }
}
