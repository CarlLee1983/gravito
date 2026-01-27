/**
 * @fileoverview Ripple error types
 *
 * @module @gravito/ripple/errors
 */

/**
 * Base error class for Ripple module.
 *
 * Provides structured error handling with error codes and messages.
 *
 * @example
 * ```typescript
 * throw new RippleError('INVALID_FORMAT', 'Invalid message format')
 * ```
 */
export class RippleError extends Error {
  /**
   * Creates a new RippleError instance.
   *
   * @param code - The error code.
   * @param message - The error message.
   */
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'RippleError'
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, RippleError.prototype)
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
   */
  constructor(code: string, message: string) {
    super(code, message)
    this.name = 'RippleDriverError'
    Object.setPrototypeOf(this, RippleDriverError.prototype)
  }
}
