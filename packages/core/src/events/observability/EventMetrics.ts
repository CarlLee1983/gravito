/**
 * @gravito/core - Event System Metrics
 *
 * Manages metric collection for event dispatch and listener execution.
 */

import type { EventMetricCounter, EventMetricGauge, EventMetricHistogram } from './metrics-types'

/**
 * Event metrics collector for monitoring and observability.
 *
 * Collects 6 core metrics:
 * - Event dispatch latency (Histogram)
 * - Listener execution time (Histogram)
 * - Queue depth by priority (Gauge)
 * - Failure count by error type (Counter)
 * - Timeout count (Counter)
 * - Processed event count by status (Counter)
 *
 * @public
 */
export class EventMetrics {
  private dispatchLatency: EventMetricHistogram
  private listenerExecutionTime: EventMetricHistogram
  private queueDepthGauge: EventMetricGauge
  private failureCounter: EventMetricCounter
  private timeoutCounter: EventMetricCounter
  private processedCounter: EventMetricCounter

  // CircuitBreaker metrics
  private circuitBreakerStateGauge: EventMetricGauge
  private circuitBreakerTransitionsCounter: EventMetricCounter
  private circuitBreakerFailuresCounter: EventMetricCounter
  private circuitBreakerSuccessesCounter: EventMetricCounter
  private circuitBreakerOpenDurationHistogram: EventMetricHistogram

