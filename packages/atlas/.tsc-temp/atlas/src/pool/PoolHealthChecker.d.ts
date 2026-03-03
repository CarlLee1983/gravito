/**
 * @gravito/atlas - Connection Pool Health Checker
 * @description Monitors connection pool health and triggers callbacks on state changes
 */
import type { ConnectionManager } from '../connection/ConnectionManager'
import type { PoolHealth } from '../types'
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
export declare const DEFAULT_HEALTH_CHECK_CONFIG: PoolHealthCheckConfig
/**
 * Connection pool health checker
 * Periodically monitors pool health and triggers callbacks
 */
export declare class PoolHealthChecker {
  private connectionManager
  private config
  private intervalHandle?
  private lastHealthStatus
  constructor(connectionManager: ConnectionManager, config: PoolHealthCheckConfig)
  /**
   * Start health checking
   */
  start(): void
  /**
   * Stop health checking
   */
  stop(): void
  /**
   * Get current health status for a specific connection
   */
  getHealthStatus(connectionName?: string): PoolHealth | Map<string, PoolHealth>
  /**
   * Check health of all connections
   */
  private checkAllConnections
  /**
   * Check health of a specific connection
   */
  private checkConnection
  /**
   * Evaluate pool health based on statistics
   */
  private evaluateHealth
  /**
   * Test connection availability
   */
  private testConnectionAvailability
}
