/**
 * @fileoverview Ripple error types
 *
 * @module @gravito/ripple/errors
 */

import { InfrastructureException, type InfrastructureExceptionOptions } from '@gravito/core'

/**
 * Error codes for Ripple module operations.
 * Follows dot-separated namespace convention.
 */
export const RippleErrorCodes = {
  CONNECTION_FAILED: 'ripple.connection_failed',
  QUERY_FAILED: 'ripple.query_failed',
  DRIVER_ERROR: 'ripple.driver_error',
  UNSUPPORTED_RUNTIME: 'ripple.unsupported_runtime',
  NOT_INITIALIZED: 'ripple.not_initialized',
  INVALID_OPERATION: 'ripple.invalid_operation',
  SERIALIZATION_FAILED: 'ripple.serialization_failed',
  MIDDLEWARE_ERROR: 'ripple.middleware_error',
} as const

export type RippleErrorCode = (typeof RippleErrorCodes)[keyof typeof RippleErrorCodes]

/**
 * Base error class for Ripple module.
 *
 * Provides structured error handling with error codes and messages.
 * Extends InfrastructureException for unified error handling across Gravito.
 *
 * @example
 * ```typescript
 * throw new RippleError('ripple.invalid_format', 'Invalid message format')
 * ```
 */
export class RippleError extends InfrastructureException {
  /**
   * Creates a new RippleError instance.
   *
   * @param code - The error code.
   * @param message - The error message.
   * @param options - Optional infrastructure exception options.
   */
  constructor(
    code: string,
    message: string,
    options: InfrastructureExceptionOptions = {}
  ) {
    const status = options.retryable ? 503 : 500
    super(status, code, { message, ...options })
    this.name = 'RippleError'
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Error class for driver-related issues.
 *
 * Used specifically for errors that occur in driver implementations
 * (LocalDriver, RedisDriver).
 *
 * @example
 * ```typescript
 * throw new RippleDriverError(
 *   'REDIS_NOT_INSTALLED',
 *   'ioredis is required for RedisDriver'
 * )
 * ```
 */
export class RippleDriverError extends RippleError {
  /**
   * Creates a new RippleDriverError instance.
   *
   * @param code - The error code.
   * @param message - The error message.
   * @param options - Optional infrastructure exception options.
   */
  constructor(code: string, message: string, options: InfrastructureExceptionOptions = {}) {
    super(code, message, options)
    this.name = 'RippleDriverError'
    Object.setPrototypeOf(this, RippleDriverError.prototype)
  }
}
