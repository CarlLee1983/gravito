import type { RippleServer } from '../RippleServer'
import type { RippleDriver } from '../types'

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface ComponentHealth {
  status: HealthStatus
  message?: string
  lastCheck: string
}

export interface HealthCheckResult {
  status: HealthStatus
  timestamp: string
  uptime: number
  checks: {
    websocket: ComponentHealth
    driver: ComponentHealth
  }
  stats: {
    activeConnections: number
    totalChannels: number
    messagesPerSecond: number
  }
}

export class HealthChecker {
  private startTime = Date.now()
  private messageCount = 0
  private lastMessageCountReset = Date.now()

  constructor(
    private readonly server: RippleServer,
    private readonly driver: RippleDriver
  ) {}

  recordMessage(): void {
    this.messageCount++
  }

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

  private determineOverallStatus(statuses: HealthStatus[]): HealthStatus {
    if (statuses.includes('unhealthy')) return 'unhealthy'
    if (statuses.includes('degraded')) return 'degraded'
    return 'healthy'
  }
}
