/**
 * @gravito/core - Flow Control Strategies
 *
 * Implements various flow control strategies for backpressure management.
 * Strategies can be composed to create flexible backpressure policies.
 *
 * 流控策略：支援多種組合策略進行靈活的背壓管理。
 */

import {
  type BackpressureConfig,
  type BackpressureDecision,
  BackpressureState,
} from './BackpressureManager'

/**
 * 流控評估上下文。
 *
 * @public
 */
export interface FlowControlContext {
  /** 當前背壓狀態 */
  state: BackpressureState
  /** 事件優先級 */
  priority: 'high' | 'normal' | 'low'
  /** 總隊列深度 */
  totalDepth: number
  /** 分優先級隊列深度 */
  depthByPriority: { high: number; normal: number; low: number }
  /** 當前入隊速率（events/sec） */
  currentRate: number
  /** 配置 */
  config: Omit<BackpressureConfig, 'onRejected' | 'onStateChange'>
}

/**
 * 流控策略介面。
 *
 * @public
 */
export interface FlowControlStrategy {
  /** 策略名稱 */
  readonly name: string
  /** 評估是否應該限制此事件 */
  evaluate(context: FlowControlContext): BackpressureDecision
}

/**
 * 隊列深度策略。
 *
 * 根據總隊列深度和分優先級隊列深度決定是否限制事件入隊。
 */
export class QueueDepthStrategy implements FlowControlStrategy {
  readonly name = 'QueueDepth'

  evaluate(context: FlowControlContext): BackpressureDecision {
    const config = context.config
    const maxSize = config.maxQueueSize || Number.POSITIVE_INFINITY
    const maxSizeByPriority = config.maxSizeByPriority || {}

    // 檢查總隊列深度
    if (context.totalDepth >= maxSize) {
      return {
        allowed: false,
        reason: 'Total queue depth limit reached',
      }
    }

    // 檢查分優先級隊列深度
    const maxForPriority = maxSizeByPriority[context.priority] || Number.POSITIVE_INFINITY
    if (context.depthByPriority[context.priority] >= maxForPriority) {
      return {
        allowed: false,
        reason: `Priority queue full for ${context.priority}`,
      }
    }

    // 根據狀態進行額外檢查
    if (context.state === BackpressureState.OVERFLOW) {
      return { allowed: false, reason: 'Backpressure OVERFLOW' }
    }

    if (context.state === BackpressureState.CRITICAL) {
      if (context.priority !== 'high') {
        return { allowed: false, reason: 'CRITICAL: only high-priority allowed' }
      }
    }

    return { allowed: true }
  }
}

/**
 * 速率限制策略。
 *
 * 根據每秒入隊速率限制事件入隊。
 */
export class RateLimitStrategy implements FlowControlStrategy {
  readonly name = 'RateLimit'

  evaluate(context: FlowControlContext): BackpressureDecision {
    const maxRate = context.config.maxEnqueueRate || Number.POSITIVE_INFINITY
    const currentRate = context.currentRate

    if (currentRate <= maxRate) {
      return { allowed: true }
    }

    // 速率超限：按優先級分級處理
    if (context.priority === 'high') {
      // 高優先級始終允許
      return { allowed: true }
    }

    if (context.priority === 'normal') {
      // 普通優先級延遲入隊
      const delayMs = context.config.lowPriorityDelayMs || 100
      return {
        allowed: true,
        delayed: true,
        delayMs,
        reason: 'Rate limit: normal priority delayed',
      }
    }

    // 低優先級拒絕
    return {
      allowed: false,
      reason: 'Rate limit exceeded for low-priority event',
    }
  }
}

/**
 * 優先級平衡策略。
 *
 * 在 WARNING 和 CRITICAL 狀態下降級低優先級事件，防止高優先級飢餓。
 */
export class PriorityRebalanceStrategy implements FlowControlStrategy {
  readonly name = 'PriorityRebalance'

  evaluate(context: FlowControlContext): BackpressureDecision {
    const state = context.state
    const priority = context.priority
    const delayMs = context.config.lowPriorityDelayMs || 100

    if (state === BackpressureState.CRITICAL) {
      if (priority === 'low') {
        // 低優先級在 CRITICAL 狀態拒絕
        return {
          allowed: false,
          reason: 'CRITICAL: low-priority rejected',
        }
      }
      if (priority === 'normal') {
        // 普通優先級延遲
        return {
          allowed: true,
          delayed: true,
          delayMs,
          reason: 'CRITICAL: normal priority delayed',
        }
      }
    }

    if (state === BackpressureState.WARNING) {
      if (priority === 'low') {
        // 低優先級在 WARNING 狀態延遲
        return {
          allowed: true,
          delayed: true,
          delayMs,
          reason: 'WARNING: low priority delayed',
        }
      }
    }

    return { allowed: true }
  }
}

/**
 * 反飢餓保護策略。
 *
 * 防止低優先級事件被長期壓制。
 * 當事件等待超過 starvationTimeoutMs 時，自動提升其優先級。
 */
export class StarvationProtectionStrategy implements FlowControlStrategy {
  readonly name = 'StarvationProtection'

  evaluate(context: FlowControlContext): BackpressureDecision {
    // 此策略需要在 BackpressureManager 中額外實現
    // 以便存取事件的 createdAt 時間戳
    // 暫時作為佔位符，返回允許
    return { allowed: true }
  }
}

/**
 * 組合策略。
 *
 * 組合多個策略。評估時所有子策略必須允許，否則拒絕。
 * 取最嚴格的決策（拒絕 > 延遲 > 允許）。
 */
export class CompositeStrategy implements FlowControlStrategy {
  readonly name: string
  private strategies: FlowControlStrategy[]

  constructor(name: string, strategies: FlowControlStrategy[]) {
    this.name = name
    this.strategies = strategies
  }

  evaluate(context: FlowControlContext): BackpressureDecision {
    let mostStrict: BackpressureDecision = { allowed: true }

    for (const strategy of this.strategies) {
      const decision = strategy.evaluate(context)

      // 取最嚴格決策：拒絕 > 延遲 > 允許
      if (!decision.allowed) {
        return decision // 任一拒絕即拒絕
      }

      if (decision.delayed && !mostStrict.delayed) {
        mostStrict = decision // 延遲優於允許
      }
    }

    return mostStrict
  }

  /**
   * 新增子策略。
   */
  addStrategy(strategy: FlowControlStrategy): void {
    this.strategies.push(strategy)
  }

  /**
   * 移除指定名稱的子策略。
   */
  removeStrategy(name: string): boolean {
    const index = this.strategies.findIndex((s) => s.name === name)
    if (index >= 0) {
      this.strategies.splice(index, 1)
      return true
    }
    return false
  }
}

/**
 * 工廠方法：建立預設流控策略組合。
 *
 * @param config 背壓配置
 * @returns 組合策略實例
 *
 * @public
 */
export function createDefaultStrategies(
  config: Omit<BackpressureConfig, 'onRejected' | 'onStateChange'>
): CompositeStrategy {
  return new CompositeStrategy('Default', [
    new QueueDepthStrategy(),
    new RateLimitStrategy(),
    new PriorityRebalanceStrategy(),
  ])
}
