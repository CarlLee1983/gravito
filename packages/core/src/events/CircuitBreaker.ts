/**
 * Circuit Breaker state enum.
 * @public
 */
export enum CircuitBreakerState {
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
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failureCount = 0
  private successCount = 0
  private nextAttempt = 0
  private name: string
  private config: Required<CircuitBreakerOptions>

  // Advanced tracking
  private lastFailureAt?: Date
  private lastSuccessAt?: Date
  private openedAt?: Date
  private totalRequests = 0
  private totalFailures = 0
  private totalSuccesses = 0
  private halfOpenAttempts = 0

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
  constructor(
    nameOrOptions?: string | CircuitBreakerOptions,
    maybeOptions?: CircuitBreakerOptions
  ) {
    // Parse overloaded constructor
    let options: CircuitBreakerOptions = {}

    if (typeof nameOrOptions === 'string') {
      this.name = nameOrOptions
      options = maybeOptions || {}
    } else if (typeof nameOrOptions === 'object' && nameOrOptions !== null) {
      this.name = 'circuit-breaker'
      options = nameOrOptions
    } else {
      this.name = 'circuit-breaker'
    }

    // Apply defaults
    this.config = {
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenRequests: 3,
      successThreshold: 2,
      windowSize: 60000,
      enabled: true,
      onOpen: options.onOpen || (() => {}),
      onHalfOpen: options.onHalfOpen || (() => {}),
      onClose: options.onClose || (() => {}),
      ...options,
    }
  }

  /**
   * Execute an operation through the circuit breaker.
   *
   * @param operation - Async operation to execute
   * @returns Operation result
   * @throws Error if circuit is open or operation fails
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // If disabled, bypass circuit breaker logic
    if (!this.config.enabled) {
      return await operation()
    }

    this.totalRequests++

    // Check for automatic state transitions
    this.checkStateTransition()

    // Reject if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      const remaining = this.openedAt
        ? Math.ceil((this.nextAttempt - Date.now()) / 1000)
        : Math.ceil(this.config.resetTimeout / 1000)
      throw new Error(`Circuit is OPEN for ${this.name}. Retry in ${remaining}s`)
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Get current state of the circuit breaker.
   */
  getState(): CircuitBreakerState {
    return this.state
  }

  /**
   * Get failure count (deprecated, use getMetrics for complete information).
   */
  getFailureCount(): number {
    return this.failureCount
  }

  /**
   * Get the name of this circuit breaker.
   */
  getName(): string {
    return this.name
  }

  /**
   * Get detailed metrics snapshot of the circuit breaker.
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      openedAt: this.openedAt,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    }
  }

  /**
   * Manually reset the circuit breaker to CLOSED state.
   */
  reset(): void {
    this.failureCount = 0
    this.successCount = 0
    this.halfOpenAttempts = 0
    this.openedAt = undefined
    this.transitionTo(CircuitBreakerState.CLOSED)
  }

  /**
   * Forcefully reset the circuit breaker (alias for reset).
   */
  manualReset(): void {
    this.reset()
  }

  /**
   * Check for automatic state transitions based on time and sliding window.
   */
  private checkStateTransition(): void {
    // OPEN → HALF_OPEN: Check if timeout has elapsed
    if (this.state === CircuitBreakerState.OPEN && this.openedAt) {
      const elapsed = Date.now() - this.openedAt.getTime()
      if (elapsed >= this.config.resetTimeout) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN)
        this.halfOpenAttempts = 0
      }
    }

    // Sliding window: Reset failure counter if window has expired
    if (this.lastFailureAt) {
      const elapsed = Date.now() - this.lastFailureAt.getTime()
      if (elapsed >= this.config.windowSize) {
        this.failureCount = 0
      }
    }
  }

  private onSuccess(): void {
    this.lastSuccessAt = new Date()
    this.successCount++
    this.totalSuccesses++

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenAttempts++
      if (this.halfOpenAttempts >= this.config.successThreshold) {
        this.transitionTo(CircuitBreakerState.CLOSED)
        this.reset()
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success to ensure fresh window
      this.failureCount = 0
    }
  }

  private onFailure(): void {
    this.lastFailureAt = new Date()
    this.totalFailures++
    this.failureCount++

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in HALF_OPEN immediately trips back to OPEN
      this.transitionTo(CircuitBreakerState.OPEN)
      this.openedAt = new Date()
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Trip to OPEN if failure threshold is reached
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionTo(CircuitBreakerState.OPEN)
        this.openedAt = new Date()
      }
    }
  }

  private transitionTo(newState: CircuitBreakerState): void {
    this.state = newState

    switch (newState) {
      case CircuitBreakerState.OPEN:
        this.nextAttempt = Date.now() + this.config.resetTimeout
        this.config.onOpen(this.name)
        break
      case CircuitBreakerState.HALF_OPEN:
        this.halfOpenAttempts = 0
        this.config.onHalfOpen(this.name)
        break
      case CircuitBreakerState.CLOSED:
        this.failureCount = 0
        this.successCount = 0
        this.halfOpenAttempts = 0
        this.openedAt = undefined
        this.config.onClose(this.name)
        break
    }
  }
}
