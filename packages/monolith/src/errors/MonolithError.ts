/**
 * @fileoverview Monolith error types
 *
 * @module @gravito/monolith/errors
 */

import { InfrastructureException, type InfrastructureExceptionOptions } from '@gravito/core'
import type { MonolithErrorCode } from './codes'

/**
 * Base error class for Monolith module.
 *
 * Provides structured error handling with error codes and messages.
 * Extends InfrastructureException for unified error handling across Gravito.
 *
 * @example
 * ```typescript
 * throw new MonolithError('monolith.file_not_found', 'File not found: /path/to/file')
 * ```
 * @public
 */
export class MonolithError extends InfrastructureException {
  /**
   * Creates a new MonolithError instance.
   *
   * @param code - The error code.
   * @param message - The error message.
   * @param options - Optional infrastructure exception options.
   */
  constructor(
    code: MonolithErrorCode,
    message: string,
    options: InfrastructureExceptionOptions = {}
  ) {
    const status = options.retryable ? 503 : 500
    super(status, code, { message, ...options })
    this.name = 'MonolithError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
