/**
 * @fileoverview Impulse error types
 *
 * @module @gravito/impulse/errors
 */

import { InfrastructureException, type InfrastructureExceptionOptions } from '@gravito/core'
import type { ImpulseErrorCode } from './codes'

/**
 * Base error class for Impulse module.
 *
 * Provides structured error handling with error codes and messages.
 * Extends InfrastructureException for unified error handling across Gravito.
 *
 * @example
 * ```typescript
 * throw new ImpulseError('impulse.unsupported_schema', 'Unsupported schema type')
 * ```
 * @public
 */
export class ImpulseError extends InfrastructureException {
  /**
   * Creates a new ImpulseError instance.
   *
   * @param code - The error code.
   * @param message - The error message.
   * @param options - Optional infrastructure exception options.
   */
  constructor(
    code: ImpulseErrorCode,
    message: string,
    options: InfrastructureExceptionOptions = {}
  ) {
    const status = options.retryable ? 503 : 500
    super(status, code, { message, ...options })
    this.name = 'ImpulseError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
