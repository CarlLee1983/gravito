import { AuthException, type ExceptionOptions } from '@gravito/core'
import type { SentinelErrorCode } from './codes'

/**
 * Base error class for @gravito/sentinel authentication operations.
 * Extends AuthException as sentinel is the authentication/security domain.
 *
 * @public
 */
export class SentinelError extends AuthException {
  constructor(
    status: number,
    code: SentinelErrorCode,
    options: ExceptionOptions = {}
  ) {
    super(status, code, options)
    this.name = 'SentinelError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
