/**
 * @gravito/atlas - Pool Strategy Engine
 * @description Strategies for adaptive connection pool management
 */
import type { PoolStats } from '../types'
/**
 * Pool strategy decision result
 */
export interface PoolAdjustmentDecision {
  /**
   * Action to take: 'increase' | 'decrease' | 'maintain'
   */
  action: 'increase' | 'decrease' | 'maintain'
  /**
   * Target pool size
   */
  targetSize: number
  /**
   * Reason for the decision
   */
  reason: string
  /**
   * Confidence level (0-1)
   */
  confidence: number
}
/**
 * Strategy context for decision making
 */
export interface PoolStrategyContext {
  /**
   * Current pool statistics
   */
  stats: PoolStats
  /**
   * Historical statistics (if available)
   */
  history?: PoolStats[]
  /**
   * Pool configuration
   */
  config: {
    min?: number
    max?: number
  }
  /**
   * Connection name
   */
  connectionName: string
}
/**
 * Abstract base class for pool adjustment strategies
 */
export declare abstract class PoolStrategy {
  /**
   * Strategy name
   */
  abstract readonly name: string
  /**
   * Make an adjustment decision based on pool context
   */
  abstract decide(context: PoolStrategyContext): PoolAdjustmentDecision
  /**
   * Validate if an adjustment decision is acceptable
   */
  validateAdjustment(decision: PoolAdjustmentDecision, context: PoolStrategyContext): boolean
  /**
   * Protected helper: calculate utilization ratio
   */
  protected calculateUtilization(stats: PoolStats): number
  /**
   * Protected helper: calculate pending ratio
   */
  protected calculatePendingRatio(stats: PoolStats): number
  /**
   * Protected helper: clamp value to bounds
   */
  protected clampToSize(value: number, context: PoolStrategyContext): number
}
/**
 * Load-aware strategy: adjusts based on current utilization
 */
export declare class LoadAwareStrategy extends PoolStrategy {
  readonly name = 'load-aware'
  private readonly warningUtilization
  private readonly criticalUtilization
  private readonly recoveryUtilization
  constructor(config?: {
    warningUtilization?: number
    criticalUtilization?: number
    recoveryUtilization?: number
  })
  decide(context: PoolStrategyContext): PoolAdjustmentDecision
}
/**
 * Predictive strategy: adjusts based on historical trends
 */
export declare class PredictiveStrategy extends PoolStrategy {
  readonly name = 'predictive'
  private readonly minHistorySize
  constructor(config?: {
    minHistorySize?: number
  })
  decide(context: PoolStrategyContext): PoolAdjustmentDecision
  /**
   * Calculate linear trend from data points
   */
  private calculateTrend
}
/**
 * Hybrid strategy: combines multiple strategies
 */
export declare class HybridStrategy extends PoolStrategy {
  private loadAware
  private predictive
  private loadWeight
  private predictiveWeight
  readonly name = 'hybrid'
  constructor(
    loadAware: LoadAwareStrategy,
    predictive: PredictiveStrategy,
    loadWeight?: number,
    predictiveWeight?: number
  )
  decide(context: PoolStrategyContext): PoolAdjustmentDecision
}
/**
 * Create default strategies for pool management
 */
export declare function createDefaultStrategies(): {
  loadAware: LoadAwareStrategy
  predictive: PredictiveStrategy
  hybrid: HybridStrategy
}
