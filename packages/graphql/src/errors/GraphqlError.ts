/**
 * @fileoverview GraphQL error types
 *
 * @module @gravito/graphql/errors
 */

import { SystemException, type ExceptionOptions } from '@gravito/core'
import type { GraphqlErrorCode } from './codes'

/**
 * Base error class for GraphQL module.
 *
 * Provides structured error handling with error codes and messages.
 * Extends SystemException for system/framework-level errors.
 *
 * @example
 * ```typescript
 * throw new GraphqlError('graphql.invalid_cursor', 'Invalid cursor data structure')
 * ```
 * @public
 */
export class GraphqlError extends SystemException {
  /**
   * Creates a new GraphqlError instance.
   *
   * @param code - The error code.
   * @param message - The error message.
   * @param options - Optional exception options.
   */
  constructor(code: GraphqlErrorCode, message: string, options: ExceptionOptions = {}) {
    super(500, code, { message, ...options })
    this.name = 'GraphqlError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
