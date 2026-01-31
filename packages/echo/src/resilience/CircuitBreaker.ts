/**
 * Implementation of the Circuit Breaker pattern.
 *
 * Protects downstream services from cascading failures by monitoring error rates
 * and temporarily "tripping" the circuit when thresholds are exceeded. This
 * prevents unnecessary load on struggling services and allows them time to recover.
 *
 * @module @gravito/echo/resilience
 * @since 1.1.0
 */

import type { CircuitBreakerConfig, CircuitBreakerMetrics, CircuitBreakerState } from '../types'

/**
 * Default internal configuration for the circuit breaker.
 */
const DEFAULT_CONFIG: Required<CircuitBreakerConfig> = {
  enabled: true,
  failureThreshold: 5,
  successThreshold: 2,
  windowSize: 60000, // 1 minute
  openTimeout: 30000, // 30 seconds
  onOpen: () => {},
  onHalfOpen: () => {},
  onClose: () => {},
}

/**
 * State machine for managing downstream service availability via the Circuit Breaker pattern.
 *
 * This implementation tracks failures and successes to determine one of three states:
 * - `CLOSED`: Healthy state. All requests are executed normally.
 * - `OPEN`: Failing state. Trip thresholds exceeded; requests are rejected immediately to
 *   prevent cascading failure and give the target system time to recover.
 * - `HALF_OPEN`: Recovery phase. Allows a limited number of test requests to determine
 *   if the downstream service has restored functionality.
 *
 * @example Protecting a fragile API call
 * ```typescript
 * const breaker = new CircuitBreaker('inventory-service', {
 *   failureThreshold: 5,
 *   openTimeout: 60000 // Stay open for 1 minute before testing recovery
 * });
 *
 * try {
 *   const stock = await breaker.execute(async () => {
 *     return await apiClient.getInventory();
 *   });
 * } catch (error) {
 *   if (error.message.includes('Circuit breaker is OPEN')) {
 *     // Redirect to fallback or return cached data
 *   }
 * }
 * ```
 *
 * @public
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED'
  private failures = 0
  private successes = 0
  private lastFailureAt?: Date
  private lastSuccessAt?: Date
  private openedAt?: Date
  private halfOpenAttempts = 0

  private config: Required<CircuitBreakerConfig>

  /**
   * Constructs a new CircuitBreaker for a specific resource, host, or service.
   *
   * @param name - A semantic identifier for the target being protected.
   * @param config - Policy settings for failure thresholds, recovery timeouts, and callbacks.
   */
  constructor(
    private readonly name: string,
    config: CircuitBreakerConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Executes an asynchronous operation within the safety window of the circuit breaker.
   *
   * This method will proactively check the circuit state. If the state is `OPEN`, it will
   * throw an error immediately without invoking the provided function.
   *
   * @param fn - The asynchronous operation to be protected.
   * @returns A promise resolving to the result of the protected operation.
   * @throws {Error} If the circuit is currently `OPEN` or if the underlying operation fails.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return await fn()
    }

    this.checkStateTransition()

    if (this.state === 'OPEN') {
      throw new Error(`Circuit breaker is OPEN for ${this.name}`)
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Records a successful operation and updates the state machine.
   * In `HALF_OPEN` state, this contributes to the success threshold for closing the circuit.
   */
  private onSuccess(): void {
    this.lastSuccessAt = new Date()
    this.successes++

    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++
      if (this.halfOpenAttempts >= this.config.successThreshold) {
        this.transitionTo('CLOSED')
        this.reset()
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success when in CLOSED state to ensure fresh window
      this.failures = 0
    }
  }

  /**
   * Records a failed operation and determines if the circuit should trip to `OPEN`.
   * Any failure in `HALF_OPEN` state immediately trips the circuit back to `OPEN`.
   */
  private onFailure(): void {
    this.lastFailureAt = new Date()
    this.failures++

    if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN immediately trips back to OPEN
      this.transitionTo('OPEN')
      this.openedAt = new Date()
    } else if (this.state === 'CLOSED') {
      // Trip to OPEN if failure threshold is reached
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo('OPEN')
        this.openedAt = new Date()
      }
    }
  }

  /**
   * Evaluates and performs automatic state transitions based on elapsed time and thresholds.
   */
  private checkStateTransition(): void {
    if (this.state === 'OPEN' && this.openedAt) {
      const elapsed = Date.now() - this.openedAt.getTime()
      if (elapsed >= this.config.openTimeout) {
        this.transitionTo('HALF_OPEN')
        this.halfOpenAttempts = 0
      }
    }

    // Reset failure counter if the sliding window has expired
    if (this.lastFailureAt) {
      const elapsed = Date.now() - this.lastFailureAt.getTime()
      if (elapsed >= this.config.windowSize) {
        this.failures = 0
      }
    }
  }

  /**
   * Transitions the circuit to a new state and executes configured lifecycle callbacks.
   *
   * @param newState - The target state to transition into.
   */
  private transitionTo(newState: CircuitBreakerState): void {
    this.state = newState

    switch (newState) {
      case 'OPEN':
        this.config.onOpen(this.name)
        break
      case 'HALF_OPEN':
        this.config.onHalfOpen(this.name)
        break
      case 'CLOSED':
        this.config.onClose(this.name)
        break
    }
  }

  /**
   * Resets all internal counters and timers to their initial baseline state.
   */
  private reset(): void {
    this.failures = 0
    this.successes = 0
    this.halfOpenAttempts = 0
    this.openedAt = undefined
  }

  /**
   * Retrieves a snapshot of the current health and performance metrics of the circuit.
   *
   * @returns An object containing state, failure counts, and activity timestamps.
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      openedAt: this.openedAt,
    }
  }

  /**
   * Forcefully resets the circuit breaker to the `CLOSED` state.
   * Useful for manual recovery scenarios after a service has been verified healthy.
   */
  manualReset(): void {
    this.transitionTo('CLOSED')
    this.reset()
  }

  /**
   * Returns the current operational state of the circuit breaker.
   *
   * @returns The current state identifier.
   */
  getState(): CircuitBreakerState {
    return this.state
  }

  /**
   * Returns the semantic name assigned to this circuit breaker instance.
   *
   * @returns The name identifier.
   */
  getName(): string {
    return this.name
  }
}
