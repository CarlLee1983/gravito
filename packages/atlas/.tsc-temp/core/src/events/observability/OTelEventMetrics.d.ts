/**
 * @gravito/core - OpenTelemetry Event Metrics
 *
 * Provides event system metrics using OpenTelemetry API directly.
 * This enables Prometheus export without requiring @gravito/monitor dependency.
 *
 * Metrics:
 * - gravito_event_dispatch_duration_seconds (Histogram)
 * - gravito_event_listener_duration_seconds (Histogram)
 * - gravito_event_queue_depth (Observable Gauge)
 *
 * @packageDocumentation
 */
import type { Meter } from '@opentelemetry/api'
import type { CircuitBreakerMetricsRecorder } from '../CircuitBreaker'
/**
 * Queue depth callback type.
 * Returns the current queue depths for each priority level.
 */
export type QueueDepthCallback = () => {
  critical: number
  high: number
  normal: number
  low: number
}
/**
 * Circuit breaker state callback type.
 * Returns the current state of a circuit breaker.
 */
export type CircuitBreakerStateCallback = () => {
  eventName: string
  listenerIndex: number
  state: 0 | 1 | 2
}
/**
 * OpenTelemetry-based Event Metrics collector.
 *
 * Uses OpenTelemetry API directly for metrics collection, enabling
 * Prometheus export through the OpenTelemetry SDK.
 *
 * @example
 * ```typescript
 * import { metrics } from '@opentelemetry/api'
 * import { OTelEventMetrics } from '@gravito/core'
 *
 * const meter = metrics.getMeter('@gravito/core', '1.0.0')
 * const eventMetrics = new OTelEventMetrics(meter)
 *
 * // Record dispatch duration
 * eventMetrics.recordDispatchDuration('order:created', 'high', 0.123)
 *
 * // Record listener duration
 * eventMetrics.recordListenerDuration('order:created', 0, 0.456)
 *
 * // Set queue depth callback
 * eventMetrics.setQueueDepthCallback(() => ({
 *   high: 10,
 *   normal: 50,
 *   low: 100
 * }))
 * ```
 *
 * @public
 */
