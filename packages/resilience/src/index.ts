/**
 * @gravito/resilience - Event System Resilience Layer
 *
 * Re-exports resilience patterns from @gravito/core for convenient access.
 * Provides circuit breaker, backpressure management, worker pool,
 * aggregation, and other reliability patterns for the Gravito event system.
 */

// === Re-export Core Resilience Components ===
// These are kept in @gravito/core to maintain architectural coherence

export type {
  BackpressureConfig,
  BackpressureDecision,
  BackpressureMetricsSnapshot,
  BackpressureStrategy,
  CircuitBreakerMetrics,
  CircuitBreakerMetricsRecorder,
  CircuitBreakerOptions,
  DeadLetterDecision,
  DLQEntry,
  DLQEntryCallback,
  DLQEntrySource,
  DLQFilter,
  EventQueueConfig,
  FlowControlContext,
  FlowControlStrategy,
  MultiPriorityQueueDepth,
  RetrySchedulerConfig,
  WindowAdjustment,
  WorkerPoolConfig,
  WorkerPoolStats,
  WorkerStats,
} from '@gravito/core'
// Circuit Breaker
// Dead Letter Queue
// Backpressure
// Priority Queue
// Escalation
// Retry
// Idempotency
// Worker Pool
export {
  BackpressureManager,
  BackpressureState,
  CircuitBreaker,
  CircuitBreakerState,
  CompositeStrategy,
  DeadLetterQueue,
  EventPriorityQueue,
  IdempotencyCache,
  PriorityEscalationManager,
  PriorityRebalanceStrategy,
  PriorityStatistics,
  QueueDepthStrategy,
  RateLimitStrategy,
  RetryScheduler,
  StarvationProtectionStrategy,
  WorkerPool,
  WorkerPoolMetrics,
} from '@gravito/core'

// === Local Aggregation and Bridge ===
// These are in this package

export { AggregationWindow } from './aggregation/AggregationWindow'
export { DeduplicationManager } from './aggregation/DeduplicationManager'
// Aggregation
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
export type { EventStatus, MessageQueueBridgeConfig } from './bridge/MessageQueueBridge'
// Bridge
export { MessageQueueBridge } from './bridge/MessageQueueBridge'
