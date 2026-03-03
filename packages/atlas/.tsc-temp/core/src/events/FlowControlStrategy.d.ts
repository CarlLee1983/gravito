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
  depthByPriority: {
    high: number
    normal: number
    low: number
  }
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
export declare class QueueDepthStrategy implements FlowControlStrategy {
  readonly name = 'queue-depth'
  evaluate(context: FlowControlContext): BackpressureDecision
}
/**
 * 速率限制策略。
 *
 * 根據每秒入隊速率限制事件入隊。
 */
export declare class RateLimitStrategy implements FlowControlStrategy {
  readonly name = 'rate-limit'
  evaluate(context: FlowControlContext): BackpressureDecision
}
/**
 * 優先級平衡策略。
 *
 * 在 WARNING 和 CRITICAL 狀態下降級低優先級事件，防止高優先級飢餓。
 */
export declare class PriorityRebalanceStrategy implements FlowControlStrategy {
  readonly name = 'priority-rebalance'
  evaluate(context: FlowControlContext): BackpressureDecision
}
/**
 * 反飢餓保護策略。
 *
 * 防止低優先級事件被長期壓制。
 * 當事件等待超過 starvationTimeoutMs 時，自動提升其優先級。
 */
export declare class StarvationProtectionStrategy implements FlowControlStrategy {
  readonly name = 'starvation-protection'
  evaluate(_context: FlowControlContext): BackpressureDecision
}
/**
 * 組合策略。
 *
 * 組合多個策略。評估時所有子策略必須允許，否則拒絕。
 * 取最嚴格的決策（拒絕 > 延遲 > 允許）。
 */
export declare class CompositeStrategy implements FlowControlStrategy {
  readonly name: string
  private strategies
  constructor(name: string, strategies: FlowControlStrategy[])
  evaluate(context: FlowControlContext): BackpressureDecision
  /**
   * 新增子策略。
   */
  addStrategy(strategy: FlowControlStrategy): void
  /**
   * 移除指定名稱的子策略。
   */
  removeStrategy(name: string): boolean
}
/**
 * 工廠方法：建立預設流控策略組合。
 *
 * @param config 背壓配置
 * @returns 組合策略實例
 *
 * @public
 */
export declare function createDefaultStrategies(
  _config: Omit<BackpressureConfig, 'onRejected' | 'onStateChange'>
): FlowControlStrategy[]
