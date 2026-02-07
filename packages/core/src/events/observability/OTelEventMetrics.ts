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

import type {
  Counter,
  Histogram,
  Meter,
  ObservableGauge,
  ObservableResult,
} from '@opentelemetry/api'
import type { CircuitBreakerMetricsRecorder } from '../CircuitBreaker'

/**
 * Queue depth callback type.
 * Returns the current queue depths for each priority level.
 */
export type QueueDepthCallback = () => {
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
  state: 0 | 1 | 2 // 0=CLOSED, 1=HALF_OPEN, 2=OPEN
}

/**
 * Default histogram buckets for dispatch duration.
 * Covers from 1ms to 10s with exponential distribution.
 */
const DEFAULT_DISPATCH_BUCKETS = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

/**
 * Default histogram buckets for listener duration.
 * Covers from 1ms to 5s with exponential distribution.
 */
const DEFAULT_LISTENER_BUCKETS = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]

/**
 * Default histogram buckets for circuit breaker open duration.
 * Covers from 1s to 10m with exponential distribution.
 */
const DEFAULT_CB_OPEN_DURATION_BUCKETS = [1, 2, 5, 10, 30, 60, 120, 300, 600]

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
export class OTelEventMetrics implements CircuitBreakerMetricsRecorder {
  private readonly meter: Meter
  private readonly prefix: string

  private readonly dispatchDurationHistogram: Histogram
  private readonly listenerDurationHistogram: Histogram
  private readonly queueDepthGauge: ObservableGauge

  // Circuit breaker metrics (new in Phase 2)
  private readonly cbStateGauge: ObservableGauge
  private readonly cbFailuresCounter: Counter
  private readonly cbSuccessesCounter: Counter
  private readonly cbTransitionsCounter: Counter
  private readonly cbOpenDurationHistogram: Histogram

  // Backpressure metrics (Phase 3)
  private readonly backpressureRejectionsCounter: Counter
  private readonly backpressureStateGauge: ObservableGauge
  private readonly backpressureDegradationsCounter: Counter
  private backpressureStateValue = 'NORMAL'

  // DLQ metrics (Phase 3)
  private readonly dlqEntriesCounter: Counter
  private readonly dlqDepthGauge: ObservableGauge
  private readonly dlqRequeueCounter: Counter
  private readonly retryAttemptsCounter: Counter
  private dlqDepthCallback?: () => number

  private queueDepthCallback?: QueueDepthCallback
  private circuitBreakerStateCallbacks: Map<string, CircuitBreakerStateCallback> = new Map()
  private recordedCircuitBreakerStates: Map<string, number> = new Map()

  /**
   * Bucket boundaries for dispatch duration histogram.
   */
  private readonly dispatchDurationBuckets: number[] = DEFAULT_DISPATCH_BUCKETS

  /**
   * Bucket boundaries for listener duration histogram.
   */
  private readonly listenerDurationBuckets: number[] = DEFAULT_LISTENER_BUCKETS

  /**
   * Bucket boundaries for circuit breaker open duration histogram.
   */
  private readonly cbOpenDurationBuckets: number[] = DEFAULT_CB_OPEN_DURATION_BUCKETS

