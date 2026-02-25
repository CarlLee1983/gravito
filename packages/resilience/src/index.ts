/**
 * @gravito/resilience - Event System Resilience Layer
 *
 * Provides circuit breaker, backpressure management, worker pool,
 * aggregation, and other reliability patterns for the Gravito event system.
 *
 * NOTE: Base resilience patterns (CircuitBreaker, DeadLetterQueue, IdempotencyCache)
 * are kept in @gravito/core to maintain architectural coherence and avoid circular
 * dependencies. This module re-exports them along with high-level resilience features.
 */

// Circuit Breaker (re-exported from core)
// Dead Letter Queue (re-exported from core)
// Idempotency (re-exported from core)
// Backpressure (re-exported from core)
// Aggregation (re-exported from core)
// Worker Pool (re-exported from core)
// Priority (re-exported from core)
// Retry (re-exported from core)
// MessageQueueBridge (re-exported from core)
// EventPriorityQueue (re-exported from core for convenience)
// Observability (kept in core to avoid circular dependency)
export {
  AggregationWindow,
  type BackpressureConfig,
  type BackpressureDecision,
  BackpressureManager,
  type BackpressureMetricsSnapshot,
  BackpressureState,
  CircuitBreaker,
  type CircuitBreakerMetrics,
  type CircuitBreakerMetricsRecorder,
  type CircuitBreakerOptions,
  CircuitBreakerState,
  CompositeStrategy,
  type DeadLetterDecision,
  DeadLetterQueue,
  DeduplicationManager,
  type DLQEntry,
  type DLQEntryCallback,
  type DLQEntrySource,
  type DLQFilter,
  EventAggregationManager,
  EventBatcher,
  EventMetrics,
  EventPriorityQueue,
  type EventQueueConfig,
  EventTracer,
  EventTracing,
  type FlowControlContext,
  type FlowControlStrategy,
  IdempotencyCache,
  MessageQueueBridge,
  type MultiPriorityQueueDepth,
  ObservableHookManager,
  OTelEventMetrics,
  PriorityEscalationManager,
  PriorityRebalanceStrategy,
  PriorityStatistics,
  type QueueAdapter,
  type QueueAdapterConfig,
  type QueueDepthCallback,
  QueueDepthStrategy,
  RateLimitStrategy,
  type RequiredCircuitBreakerOptions,
  type RetryDecision,
  RetryScheduler,
  type RetrySchedulerConfig as RetryConfig,
  StreamWorkerMetrics,
  type TaskSource,
  type WindowAdjustment,
  WorkerPool,
  type WorkerPoolConfig,
  WorkerPoolMetrics,
  type WorkerPoolStats,
  type WorkerStats,
} from '@gravito/core'