  /**
   * Create a new EventMetrics instance.
   *
   * @param registry - MetricsRegistry from @gravito/monitor
   * @param prefix - Metric name prefix (default: 'gravito_event_')
   */
  constructor(
    registry: any, // MetricsRegistry type
    prefix = 'gravito_event_'
  ) {
    // Initialize histogram for event dispatch latency
    this.dispatchLatency = registry.histogram({
      name: `${prefix}dispatch_latency_seconds`,
      help: 'Event dispatch latency in seconds',
      labels: ['event_name', 'priority'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    })

    // Initialize histogram for listener execution time
    this.listenerExecutionTime = registry.histogram({
      name: `${prefix}listener_execution_seconds`,
      help: 'Listener execution time in seconds',
      labels: ['event_name', 'listener_index'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    })

    // Initialize gauge for queue depth
    this.queueDepthGauge = registry.gauge({
      name: `${prefix}queue_depth`,
      help: 'Current queue depth by priority',
      labels: ['priority'],
    })

    // Initialize counter for failures
    this.failureCounter = registry.counter({
      name: `${prefix}failures_total`,
      help: 'Total number of failed event processing',
      labels: ['event_name', 'error_type'],
    })

    // Initialize counter for timeouts
    this.timeoutCounter = registry.counter({
      name: `${prefix}timeouts_total`,
      help: 'Total number of event processing timeouts',
      labels: ['event_name'],
    })

    // Initialize counter for processed events
    this.processedCounter = registry.counter({
      name: `${prefix}processed_total`,
      help: 'Total number of processed events',
      labels: ['event_name', 'status'],
    })

    // Initialize CircuitBreaker metrics
    this.circuitBreakerStateGauge = registry.gauge({
      name: `${prefix}circuit_breaker_state`,
      help: 'Current circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)',
      labels: ['event_name'],
    })

    this.circuitBreakerTransitionsCounter = registry.counter({
      name: `${prefix}circuit_breaker_transitions_total`,
      help: 'Total number of circuit breaker state transitions',
      labels: ['event_name', 'from_state', 'to_state'],
    })

    this.circuitBreakerFailuresCounter = registry.counter({
      name: `${prefix}circuit_breaker_failures_total`,
      help: 'Total number of failures tracked by circuit breaker',
      labels: ['event_name'],
    })

    this.circuitBreakerSuccessesCounter = registry.counter({
      name: `${prefix}circuit_breaker_successes_total`,
      help: 'Total number of successes tracked by circuit breaker',
      labels: ['event_name'],
    })

    this.circuitBreakerOpenDurationHistogram = registry.histogram({
      name: `${prefix}circuit_breaker_open_duration_seconds`,
      help: 'Duration of circuit breaker OPEN state in seconds',
      labels: ['event_name'],
      buckets: [1, 5, 10, 30, 60, 120, 300],
    })
  }

  /**
   * Record event dispatch latency.
   *
   * @param eventName - Name of the event
   * @param priority - Priority level (high, normal, low)
   * @param seconds - Duration in seconds
   */
  recordDispatchLatency(eventName: string, priority: string, seconds: number): void {
    this.dispatchLatency.observe(seconds, {
      event_name: eventName,
      priority,
    })
  }

  /**
   * Record listener execution time.
   *
   * @param eventName - Name of the event
   * @param index - Index of the listener in the callback list
   * @param seconds - Duration in seconds
   */
  recordListenerExecution(eventName: string, index: number, seconds: number): void {
    this.listenerExecutionTime.observe(seconds, {
      event_name: eventName,
      listener_index: String(index),
    })
  }

  /**
   * Update queue depth gauge for a specific priority.
   *
   * @param priority - Priority level (high, normal, low)
   * @param depth - Current queue depth
   */
  updateQueueDepth(priority: string, depth: number): void {
    this.queueDepthGauge.set(depth, {
      priority,
    })
  }

  /**
   * Record event processing failure.
   *
   * @param eventName - Name of the event
   * @param errorType - Type of error (e.g., 'TypeError', 'TimeoutError')
   */
  recordFailure(eventName: string, errorType: string): void {
    this.failureCounter.inc({
      event_name: eventName,
      error_type: errorType,
    })
  }

  /**
   * Record event processing timeout.
   *
   * @param eventName - Name of the event
   */
  recordTimeout(eventName: string): void {
    this.timeoutCounter.inc({
      event_name: eventName,
    })
  }

  /**
   * Record processed event (success or failure).
   *
   * @param eventName - Name of the event
   * @param status - Processing status ('success' or 'failure')
   */
  recordProcessed(eventName: string, status: 'success' | 'failure'): void {
    this.processedCounter.inc({
      event_name: eventName,
      status,
    })
  }

  /**
   * Get reference to dispatch latency histogram.
   * @internal
   */
  getDispatchLatencyHistogram(): EventMetricHistogram {
    return this.dispatchLatency
  }

  /**
   * Get reference to listener execution time histogram.
   * @internal
   */
  getListenerExecutionHistogram(): EventMetricHistogram {
    return this.listenerExecutionTime
  }

  /**
   * Get reference to queue depth gauge.
   * @internal
   */
  getQueueDepthGauge(): EventMetricGauge {
    return this.queueDepthGauge
  }

  /**
   * Record circuit breaker state change.
   *
   * @param eventName - Name of the event
   * @param state - Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
   */
  recordCircuitBreakerState(eventName: string, state: number): void {
    this.circuitBreakerStateGauge.set(state, {
      event_name: eventName,
    })
  }

  /**
   * Record circuit breaker state transition.
   *
   * @param eventName - Name of the event
   * @param fromState - Previous state
   * @param toState - New state
   */
  recordCircuitBreakerTransition(eventName: string, fromState: string, toState: string): void {
    this.circuitBreakerTransitionsCounter.inc({
      event_name: eventName,
      from_state: fromState,
      to_state: toState,
    })
  }

  /**
   * Record circuit breaker failure.
   *
   * @param eventName - Name of the event
   */
  recordCircuitBreakerFailure(eventName: string): void {
    this.circuitBreakerFailuresCounter.inc({
      event_name: eventName,
    })
  }

  /**
   * Record circuit breaker success.
   *
   * @param eventName - Name of the event
   */
  recordCircuitBreakerSuccess(eventName: string): void {
    this.circuitBreakerSuccessesCounter.inc({
      event_name: eventName,
    })
  }

  /**
   * Record circuit breaker OPEN duration.
   *
   * @param eventName - Name of the event
   * @param seconds - Duration in seconds
   */
  recordCircuitBreakerOpenDuration(eventName: string, seconds: number): void {
    this.circuitBreakerOpenDurationHistogram.observe(seconds, {
      event_name: eventName,
    })
  }
}