  /**
   * Create a new OTelEventMetrics instance.
   *
   * @param meter - OpenTelemetry Meter instance
   * @param prefix - Metric name prefix (default: 'gravito_event_')
   */
  constructor(meter: Meter, prefix = 'gravito_event_') {
    this.meter = meter
    this.prefix = prefix

    // Create dispatch duration histogram
    this.dispatchDurationHistogram = meter.createHistogram(`${prefix}dispatch_duration_seconds`, {
      description: 'Duration of event dispatch operations in seconds',
      unit: 's',
      advice: {
        explicitBucketBoundaries: this.dispatchDurationBuckets,
      },
    })

    // Create listener duration histogram
    this.listenerDurationHistogram = meter.createHistogram(`${prefix}listener_duration_seconds`, {
      description: 'Duration of listener execution in seconds',
      unit: 's',
      advice: {
        explicitBucketBoundaries: this.listenerDurationBuckets,
      },
    })

    // Create queue depth observable gauge
    this.queueDepthGauge = meter.createObservableGauge(`${prefix}queue_depth`, {
      description: 'Current queue depth by priority level',
      unit: '{events}',
    })

    // Register the observable callback
    this.queueDepthGauge.addCallback((observableResult: ObservableResult) => {
      if (this.queueDepthCallback) {
        const depths = this.queueDepthCallback()
        observableResult.observe(depths.high, { priority: 'high' })
        observableResult.observe(depths.normal, { priority: 'normal' })
        observableResult.observe(depths.low, { priority: 'low' })
      }
    })

    // Create circuit breaker state gauge (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
    this.cbStateGauge = meter.createObservableGauge(`${prefix}circuit_breaker_state`, {
      description: 'Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
      unit: '{state}',
    })

    this.cbStateGauge.addCallback((observableResult: ObservableResult) => {
      for (const callback of this.circuitBreakerStateCallbacks.values()) {
        const state = callback()
        observableResult.observe(state.state, {
          event_name: state.eventName,
          listener_index: String(state.listenerIndex),
        })
      }
      for (const [name, state] of this.recordedCircuitBreakerStates.entries()) {
        observableResult.observe(state, {
          event_name: name,
          listener_index: '0',
        })
      }
    })

    // Create circuit breaker failures counter (with graceful fallback for testing)
    this.cbFailuresCounter = (meter as any).createCounter
      ? (meter as any).createCounter(`${prefix}circuit_breaker_failures_total`, {
          description: 'Total number of failures recorded by circuit breakers',
          unit: '{failures}',
        })
      : ({ add: () => {} } as any)

    // Create circuit breaker successes counter
    this.cbSuccessesCounter = (meter as any).createCounter
      ? (meter as any).createCounter(`${prefix}circuit_breaker_successes_total`, {
          description: 'Total number of successes recorded by circuit breakers',
          unit: '{successes}',
        })
      : ({ add: () => {} } as any)

    // Create circuit breaker transitions counter
    this.cbTransitionsCounter = (meter as any).createCounter
      ? (meter as any).createCounter(`${prefix}circuit_breaker_transitions_total`, {
          description: 'Total number of state transitions in circuit breakers',
          unit: '{transitions}',
        })
      : ({ add: () => {} } as any)

    // Create circuit breaker open duration histogram
    this.cbOpenDurationHistogram = meter.createHistogram(
      `${prefix}circuit_breaker_open_duration_seconds`,
      {
        description: 'Duration that circuit breakers remain in OPEN state',
        unit: 's',
        advice: {
          explicitBucketBoundaries: this.cbOpenDurationBuckets,
        },
      }
    )

    // Create backpressure metrics
    this.backpressureRejectionsCounter = (meter as any).createCounter
      ? (meter as any).createCounter(`${prefix}backpressure_rejections_total`, {
          description: 'Total number of events rejected due to backpressure',
          unit: '{rejections}',
        })
      : ({ add: () => {} } as any)

    this.backpressureStateGauge = meter.createObservableGauge(`${prefix}backpressure_state`, {
      description: 'Current backpressure state (0=NORMAL, 1=WARNING, 2=CRITICAL, 3=OVERFLOW)',
      unit: '{state}',
    })

    this.backpressureStateGauge.addCallback((observableResult: ObservableResult) => {
      const stateMap: Record<string, number> = {
        NORMAL: 0,
        WARNING: 1,
        CRITICAL: 2,
        OVERFLOW: 3,
      }
      observableResult.observe(stateMap[this.backpressureStateValue] ?? 0)
    })

    this.backpressureDegradationsCounter = (meter as any).createCounter
      ? (meter as any).createCounter(`${prefix}backpressure_degradations_total`, {
          description: 'Total number of priority degradations due to backpressure',
          unit: '{degradations}',
        })
      : ({ add: () => {} } as any)

    // Create DLQ metrics
    this.dlqEntriesCounter = (meter as any).createCounter
      ? (meter as any).createCounter(`${prefix}dlq_entries_total`, {
          description: 'Total number of events added to Dead Letter Queue',
          unit: '{entries}',
        })
      : ({ add: () => {} } as any)

    this.dlqDepthGauge = meter.createObservableGauge(`${prefix}dlq_depth`, {
      description: 'Current Dead Letter Queue depth',
      unit: '{events}',
    })

    this.dlqDepthGauge.addCallback((observableResult: ObservableResult) => {
      if (this.dlqDepthCallback) {
        observableResult.observe(this.dlqDepthCallback())
      }
    })

    this.dlqRequeueCounter = (meter as any).createCounter
      ? (meter as any).createCounter(`${prefix}dlq_requeue_total`, {
          description: 'Total number of DLQ requeue attempts',
          unit: '{attempts}',
        })
      : ({ add: () => {} } as any)

    this.retryAttemptsCounter = (meter as any).createCounter
      ? (meter as any).createCounter(`${prefix}retry_attempts_total`, {
          description: 'Total number of event retry attempts',
          unit: '{attempts}',
        })
      : ({ add: () => {} } as any)
  }

