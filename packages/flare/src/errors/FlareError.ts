/**
 * @fileoverview Flare error types
 *
 * @module @gravito/flare/errors
 */

import { InfrastructureException, type InfrastructureExceptionOptions } from '@gravito/core'
import type { FlareErrorCode } from './codes'

/**
 * Base error class for Flare module.
 *
 * Provides structured error handling with error codes and messages.
 * Extends InfrastructureException for unified error handling across Gravito.
 *
 * @example
 * ```typescript
 * throw new FlareError('flare.send_failed', 'Failed to send notification')
 * ```
 * @public
 */
export class FlareError extends InfrastructureException {
  /**
   * Creates a new FlareError instance.
   *
   * @param code - The error code.
   * @param message - The error message.
   * @param options - Optional infrastructure exception options.
   */
  constructor(
    code: FlareErrorCode,
    message: string,
    options: InfrastructureExceptionOptions = {}
  ) {
    const status = options.retryable ? 503 : 500
    super(status, code, { message, ...options })
    this.name = 'FlareError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
