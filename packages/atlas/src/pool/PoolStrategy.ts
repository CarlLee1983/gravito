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
export abstract class PoolStrategy {
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
  validateAdjustment(decision: PoolAdjustmentDecision, context: PoolStrategyContext): boolean {
    const minSize = context.config.min ?? 2
    const maxSize = context.config.max ?? 10

    // Target size must be within bounds
    if (decision.targetSize < minSize || decision.targetSize > maxSize) {
      return false
    }

    // Confidence must be meaningful
    if (decision.confidence < 0 || decision.confidence > 1) {
      return false
    }

    // Action must match target size
    const currentSize = context.stats.total
    if (decision.action === 'increase' && decision.targetSize <= currentSize) {
      return false
    }
    if (decision.action === 'decrease' && decision.targetSize >= currentSize) {
      return false
    }
    if (decision.action === 'maintain' && decision.targetSize !== currentSize) {
      return false
    }

    return true
  }

  /**
   * Protected helper: calculate utilization ratio
   */
  protected calculateUtilization(stats: PoolStats): number {
    return stats.active / stats.max
  }

  /**
   * Protected helper: calculate pending ratio
   */
  protected calculatePendingRatio(stats: PoolStats): number {
    return stats.pending / stats.max
  }

  /**
   * Protected helper: clamp value to bounds
   */
  protected clampToSize(value: number, context: PoolStrategyContext): number {
    const min = context.config.min ?? 2
    const max = context.config.max ?? 10
    return Math.max(min, Math.min(max, value))
  }
}

/**
 * Load-aware strategy: adjusts based on current utilization
 */
export class LoadAwareStrategy extends PoolStrategy {
  readonly name = 'load-aware'

  private readonly warningUtilization: number
  private readonly criticalUtilization: number
  private readonly recoveryUtilization: number

  constructor(
    config: {
      warningUtilization?: number
      criticalUtilization?: number
      recoveryUtilization?: number
    } = {}
  ) {
    super()
    this.warningUtilization = config.warningUtilization ?? 0.7
    this.criticalUtilization = config.criticalUtilization ?? 0.9
    this.recoveryUtilization = config.recoveryUtilization ?? 0.4
  }

  decide(context: PoolStrategyContext): PoolAdjustmentDecision {
    const utilization = this.calculateUtilization(context.stats)
    const pendingRatio = this.calculatePendingRatio(context.stats)
    const currentSize = context.stats.total

    // Critical: increase aggressively
    if (utilization >= this.criticalUtilization && currentSize < (context.config.max ?? 10)) {
      const targetSize = Math.ceil(currentSize * 1.5)
      return {
        action: 'increase',
        targetSize: this.clampToSize(targetSize, context),
        reason: `Critical utilization (${(utilization * 100).toFixed(1)}%) and pending (${(pendingRatio * 100).toFixed(1)}%)`,
        confidence: 0.95,
      }
    }

    // Warning: increase moderately
    if (
      (utilization >= this.warningUtilization || pendingRatio > 0.5) &&
      currentSize < (context.config.max ?? 10)
    ) {
      const targetSize = Math.ceil(currentSize * 1.2)
      return {
        action: 'increase',
        targetSize: this.clampToSize(targetSize, context),
        reason: `High utilization (${(utilization * 100).toFixed(1)}%)`,
        confidence: 0.8,
      }
    }

    // Recovery: decrease when low utilization
    if (utilization < this.recoveryUtilization && currentSize > (context.config.min ?? 2)) {
      const targetSize = Math.ceil(currentSize * 0.8)
      return {
        action: 'decrease',
        targetSize: this.clampToSize(targetSize, context),
        reason: `Low utilization (${(utilization * 100).toFixed(1)}%)`,
        confidence: 0.7,
      }
    }

    // Maintain current size
    return {
      action: 'maintain',
      targetSize: currentSize,
      reason: 'Utilization within normal range',
      confidence: 0.9,
    }
  }
}

/**
 * Predictive strategy: adjusts based on historical trends
 */
export class PredictiveStrategy extends PoolStrategy {
  readonly name = 'predictive'

