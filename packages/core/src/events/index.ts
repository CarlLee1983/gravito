/**
 * Event system exports for async event dispatch.
 * @packageDocumentation
 */

// ==================================================
// CORE EVENT SYSTEM - Microkernel Layer
// ==================================================

// Core foundations - kept in core for backwards compatibility
export * from './EventBackend'
export type { EventOptions } from './EventOptions'
export { DEFAULT_EVENT_OPTIONS } from './EventOptions'
export type { BackpressureStrategy, EventQueueConfig, EventTask } from './types'

// ==================================================
// NOTE: Resilience-related symbols maintained in @gravito/core
// @gravito/resilience is a parallel implementation for standalone use
// For new code, consider using @gravito/resilience directly
// ==================================================

export type {
  BackpressureConfig,
  BackpressureDecision,
  BackpressureMetricsSnapshot,
} from './BackpressureManager'
export { BackpressureManager, BackpressureState } from './BackpressureManager'
export type {
  CircuitBreakerMetrics,
  CircuitBreakerMetricsRecorder,
  CircuitBreakerOptions,
} from './CircuitBreaker'
export { CircuitBreaker, CircuitBreakerState } from './CircuitBreaker'
export type { DLQEntry, DLQEntryCallback, DLQEntrySource, DLQFilter } from './DeadLetterQueue'
export { DeadLetterQueue } from './DeadLetterQueue'
export { EventPriorityQueue } from './EventPriorityQueue'
export * from './FlowControlStrategy'
export { IdempotencyCache } from './IdempotencyCache'
export { MessageQueueBridge } from './MessageQueueBridge'
export type { PriorityStatistics } from './PriorityEscalationManager'
export { PriorityEscalationManager } from './PriorityEscalationManager'
export type { RetrySchedulerConfig } from './RetryScheduler'
export { RetryScheduler } from './RetryScheduler'
export type { DeadLetterDecision, MultiPriorityQueueDepth, WindowAdjustment } from './types'
export { WorkerPool } from './WorkerPool'
export type { WorkerPoolConfig, WorkerPoolStats, WorkerStats } from './WorkerPoolConfig'
export { WorkerPoolMetrics } from './WorkerPoolMetrics'