  /**
   * Record event dispatch duration.
   *
   * @param eventName - Name of the event
   * @param priority - Priority level (high, normal, low)
   * @param durationSeconds - Duration in seconds
   */
  recordDispatchDuration(eventName: string, priority: string, durationSeconds: number): void {
    this.dispatchDurationHistogram.record(durationSeconds, {
      event_name: eventName,
      priority,
    })
  }

  /**
   * Record listener execution duration.
   *
   * @param eventName - Name of the event
   * @param listenerIndex - Index of the listener in the callback list
   * @param durationSeconds - Duration in seconds
   */
  recordListenerDuration(eventName: string, listenerIndex: number, durationSeconds: number): void {
    this.listenerDurationHistogram.record(durationSeconds, {
      event_name: eventName,
      listener_index: String(listenerIndex),
    })
  }

  /**
   * Set the callback for queue depth observable gauge.
   *
   * The callback will be invoked when metrics are collected,
   * allowing real-time reporting of queue depths.
   *
   * @param callback - Function returning current queue depths
   */
  setQueueDepthCallback(callback: QueueDepthCallback): void {
    this.queueDepthCallback = callback
  }

  /**
   * Register a circuit breaker state callback for monitoring.
   *
   * @param key - Unique identifier for the circuit breaker (e.g., "order:created-0")
   * @param callback - Function returning current circuit breaker state
   */
  registerCircuitBreakerStateCallback(key: string, callback: CircuitBreakerStateCallback): void {
    this.circuitBreakerStateCallbacks.set(key, callback)
  }

  /**
   * Unregister a circuit breaker state callback.
   *
   * @param key - Unique identifier for the circuit breaker
   */
  unregisterCircuitBreakerStateCallback(key: string): void {
    this.circuitBreakerStateCallbacks.delete(key)
  }

  /**
   * Record circuit breaker state change.
   *
   * @param name - Name of the circuit breaker (usually event name)
   * @param state - State as number (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
   */
  recordState(name: string, state: number): void {
    this.recordedCircuitBreakerStates.set(name, state)
  }

  /**
   * Record circuit breaker state transition.
   *
   * @param name - Name of the circuit breaker
   * @param fromState - Previous state
   * @param toState - New state
   */
  recordTransition(name: string, fromState: string, toState: string): void {
    this.recordCircuitBreakerTransition(name, 0, fromState, toState)
  }

  /**
   * Record circuit breaker failure.
   *
   * @param name - Name of the circuit breaker
   */
  recordFailure(name: string): void {
    this.recordCircuitBreakerFailure(name, 0)
  }

  /**
   * Record circuit breaker success.
   *
   * @param name - Name of the circuit breaker
   */
  recordSuccess(name: string): void {
    this.recordCircuitBreakerSuccess(name, 0)
  }

  /**
   * Record circuit breaker open duration.
   *
   * @param name - Name of the circuit breaker
   * @param seconds - Duration in seconds
   */
  recordOpenDuration(name: string, seconds: number): void {
    this.recordCircuitBreakerOpenDuration(name, 0, seconds)
  }

  /**
   * Record circuit breaker failure.
   *
   * @param eventName - Name of the event
   * @param listenerIndex - Index of the listener
   */
  recordCircuitBreakerFailure(eventName: string, listenerIndex: number): void {
    this.cbFailuresCounter.add(1, {
      event_name: eventName,
      listener_index: String(listenerIndex),
    })
  }