  private readonly minHistorySize: number = 3

  constructor(config: { minHistorySize?: number } = {}) {
    super()
    this.minHistorySize = config.minHistorySize ?? 3
  }

  decide(context: PoolStrategyContext): PoolAdjustmentDecision {
    // Without sufficient history, maintain current size
    if (!context.history || context.history.length < this.minHistorySize) {
      return {
        action: 'maintain',
        targetSize: context.stats.total,
        reason: 'Insufficient historical data for prediction',
        confidence: 0.5,
      }
    }

    // Calculate trend (simple linear regression)
    const trend = this.calculateTrend(context.history.map((s) => s.active))
    const currentSize = context.stats.total
    const projectedLoad = context.stats.active + trend

    // Predict if we'll need more capacity
    if (projectedLoad > context.stats.max * 0.8 && currentSize < (context.config.max ?? 10)) {
      const targetSize = Math.ceil(currentSize * 1.3)
      return {
        action: 'increase',
        targetSize: this.clampToSize(targetSize, context),
        reason: `Predicted load increase (trend: ${trend.toFixed(1)} connections)`,
        confidence: 0.75,
      }
    }

    // Predict if we can reduce capacity
    if (projectedLoad < context.stats.max * 0.3 && currentSize > (context.config.min ?? 2)) {
      const targetSize = Math.floor(currentSize * 0.7)
      return {
        action: 'decrease',
        targetSize: this.clampToSize(targetSize, context),
        reason: `Predicted load decrease (trend: ${trend.toFixed(1)} connections)`,
        confidence: 0.65,
      }
    }

    return {
      action: 'maintain',
      targetSize: currentSize,
      reason: 'Trend suggests stable load',
      confidence: 0.8,
    }
  }

  /**
   * Calculate linear trend from data points
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) {
      return 0
    }

    const n = values.length
    const xBar = (n + 1) / 2
    let yBar = 0
    for (const v of values) {
      yBar += v
    }
    yBar /= n

    let numerator = 0
    let denominator = 0
    for (let i = 0; i < n; i++) {
      const x = i + 1
      const y = values[i]
      numerator += (x - xBar) * (y - yBar)
      denominator += (x - xBar) * (x - xBar)
    }

    return denominator === 0 ? 0 : numerator / denominator
  }
}

/**
 * Hybrid strategy: combines multiple strategies
 */
export class HybridStrategy extends PoolStrategy {
  readonly name = 'hybrid'

  constructor(
    private loadAware: LoadAwareStrategy,
    private predictive: PredictiveStrategy,
    private loadWeight = 0.6,
    private predictiveWeight = 0.4
  ) {
    super()
  }

  decide(context: PoolStrategyContext): PoolAdjustmentDecision {
    const loadDecision = this.loadAware.decide(context)
    const predictiveDecision = this.predictive.decide(context)

    // Combine confidence scores
    const combinedConfidence =
      loadDecision.confidence * this.loadWeight +
      predictiveDecision.confidence * this.predictiveWeight

    // If predictions agree, follow them
    if (loadDecision.action === predictiveDecision.action) {
      const avgTarget =
        (loadDecision.targetSize * this.loadWeight +
          predictiveDecision.targetSize * this.predictiveWeight) /
        (this.loadWeight + this.predictiveWeight)

      return {
        action: loadDecision.action,
        targetSize: Math.round(avgTarget),
        reason: `${loadDecision.reason} and ${predictiveDecision.reason}`,
        confidence: Math.min(1, combinedConfidence),
      }
    }

    // If load-aware is more confident, follow it
    if (loadDecision.confidence >= predictiveDecision.confidence) {
      return loadDecision
    }

    return predictiveDecision
  }
}

/**
 * Create default strategies for pool management
 */
export function createDefaultStrategies(): {
  loadAware: LoadAwareStrategy
  predictive: PredictiveStrategy
  hybrid: HybridStrategy
} {
  const loadAware = new LoadAwareStrategy()
  const predictive = new PredictiveStrategy()
  const hybrid = new HybridStrategy(loadAware, predictive)

  return { loadAware, predictive, hybrid }
}
