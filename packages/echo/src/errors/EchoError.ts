/**
 * @fileoverview Echo error types
 *
 * @module @gravito/echo/errors
 */

import { InfrastructureException, type InfrastructureExceptionOptions } from '@gravito/core'
import type { EchoErrorCode } from './codes'

/**
 * Base error class for Echo module.
 *
 * Provides structured error handling with error codes and messages.
 * Extends InfrastructureException for unified error handling across Gravito.
 *
 * @example
 * ```typescript
 * throw new EchoError('echo.unknown_provider', 'Unknown provider type: stripe')
 * ```
 * @public
 */
export class EchoError extends InfrastructureException {
  /**
   * Creates a new EchoError instance.
   *
   * @param code - The error code.
   * @param message - The error message.
   * @param options - Optional infrastructure exception options.
   */
  constructor(
    code: EchoErrorCode,
    message: string,
    options: InfrastructureExceptionOptions = {}
  ) {
    const status = options.retryable ? 503 : 500
    super(status, code, { message, ...options })
    this.name = 'EchoError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
