/**
 * @gravito/atlas - Adaptive Pool Manager
 * @description Manages adaptive pool sizing based on strategies
 */

import type { ConnectionManager } from '../connection/ConnectionManager'
import type { ConnectionConfig, PoolStats } from '../types'
import type { PoolAdjustmentDecision, PoolStrategy } from './PoolStrategy'

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

export const DEFAULT_ADAPTIVE_CONFIG: AdaptivePoolConfig = {
  evaluationInterval: 60000,
  cooldownPeriod: 30000,
  maxHistorySize: 10,
}

/**
 * Adaptive pool manager
 * Periodically evaluates pool statistics and adjusts size based on strategy
 */
export class AdaptivePoolManager {
  private intervalHandle?: ReturnType<typeof setInterval>
  private statsHistory = new Map<string, PoolStatsHistory[]>()
  private adjustmentCooldown = new Map<string, number>()
  private lastAdjustment = new Map<string, PoolAdjustmentEvent>()

  constructor(
    private connectionManager: ConnectionManager,
    private strategy: PoolStrategy,
    private config: AdaptivePoolConfig
  ) {}

  /**
   * Start adaptive management
   */
  start(): void {
    if (this.intervalHandle) {
      return
    }

    this.intervalHandle = setInterval(() => {
      this.evaluateAllPools()
    }, this.config.evaluationInterval)

    // Unref so it doesn't keep process alive
    if (this.intervalHandle?.unref) {
      this.intervalHandle.unref()
    }
  }

  /**
   * Stop adaptive management
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle)
      this.intervalHandle = undefined
    }
  }

  /**
   * Get last adjustment for a connection
   */
  getLastAdjustment(connectionName: string): PoolAdjustmentEvent | undefined {
    return this.lastAdjustment.get(connectionName)
  }

  /**
   * Get history for a connection
   */
  getHistory(connectionName: string): PoolStatsHistory[] {
    return this.statsHistory.get(connectionName) ?? []
  }

  /**
   * Evaluate all connection pools
   */
  private async evaluateAllPools(): Promise<void> {
    const connectionNames = this.connectionManager.getConnectionNames()

    for (const name of connectionNames) {
      try {
        await this.evaluatePool(name)
      } catch (error) {
        console.warn(`Failed to evaluate pool "${name}":`, error)
      }
    }
  }

  /**
   * Evaluate a specific pool
   */
  private async evaluatePool(connectionName: string): Promise<void> {
    const connection = this.connectionManager.connection(connectionName)
    const driver = connection.getDriver()
    const stats = driver.getPoolStats?.()

    if (!stats) {
      return // Driver doesn't support pool statistics
    }

    // Update history
    this.updateHistory(connectionName, stats)

    // Check cooldown
    if (this.isInCooldown(connectionName)) {
      return
    }

    // Get strategy decision
    const context = this.buildContext(connectionName, stats)
    const decision = this.strategy.decide(context)

    // Validate decision
    if (!this.strategy.validateAdjustment(decision, context)) {
      return
    }

    // Skip if no action needed
    if (decision.action === 'maintain') {
      return
    }

    // Apply adjustment
    await this.applyAdjustment(connectionName, decision)
  }

  /**
   * Build strategy context from current state
   */
  private buildContext(connectionName: string, stats: PoolStats) {
    const history = this.getHistory(connectionName).map((h) => h.stats)
    const connection = this.connectionManager.connection(connectionName)
    const config: ConnectionConfig = connection.getConfig()
    const poolConfig = 'pool' in config ? config.pool : undefined

    return {
      stats,
      history,
      config: {
        min: poolConfig?.min,
        max: poolConfig?.max,
      },
      connectionName,
    }
  }

  /**
   * Update historical statistics
   */
  private updateHistory(connectionName: string, stats: PoolStats): void {
    if (!this.statsHistory.has(connectionName)) {
      this.statsHistory.set(connectionName, [])
    }

    const history = this.statsHistory.get(connectionName)!
    history.push({
      stats,
      timestamp: Date.now(),
    })

    // Trim to max size
    if (history.length > this.config.maxHistorySize) {
      history.shift()
    }
  }

  /**
   * Check if in cooldown period
   */
  private isInCooldown(connectionName: string): boolean {
    const cooldownUntil = this.adjustmentCooldown.get(connectionName)
    if (!cooldownUntil) {
      return false
    }

    const now = Date.now()
    if (now >= cooldownUntil) {
      this.adjustmentCooldown.delete(connectionName)
      return false
    }

    return true
  }

  /**
   * Set cooldown period
   */
  private setCooldown(connectionName: string): void {
    this.adjustmentCooldown.set(connectionName, Date.now() + this.config.cooldownPeriod)
  }

  /**
   * Apply adjustment to pool
   */
  private async applyAdjustment(
    connectionName: string,
    decision: PoolAdjustmentDecision
  ): Promise<void> {
    const connection = this.connectionManager.connection(connectionName)
    const driver = connection.getDriver()
    const currentStats = driver.getPoolStats?.()

    if (!currentStats) {
      return
    }

    // Try to adjust pool size (if driver supports it)
    if (typeof driver.adjustPoolSize === 'function') {
      try {
        await driver.adjustPoolSize(decision.targetSize)

        // Record adjustment
        const event: PoolAdjustmentEvent = {
          connection: connectionName,
          action: decision.action,
          from: currentStats.total,
          to: decision.targetSize,
          reason: decision.reason,
        }

        this.lastAdjustment.set(connectionName, event)
        this.config.onAdjustment?.(event)

        // Set cooldown to prevent rapid adjustments
        this.setCooldown(connectionName)
      } catch (error) {
        console.warn(
          `Failed to adjust pool size for "${connectionName}":`,
          error instanceof Error ? error.message : error
        )
      }
    }
  }
}
