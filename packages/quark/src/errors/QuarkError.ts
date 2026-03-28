/**
 * @fileoverview Quark error types
 *
 * @module @gravito/quark/errors
 */

import { InfrastructureException, type InfrastructureExceptionOptions } from '@gravito/core'
import type { QuarkErrorCode } from './codes'

/**
 * Base error class for Quark module.
 *
 * Provides structured error handling with error codes and messages.
 * Extends InfrastructureException for unified error handling across Gravito.
 *
 * @example
 * ```typescript
 * throw new QuarkError('quark.invalid_state', 'Cannot send in disconnected state')
 * ```
 * @public
 */
export class QuarkError extends InfrastructureException {
  /**
   * Creates a new QuarkError instance.
   *
   * @param code - The error code.
   * @param message - The error message.
   * @param options - Optional infrastructure exception options.
   */
  constructor(
    code: QuarkErrorCode,
    message: string,
    options: InfrastructureExceptionOptions = {}
  ) {
    const status = options.retryable ? 503 : 500
    super(status, code, { message, ...options })
    this.name = 'QuarkError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
