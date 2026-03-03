/**
 * Circuit Breaker state enum.
 * @public
 */
export declare enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}
/**
 * Circuit Breaker metrics snapshot.
 * @public
 */
export interface CircuitBreakerMetrics {
  /**
   * Current state of the circuit breaker
   */
  state: CircuitBreakerState
  /**
   * Number of failures in the current window
   */
  failures: number
  /**
   * Number of successes in the current window
   */
  successes: number
  /**
   * Timestamp of the last failure
   */
  lastFailureAt?: Date
  /**
   * Timestamp of the last success
   */
  lastSuccessAt?: Date
  /**
   * Timestamp when the circuit was opened
   */
  openedAt?: Date
  /**
   * Total requests processed
   */
  totalRequests: number
  /**
   * Total failures recorded
   */
  totalFailures: number
  /**
   * Total successes recorded
   */
  totalSuccesses: number
}
/**
 * Circuit Breaker metrics recorder interface.
 * @public
 */
export interface CircuitBreakerMetricsRecorder {
  /**
   * Record current state of the circuit breaker.
   * @param eventName - Name of the event
   * @param state - State as number (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
   */
  recordState: (eventName: string, state: number) => void
  /**
   * Record state transition.
   */
  recordTransition: (eventName: string, fromState: string, toState: string) => void
  /**
   * Record a failure.
   */
  recordFailure: (eventName: string) => void
  /**
   * Record a success.
   */
  recordSuccess: (eventName: string) => void
  /**
   * Record OPEN state duration.
   */
  recordOpenDuration: (eventName: string, seconds: number) => void
}
/**
 * Circuit Breaker configuration options.
 * @public
 */
export interface CircuitBreakerOptions {
  /**
   * Number of consecutive failures before opening the circuit.
   * @default 5
   */
  failureThreshold?: number
  /**
   * Time in milliseconds to wait before attempting to close the circuit (move to HALF_OPEN).
   * @default 30000
   */
  resetTimeout?: number
  /**
   * Number of test requests to allow given the circuit is in HALF_OPEN state.
   * If these succeed, the circuit closes. If any fail, it opens again.
   * @default 3
   */
  halfOpenRequests?: number
  /**
   * Number of successes required in HALF_OPEN state to close the circuit.
   * @default 2
   */
  successThreshold?: number
  /**
   * Time in milliseconds for the sliding window to track failures.
   * Failures outside this window are not counted.
   * @default 60000
   */
  windowSize?: number
  /**
   * Enable or disable the circuit breaker.
   * @default true
   */
  enabled?: boolean
  /**
   * Callback when circuit opens.
   */
  onOpen?: (name?: string) => void
  /**
   * Callback when circuit moves to half-open.
   */
  onHalfOpen?: (name?: string) => void
  /**
   * Callback when circuit closes.
   */
  onClose?: (name?: string) => void
  /**
   * Metrics recorder for recording circuit breaker events.
   * Optional - if not provided, metrics will not be recorded.
   */
  metricsRecorder?: CircuitBreakerMetricsRecorder | undefined
}
/**
 * Required Circuit Breaker configuration (with defaults applied).
 * @internal
 */
export interface RequiredCircuitBreakerOptions
  extends Required<Omit<CircuitBreakerOptions, 'metricsRecorder'>> {
  metricsRecorder?: CircuitBreakerMetricsRecorder
}
/**
 * Circuit Breaker implementation for fault tolerance.
 *
 * Prevents cascading failures by stopping execution of a failing operation
 * for a specified period after a threshold of failures is reached.
 *
 * Supports sliding window algorithm, enabling/disabling, and detailed metrics.
 *
 * @public
 */
export declare class CircuitBreaker {
  private state
  private failureCount
  private successCount
  private name
  private config
  private metricsRecorder?
  private lastFailureAt?
  private lastSuccessAt?
  private openedAt?
  private totalRequests
  private totalFailures
  private totalSuccesses
  private halfOpenAttempts
  /**
   * Create a new Circuit Breaker.
   *
   * Supports two signatures for backward compatibility:
   * - CircuitBreaker(options?: CircuitBreakerOptions) - anonymous breaker
   * - CircuitBreaker(name: string, options?: CircuitBreakerOptions) - named breaker
   *
   * @param nameOrOptions - Circuit breaker name or options
   * @param maybeOptions - Options (used when first param is a string)
   */
  constructor(nameOrOptions?: string | CircuitBreakerOptions, maybeOptions?: CircuitBreakerOptions)
  /**
   * Execute an operation through the circuit breaker.
   *
   * @param operation - Async operation to execute
   * @returns Operation result
   * @throws Error if circuit is open or operation fails
   */
  execute<T>(operation: () => Promise<T>): Promise<T>
  /**
   * Check if the circuit breaker is currently OPEN.
   */
  isOpen(): boolean
  /**
   * Check if the circuit breaker is currently HALF_OPEN.
   */
  isHalfOpen(): boolean
  /**
   * Check if the circuit breaker is currently CLOSED.
   */
  isClosed(): boolean
  /**
   * Get current state of the circuit breaker.
   */
  getState(): CircuitBreakerState
  /**
   * Get failure count (deprecated, use getMetrics for complete information).
   */
  getFailureCount(): number
  /**
   * Get the name of this circuit breaker.
   */
  getName(): string
  /**
   * Get detailed metrics snapshot of the circuit breaker.
   */
  getMetrics(): CircuitBreakerMetrics
  /**
   * Manually reset the circuit breaker to CLOSED state.
   */
  reset(): void
  /**
   * Forcefully reset the circuit breaker (alias for reset).
   */
  manualReset(): void
  /**
   * Check for automatic state transitions based on time and sliding window.
   */
  checkStateTransition(): void
  private onSuccess
  private onFailure
  private transitionTo
  private stateToNumber
}
