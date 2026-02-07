/**
 * Event system exports for async event dispatch.
 * @packageDocumentation
 */

export type {
  BackpressureConfig,
  BackpressureDecision,
  BackpressureMetricsSnapshot,
} from './BackpressureManager'
export { BackpressureManager, BackpressureState } from './BackpressureManager'
export type { CircuitBreakerOptions } from './CircuitBreaker'
export { CircuitBreaker, CircuitBreakerState } from './CircuitBreaker'
export type { DLQEntry, DLQFilter } from './DeadLetterQueue'
export { DeadLetterQueue } from './DeadLetterQueue'
export * from './EventBackend'
export type { EventOptions } from './EventOptions'
export { DEFAULT_EVENT_OPTIONS } from './EventOptions'
export { EventPriorityQueue } from './EventPriorityQueue'
export type { FlowControlContext, FlowControlStrategy } from './FlowControlStrategy'
export {
  CompositeStrategy,
  createDefaultStrategies,
  PriorityRebalanceStrategy,
  QueueDepthStrategy,
  RateLimitStrategy,
  StarvationProtectionStrategy,
} from './FlowControlStrategy'
export type { EventStatus, MessageQueueBridgeConfig } from './MessageQueueBridge'
export { MessageQueueBridge } from './MessageQueueBridge'
export * from './observability'
export type { QueueStats, RetrySchedulerConfig } from './RetryScheduler'
export { RetryScheduler } from './RetryScheduler'
export type { BackpressureStrategy, EventQueueConfig, EventTask } from './types'
export { WorkerPool } from './WorkerPool'
export type { WorkerPoolConfig, WorkerPoolStats, WorkerStats } from './WorkerPoolConfig'
export { WorkerPoolMetrics } from './WorkerPoolMetrics'
