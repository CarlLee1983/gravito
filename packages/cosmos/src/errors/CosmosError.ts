import { SystemException, type ExceptionOptions } from '@gravito/core'
import type { CosmosErrorCode } from './codes'

/**
 * Base error class for @gravito/cosmos i18n operations.
 * Extends SystemException as cosmos is a general system utility (not a domain/auth module).
 *
 * @public
 */
export class CosmosError extends SystemException {
  constructor(
    status: number,
    code: CosmosErrorCode,
    options: ExceptionOptions = {}
  ) {
    super(status, code, options)
    this.name = 'CosmosError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
