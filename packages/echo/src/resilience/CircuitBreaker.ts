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
 * State machine for managing service availability.
 *
 * - CLOSED: Normal state, all requests are executed.
 * - OPEN: Failure threshold exceeded, requests are immediately rejected.
 * - HALF_OPEN: Recovery testing phase, allowing a limited number of requests.
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker('inventory-service', {
 *   failureThreshold: 5,
 *   openTimeout: 60000
 * });
 *
 * try {
 *   const result = await breaker.execute(async () => {
 *     return await apiClient.checkStock('SKU-123');
 *   });
 * } catch (error) {
 *   if (error.message.includes('Circuit breaker is OPEN')) {
 *     // Handle graceful degradation
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
   * Constructs a new CircuitBreaker for a specific resource or host.
   *
   * @param name - Semantic identifier for the target being protected.
   * @param config - Policy settings for failure thresholds and timeouts.
   */
  constructor(
    private readonly name: string,
    config: CircuitBreakerConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Executes an asynchronous operation within the safety of the circuit breaker.
   *
   * If the circuit is OPEN, this method throws an error immediately without
   * attempting to execute the function.
   *
   * @param fn - The operation to protect.
   * @returns Resolves to the result of the operation.
   * @throws {Error} If the circuit is currently OPEN or the operation fails.
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
      // Reset failure count on success when in CLOSED state
      this.failures = 0
    }
  }

  /**
   * Records a failed operation and determines if the circuit should trip.
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
   * Evaluates if enough time has passed to attempt recovery.
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
   * Changes the state and triggers associated lifecycle callbacks.
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
   * Resets all internal counters to their initial state.
   */
  private reset(): void {
    this.failures = 0
    this.successes = 0
    this.halfOpenAttempts = 0
    this.openedAt = undefined
  }

  /**
   * Retrieves the current health and performance metrics of the circuit.
   *
   * @returns Current metrics snapshot.
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
   * Forcefully resets the circuit breaker to the CLOSED state.
   *
   * Typically used for manual recovery or after resolving underlying issues.
   */
  manualReset(): void {
    this.transitionTo('CLOSED')
    this.reset()
  }

  /**
   * Returns the current state of the circuit breaker.
   *
   * @returns Current state ('CLOSED', 'OPEN', or 'HALF_OPEN').
   */
  getState(): CircuitBreakerState {
    return this.state
  }

  /**
   * Returns the semantic name of the circuit breaker instance.
   *
   * @returns The name identifier.
   */
  getName(): string {
    return this.name
  }
}
