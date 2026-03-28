import { InfrastructureException, type InfrastructureExceptionOptions } from '@gravito/core'

/**
 * Namespace of dot-separated beam error codes per GravitoException convention.
 */
export const BeamErrorCodes = {
  POOL_EXHAUSTED: 'beam.pool_exhausted',
  CONNECTION_FAILED: 'beam.connection_failed',
  TIMEOUT: 'beam.timeout',
  NETWORK_ERROR: 'beam.network_error',
  HTTP_ERROR: 'beam.http_error',
  POOL_CLOSED: 'beam.pool_closed',
  NO_POOL: 'beam.no_pool',
  NO_METRICS: 'beam.no_metrics',
} as const

/**
 * Base Beam Error class
 *
 * Base class for all Beam related errors, providing a unified error format.
 * Extends InfrastructureException from @gravito/core for consistent error hierarchy.
 */
export class BeamError extends InfrastructureException {
  /**
   * @param message - Error message
   * @param status - HTTP status code (optional, defaults to 503)
   * @param code - Error code (optional, defaults to 'beam.error')
   * @param cause - Original error (optional)
   */
  constructor(message: string, status?: number, code?: string, cause?: unknown) {
    const options: InfrastructureExceptionOptions = { message, cause }
    super(status ?? 503, code ?? 'beam.error', options)
    this.name = 'BeamError'
    // Fix prototype chain issue when extending Error in TypeScript
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Network Error
 *
 * Thrown when a network connection fails (e.g., DNS lookup failure, connection refused, etc.)
 */
export class BeamNetworkError extends BeamError {
  /**
   * @param message - Error message
   * @param cause - Original error (optional)
   */
  constructor(message: string, cause?: unknown) {
    super(message, undefined, 'NETWORK_ERROR', cause)
    this.name = 'BeamNetworkError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Timeout Error
 *
 * Thrown when a request exceeds the specified timeout duration
 */
export class BeamTimeoutError extends BeamError {
  /**
   * @param timeout - Timeout duration (milliseconds)
   */
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`, undefined, 'TIMEOUT')
    this.name = 'BeamTimeoutError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * HTTP Error
 *
 * Thrown when the server returns a 4xx or 5xx status code
 */
export class BeamHttpError extends BeamError {
  /**
   * @param message - Error message
   * @param status - HTTP status code
   * @param response - Response body (optional)
   */
  constructor(
    message: string,
    status: number,
    public readonly response?: unknown
  ) {
    super(message, status, `HTTP_${status}`)
    this.name = 'BeamHttpError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Connection Pool Exhausted Error
 *
 * Thrown when the connection pool cannot acquire a connection within the
 * specified timeout period because all connections are in use and the
 * maximum number of connections has been reached.
 */
export class BeamPoolExhaustedError extends BeamError {
  /**
   * @param hostname - Hostname for which the pool was exhausted
   * @param timeoutMs - How long we waited before giving up (milliseconds)
   */
  constructor(hostname: string, timeoutMs: number) {
    super(
      `Connection pool exhausted for ${hostname} (waited ${timeoutMs}ms)`,
      undefined,
      'POOL_EXHAUSTED'
    )
    this.name = 'BeamPoolExhaustedError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
