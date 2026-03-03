/**
 * @gravito/core - Event System Metrics
 *
 * Manages metric collection for event dispatch and listener execution.
 */
import type { EventMetricGauge, EventMetricHistogram } from './metrics-types'
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
export declare class EventMetrics {
  private dispatchLatency
  private listenerExecutionTime
  private queueDepthGauge
  private failureCounter
  private timeoutCounter
  private processedCounter
  private circuitBreakerStateGauge
  private circuitBreakerTransitionsCounter
  private circuitBreakerFailuresCounter
  private circuitBreakerSuccessesCounter
  private circuitBreakerOpenDurationHistogram
  /**
   * Create a new EventMetrics instance.
   *
   * @param registry - MetricsRegistry from @gravito/monitor
   * @param prefix - Metric name prefix (default: 'gravito_event_')
   */
  constructor(
    registry: any, // MetricsRegistry type
    prefix?: string
  )
  /**
   * Record event dispatch latency.
   *
   * @param eventName - Name of the event
   * @param priority - Priority level (high, normal, low)
   * @param seconds - Duration in seconds
   */
  recordDispatchLatency(eventName: string, priority: string, seconds: number): void
  /**
   * Record listener execution time.
   *
   * @param eventName - Name of the event
   * @param index - Index of the listener in the callback list
   * @param seconds - Duration in seconds
   */
  recordListenerExecution(eventName: string, index: number, seconds: number): void
  /**
   * Update queue depth gauge for a specific priority.
   *
   * @param priority - Priority level (high, normal, low)
   * @param depth - Current queue depth
   */
  updateQueueDepth(priority: string, depth: number): void
  /**
   * Record event processing failure.
   *
   * @param eventName - Name of the event
   * @param errorType - Type of error (e.g., 'TypeError', 'TimeoutError')
   */
  recordFailure(eventName: string, errorType: string): void
  /**
   * Record event processing timeout.
   *
   * @param eventName - Name of the event
   */
  recordTimeout(eventName: string): void
  /**
   * Record processed event (success or failure).
   *
   * @param eventName - Name of the event
   * @param status - Processing status ('success' or 'failure')
   */
  recordProcessed(eventName: string, status: 'success' | 'failure'): void
  /**
   * Get reference to dispatch latency histogram.
   * @internal
   */
  getDispatchLatencyHistogram(): EventMetricHistogram
  /**
   * Get reference to listener execution time histogram.
   * @internal
   */
  getListenerExecutionHistogram(): EventMetricHistogram
  /**
   * Get reference to queue depth gauge.
   * @internal
   */
  getQueueDepthGauge(): EventMetricGauge
  /**
   * Record circuit breaker state change.
   *
   * @param eventName - Name of the event
   * @param state - Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
   */
  recordCircuitBreakerState(eventName: string, state: number): void
  /**
   * Record circuit breaker state transition.
   *
   * @param eventName - Name of the event
   * @param fromState - Previous state
   * @param toState - New state
   */
  recordCircuitBreakerTransition(eventName: string, fromState: string, toState: string): void
  /**
   * Record circuit breaker failure.
   *
   * @param eventName - Name of the event
   */
  recordCircuitBreakerFailure(eventName: string): void
  /**
   * Record circuit breaker success.
   *
   * @param eventName - Name of the event
   */
  recordCircuitBreakerSuccess(eventName: string): void
  /**
   * Record circuit breaker OPEN duration.
   *
   * @param eventName - Name of the event
   * @param seconds - Duration in seconds
   */
  recordCircuitBreakerOpenDuration(eventName: string, seconds: number): void
}
