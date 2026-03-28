/**
 * @fileoverview Radiance error types
 *
 * @module @gravito/radiance/errors
 */

import { InfrastructureException, type InfrastructureExceptionOptions } from '@gravito/core'
import type { RadianceErrorCode } from './codes'

/**
 * Base error class for Radiance module.
 *
 * Provides structured error handling with error codes and messages.
 * Extends InfrastructureException for unified error handling across Gravito.
 *
 * @example
 * ```typescript
 * throw new RadianceError('radiance.broadcast_failed', 'Failed to broadcast via Pusher')
 * ```
 * @public
 */
export class RadianceError extends InfrastructureException {
  /**
   * Creates a new RadianceError instance.
   *
   * @param code - The error code.
   * @param message - The error message.
   * @param options - Optional infrastructure exception options.
   */
  constructor(
    code: RadianceErrorCode,
    message: string,
    options: InfrastructureExceptionOptions = {}
  ) {
    const status = options.retryable ? 503 : 500
    super(status, code, { message, ...options })
    this.name = 'RadianceError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
