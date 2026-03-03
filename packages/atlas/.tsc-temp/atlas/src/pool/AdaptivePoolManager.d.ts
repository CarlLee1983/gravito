/**
 * @gravito/atlas - Adaptive Pool Manager
 * @description Manages adaptive pool sizing based on strategies
 */
import type { ConnectionManager } from '../connection/ConnectionManager'
import type { PoolStats } from '../types'
import type { PoolStrategy } from './PoolStrategy'
export interface PoolStatsHistory {
  stats: PoolStats
  timestamp: number
}
export interface PoolAdjustmentEvent {
  connection: string
  action: 'increase' | 'decrease' | 'maintain'
  from: number
  to: number
  reason: string
}
export interface AdaptivePoolConfig {
  /**
   * Evaluation interval (ms)
   * @default 60000
   */
  evaluationInterval: number
  /**
   * Minimum cooldown period (ms) before next adjustment
   * @default 30000
   */
  cooldownPeriod: number
  /**
   * Maximum history size
   * @default 10
   */
  maxHistorySize: number
  /**
   * Callback when adjustment is made
   */
  onAdjustment?: (event: PoolAdjustmentEvent) => void
}
export declare const DEFAULT_ADAPTIVE_CONFIG: AdaptivePoolConfig
/**
 * Adaptive pool manager
 * Periodically evaluates pool statistics and adjusts size based on strategy
 */
export declare class AdaptivePoolManager {
  private connectionManager
  private strategy
  private config
  private intervalHandle?
  private statsHistory
  private adjustmentCooldown
  private lastAdjustment
  constructor(
    connectionManager: ConnectionManager,
    strategy: PoolStrategy,
    config: AdaptivePoolConfig
  )
  /**
   * Start adaptive management
   */
  start(): void
  /**
   * Stop adaptive management
   */
  stop(): void
  /**
   * Get last adjustment for a connection
   */
  getLastAdjustment(connectionName: string): PoolAdjustmentEvent | undefined
  /**
   * Get history for a connection
   */
  getHistory(connectionName: string): PoolStatsHistory[]
  /**
   * Evaluate all connection pools
   */
  private evaluateAllPools
  /**
   * Evaluate a specific pool
   */
  private evaluatePool
  /**
   * Build strategy context from current state
   */
  private buildContext
  /**
   * Update historical statistics
   */
  private updateHistory
  /**
   * Check if in cooldown period
   */
  private isInCooldown
  /**
   * Set cooldown period
   */
  private setCooldown
  /**
   * Apply adjustment to pool
   */
  private applyAdjustment
}