  /**
   * Record circuit breaker success.
   *
   * @param eventName - Name of the event
   * @param listenerIndex - Index of the listener
   */
  recordCircuitBreakerSuccess(eventName: string, listenerIndex: number): void {
    this.cbSuccessesCounter.add(1, {
      event_name: eventName,
      listener_index: String(listenerIndex),
    })
  }

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
  ): void {
    this.cbTransitionsCounter.add(1, {
      event_name: eventName,
      listener_index: String(listenerIndex),
      from_state: fromState,
      to_state: toState,
    })
  }

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
  ): void {
    this.cbOpenDurationHistogram.record(durationSeconds, {
      event_name: eventName,
      listener_index: String(listenerIndex),
    })
  }

  /**
   * Get the bucket boundaries for dispatch duration histogram.
   *
   * @returns Array of bucket boundaries in seconds
   */
  getDispatchDurationBuckets(): number[] {
    return [...this.dispatchDurationBuckets]
  }

  /**
   * Get the bucket boundaries for listener duration histogram.
   *
   * @returns Array of bucket boundaries in seconds
   */
  getListenerDurationBuckets(): number[] {
    return [...this.listenerDurationBuckets]
  }

  /**
   * Get the OpenTelemetry Meter instance.
   *
   * @returns Meter instance
   */
  getMeter(): Meter {
    return this.meter
  }

  /**
   * Get the metric name prefix.
   *
   * @returns Metric name prefix
   */
  getPrefix(): string {
    return this.prefix
  }

  /**
   * Get the bucket boundaries for circuit breaker open duration histogram.
   *
   * @returns Array of bucket boundaries in seconds
   */
  getCircuitBreakerOpenDurationBuckets(): number[] {
    return [...this.cbOpenDurationBuckets]
  }

  /**
   * Get all registered circuit breaker state callback keys.
   *
   * @returns Array of registered keys
   */
  getRegisteredCircuitBreakers(): string[] {
    return Array.from(this.circuitBreakerStateCallbacks.keys())
  }

  /**
   * Clear all circuit breaker state callbacks.
   */
  clearCircuitBreakerCallbacks(): void {
    this.circuitBreakerStateCallbacks.clear()
  }

  /**
   * Record a backpressure rejection event.
   *
   * @param eventName - Event name
   * @param priority - Event priority
   * @param reason - Rejection reason
   */
  recordBackpressureRejection(eventName: string, priority: string, reason: string): void {
    this.backpressureRejectionsCounter.add(1, {
      event_name: eventName,
      priority,
      reason,
    })
  }

  /**
   * Record a backpressure state change event.
   *
   * @param state - New backpressure state (NORMAL, WARNING, CRITICAL, OVERFLOW)
   */
  recordBackpressureState(state: string): void {
    this.backpressureStateValue = state
  }

  /**
   * Record a backpressure degradation event.
   *
   * @param eventName - Event name
   * @param fromPriority - Original priority
   * @param toPriority - Degraded priority
   */
  recordBackpressureDegradation(eventName: string, fromPriority: string, toPriority: string): void {
    this.backpressureDegradationsCounter.add(1, {
      event_name: eventName,
      from_priority: fromPriority,
      to_priority: toPriority,
    })
  }

  /**
   * Record an event added to Dead Letter Queue.
   *
   * @param eventName - Event name
   * @param source - Source of DLQ entry (retry_exhausted, circuit_breaker, backpressure_overflow)
   */
  recordDLQEntry(eventName: string, source: string): void {
    this.dlqEntriesCounter.add(1, {
      event_name: eventName,
      source,
    })
  }

  /**
   * Set the callback for DLQ depth observable gauge.
   *
   * @param callback - Function returning current DLQ depth
   */
  setDLQDepthCallback(callback: () => number): void {
    this.dlqDepthCallback = callback
  }

  /**
   * Record a DLQ requeue attempt.
   *
   * @param eventName - Event name
   * @param result - Result of requeue (success or failure)
   */
  recordDLQRequeue(eventName: string, result: 'success' | 'failure'): void {
    this.dlqRequeueCounter.add(1, {
      event_name: eventName,
      result,
    })
  }

  /**
   * Record an event retry attempt.
   *
   * @param eventName - Event name
   * @param attemptNumber - Attempt number
   */
  recordRetryAttempt(eventName: string, attemptNumber: number): void {
    this.retryAttemptsCounter.add(1, {
      event_name: eventName,
      attempt_number: String(attemptNumber),
    })
  }
}
