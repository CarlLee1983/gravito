/**
 * @gravito/resilience - Event System Resilience Layer
 *
 * Provides circuit breaker, backpressure management, worker pool,
 * aggregation, and other reliability patterns for the Gravito event system.
 */

// === Aggregation ===
export { AggregationWindow } from './aggregation/AggregationWindow'
export { DeduplicationManager } from './aggregation/DeduplicationManager'
export { EventAggregationManager } from './aggregation/EventAggregationManager'
export { EventBatcher } from './aggregation/EventBatcher'
export type {
  AggregationConfig,
  AggregationStats,
  BatchStats,
  DeduplicationStats,
  WindowAdjustmentConfig,
  WindowStats,
} from './aggregation/types'
export type {
  BackpressureConfig,
  BackpressureDecision,
  BackpressureMetricsSnapshot,
} from './backpressure/BackpressureManager'
// === Backpressure Management ===
export { BackpressureManager, BackpressureState } from './backpressure/BackpressureManager'
export type {
  FlowControlContext,
  FlowControlStrategy,
} from './backpressure/FlowControlStrategy'
export type {
  DeadLetterDecision,
  MultiPriorityQueueDepth,
  WindowAdjustment,
} from './backpressure/types'
// === Bridge ===
export type { EventStatus, MessageQueueBridgeConfig } from './bridge/MessageQueueBridge'
export { MessageQueueBridge } from './bridge/MessageQueueBridge'
// === Photon/HTTP Bridge ===
export { resilience } from './bridge/photon'
export type {
  CircuitBreakerMetrics,
  CircuitBreakerMetricsRecorder,
  CircuitBreakerOptions,
} from './circuit-breaker/CircuitBreaker'
// === Circuit Breaker ===
export { CircuitBreaker, CircuitBreakerState } from './circuit-breaker/CircuitBreaker'
export type {
  DLQEntry,
  DLQEntryCallback,
  DLQEntrySource,
  DLQFilter,
} from './dead-letter-queue/DeadLetterQueue'
// === Dead Letter Queue ===
export { DeadLetterQueue } from './dead-letter-queue/DeadLetterQueue'
// === Idempotency ===
export { IdempotencyCache } from './idempotency/IdempotencyCache'
// === Observability ===
export * from './observability'
export type {
  BackpressureStrategy,
  EventQueueConfig,
  EventTask,
} from './priority/EventPriorityQueue'
// === Priority Queue ===
export { EventPriorityQueue } from './priority/EventPriorityQueue'
export type { PriorityStatistics } from './priority/PriorityEscalationManager'
export { PriorityEscalationManager } from './priority/PriorityEscalationManager'
// === Retry ===
export { RetryScheduler } from './retry/RetryScheduler'
// === Worker Pool ===
export { WorkerPool } from './worker/WorkerPool'
export type { WorkerPoolConfig, WorkerPoolStats, WorkerStats } from './worker/WorkerPoolConfig'
export { WorkerPoolMetrics } from './worker/WorkerPoolMetrics'
