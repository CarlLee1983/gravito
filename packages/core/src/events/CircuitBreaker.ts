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
   * Callback when circuit opens.
   */
  onOpen?: () => void

  /**
   * Callback when circuit moves to half-open.
   */
  onHalfOpen?: () => void

  /**
   * Callback when circuit closes.
   */
  onClose?: () => void
}

/**
 * Circuit Breaker implementation for fault tolerance.
 *
 * Prevents cascading failures by stopping execution of a failing operation
 * for a specified period after a threshold of failures is reached.
 *
 * @public
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failureCount = 0
  private successCount = 0
  private nextAttempt = 0
  private config: Required<CircuitBreakerOptions>

  constructor(options: CircuitBreakerOptions = {}) {
    this.config = {
      failureThreshold: 5,
      resetTimeout: 30000,
      halfOpenRequests: 3,
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
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() >= this.nextAttempt) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN)
      } else {
        const remaining = Math.ceil((this.nextAttempt - Date.now()) / 1000)
        throw new Error(`Circuit is OPEN. Retry in ${remaining}s`)
      }
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
   * Get failure count.
   */
  getFailureCount(): number {
    return this.failureCount
  }

  /**
   * Manually reset the circuit breaker.
   */
  reset(): void {
    this.failureCount = 0
    this.successCount = 0
    this.transitionTo(CircuitBreakerState.CLOSED)
  }

  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++
      if (this.successCount >= this.config.halfOpenRequests) {
        this.transitionTo(CircuitBreakerState.CLOSED)
      }
    } else {
      // In CLOSED state, we can optionally reset failures on success
      // typically we might want to reset failure count if it was growing but didn't hit threshold
      // For simplicity here, we reset it on success to handle transient failure groups
      this.failureCount = 0
    }
  }

  private onFailure(): void {
    if (this.state === CircuitBreakerState.CLOSED) {
      this.failureCount++
      if (this.failureCount >= this.config.failureThreshold) {
        this.transitionTo(CircuitBreakerState.OPEN)
      }
    } else if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionTo(CircuitBreakerState.OPEN)
    }
  }

  private transitionTo(newState: CircuitBreakerState): void {
    this.state = newState

    switch (newState) {
      case CircuitBreakerState.OPEN:
        this.nextAttempt = Date.now() + this.config.resetTimeout
        this.config.onOpen()
        break
      case CircuitBreakerState.HALF_OPEN:
        this.successCount = 0
        this.config.onHalfOpen()
        break
      case CircuitBreakerState.CLOSED:
        this.failureCount = 0
        this.successCount = 0
        this.config.onClose()
        break
    }
  }
}