export declare class OTelEventMetrics implements CircuitBreakerMetricsRecorder {
  private readonly meter
  private readonly prefix
  private readonly dispatchDurationHistogram
  private readonly listenerDurationHistogram
  private readonly queueDepthGauge
  private readonly cbStateGauge
  private readonly cbFailuresCounter
  private readonly cbSuccessesCounter
  private readonly cbTransitionsCounter
  private readonly cbOpenDurationHistogram
  private readonly backpressureRejectionsCounter
  private readonly backpressureStateGauge
  private readonly backpressureDegradationsCounter
  private backpressureStateValue
  private readonly dlqEntriesCounter
  private readonly dlqDepthGauge
  private readonly dlqRequeueCounter
  private readonly retryAttemptsCounter
  private dlqDepthCallback?
  private readonly priorityEscalationCounter
  private queueDepthCallback?
  private circuitBreakerStateCallbacks
  private recordedCircuitBreakerStates
  /**
   * Bucket boundaries for dispatch duration histogram.
   */
  private readonly dispatchDurationBuckets
  /**
   * Bucket boundaries for listener duration histogram.
   */
  private readonly listenerDurationBuckets
  /**
   * Bucket boundaries for circuit breaker open duration histogram.
   */
  private readonly cbOpenDurationBuckets
  /**
   * Create a new OTelEventMetrics instance.
   *
   * @param meter - OpenTelemetry Meter instance
   * @param prefix - Metric name prefix (default: 'gravito_event_')
   */
  constructor(meter: Meter, prefix?: string)
  /**
   * Record event dispatch duration.
   *
   * @param eventName - Name of the event
   * @param priority - Priority level (high, normal, low)
   * @param durationSeconds - Duration in seconds
   */
  recordDispatchDuration(eventName: string, priority: string, durationSeconds: number): void
  /**
   * Record listener execution duration.
   *
   * @param eventName - Name of the event
   * @param listenerIndex - Index of the listener in the callback list
   * @param durationSeconds - Duration in seconds
   */
  recordListenerDuration(eventName: string, listenerIndex: number, durationSeconds: number): void
  /**
   * Set the callback for queue depth observable gauge.
   *
   * The callback will be invoked when metrics are collected,
   * allowing real-time reporting of queue depths.
   *
   * @param callback - Function returning current queue depths
   */
  setQueueDepthCallback(callback: QueueDepthCallback): void
  /**
   * Register a circuit breaker state callback for monitoring.
   *
   * @param key - Unique identifier for the circuit breaker (e.g., "order:created-0")
   * @param callback - Function returning current circuit breaker state
   */
  registerCircuitBreakerStateCallback(key: string, callback: CircuitBreakerStateCallback): void
  /**
   * Unregister a circuit breaker state callback.
   *
   * @param key - Unique identifier for the circuit breaker
   */
  unregisterCircuitBreakerStateCallback(key: string): void
  /**
   * Record circuit breaker state change.
   *
   * @param name - Name of the circuit breaker (usually event name)
   * @param state - State as number (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
   */
  recordState(name: string, state: number): void
  /**
   * Record circuit breaker state transition.
   *
   * @param name - Name of the circuit breaker
   * @param fromState - Previous state
   * @param toState - New state
   */
  recordTransition(name: string, fromState: string, toState: string): void
  /**
   * Record circuit breaker failure.
   *
   * @param name - Name of the circuit breaker
   */
  recordFailure(name: string): void
  /**
   * Record circuit breaker success.
   *
   * @param name - Name of the circuit breaker
   */
  recordSuccess(name: string): void
  /**
   * Record circuit breaker open duration.
   *
   * @param name - Name of the circuit breaker
   * @param seconds - Duration in seconds
   */
  recordOpenDuration(name: string, seconds: number): void
  /**
   * Record circuit breaker failure.
   *
   * @param eventName - Name of the event
   * @param listenerIndex - Index of the listener
   */
  recordCircuitBreakerFailure(eventName: string, listenerIndex: number): void
  /**
   * Record circuit breaker success.
   *
   * @param eventName - Name of the event
   * @param listenerIndex - Index of the listener
   */
  recordCircuitBreakerSuccess(eventName: string, listenerIndex: number): void
  /**
   * Record circuit breaker state transition.
   *
   * @param eventName - Name of the event
   * @param listenerIndex - Index of the listener
   * @param fromState - Previous state (CLOSED, HALF_OPEN, OPEN)
   * @param toState - New state (CLOSED, HALF_OPEN, OPEN)
   */
  recordCircuitBreakerTransition(
    eventName: string,
    listenerIndex: number,
    fromState: string,
    toState: string
  ): void
  /**
   * Record circuit breaker open duration.
   *
   * @param eventName - Name of the event
   * @param listenerIndex - Index of the listener
   * @param durationSeconds - Duration in seconds
   */
  recordCircuitBreakerOpenDuration(
    eventName: string,
    listenerIndex: number,
    durationSeconds: number
  ): void
  /**
   * Get the bucket boundaries for dispatch duration histogram.
   *
   * @returns Array of bucket boundaries in seconds
   */
  getDispatchDurationBuckets(): number[]
  /**
   * Get the bucket boundaries for listener duration histogram.
   *
   * @returns Array of bucket boundaries in seconds
   */
  getListenerDurationBuckets(): number[]
  /**
   * Get the OpenTelemetry Meter instance.
   *
   * @returns Meter instance
   */
  getMeter(): Meter
  /**
   * Get the metric name prefix.
   *
   * @returns Metric name prefix
   */
  getPrefix(): string
  /**
   * Get the bucket boundaries for circuit breaker open duration histogram.
   *
   * @returns Array of bucket boundaries in seconds
   */
  getCircuitBreakerOpenDurationBuckets(): number[]
  /**
   * Get all registered circuit breaker state callback keys.
   *
   * @returns Array of registered keys
   */
  getRegisteredCircuitBreakers(): string[]
  /**
   * Clear all circuit breaker state callbacks.
   */
  clearCircuitBreakerCallbacks(): void
  /**
   * Record a backpressure rejection event.
   *
   * @param eventName - Event name
   * @param priority - Event priority
   * @param reason - Rejection reason
   */
  recordBackpressureRejection(eventName: string, priority: string, reason: string): void
  /**
   * Record a backpressure state change event.
   *
   * @param state - New backpressure state (NORMAL, WARNING, CRITICAL, OVERFLOW)
   */
  recordBackpressureState(state: string): void
  /**
   * Record a backpressure degradation event.
   *
   * @param eventName - Event name
   * @param fromPriority - Original priority
   * @param toPriority - Degraded priority
   */
  recordBackpressureDegradation(eventName: string, fromPriority: string, toPriority: string): void
  /**
   * Record an event added to Dead Letter Queue.
   *
   * @param eventName - Event name
   * @param source - Source of DLQ entry (retry_exhausted, circuit_breaker, backpressure_overflow)
   */
  recordDLQEntry(eventName: string, source: string): void
  /**
   * Set the callback for DLQ depth observable gauge.
   *
   * @param callback - Function returning current DLQ depth
   */
  setDLQDepthCallback(callback: () => number): void
  /**
   * Record a DLQ requeue attempt.
   *
   * @param eventName - Event name
   * @param result - Result of requeue (success or failure)
   */
  recordDLQRequeue(eventName: string, result: 'success' | 'failure'): void
  /**
   * Record an event retry attempt.
   *
   * @param eventName - Event name
   * @param attemptNumber - Attempt number
   */
  recordRetryAttempt(eventName: string, attemptNumber: number): void
  /**
   * Record a priority escalation event.
   *
   * @param eventName - Event name
   * @param fromPriority - Original priority
   * @param toPriority - Escalated priority
   */
  recordPriorityEscalation(eventName: string, fromPriority: string, toPriority: string): void
  /**
   * Record event deduplication (FS-102).
   *
   * @param eventName - Event name
   * @param deduplicatedCount - Number of events after deduplication
   * @param totalCount - Total number of events before deduplication
   */
  recordDeduplication(eventName: string, deduplicatedCount: number, totalCount: number): void
  /**
   * Record batch submission (FS-102).
   *
   * @param eventName - Event name
   * @param batchSize - Size of submitted batch
   * @param windowMs - Aggregation window size
   */
  recordBatch(eventName: string, batchSize: number, windowMs: number): void
  /**
   * Record window adjustment (FS-102).
   *
   * @param oldWindowMs - Previous window size
   * @param newWindowMs - New window size
   * @param reason - Adjustment reason
   */
  recordWindowAdjustment(oldWindowMs: number, newWindowMs: number, reason: string): void
}
