import { InfrastructureException } from '@gravito/core'

/**
 * Thrown when a circuit breaker is in the OPEN state and rejects the call.
 * @public
 */
export class CircuitOpenException extends InfrastructureException {
  constructor(options: { cause?: unknown; breakerName?: string } = {}) {
    super(503, 'resilience.circuit_open', {
      message: options.breakerName
        ? `Circuit breaker is OPEN for ${options.breakerName}`
        : 'Circuit breaker is OPEN',
      cause: options.cause,
      retryable: false,
    })
    this.name = 'CircuitOpenException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
