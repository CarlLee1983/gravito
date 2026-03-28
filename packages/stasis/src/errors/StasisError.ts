import { StorageException, type InfrastructureExceptionOptions } from '@gravito/core'
import type { StasisErrorCode } from './codes'

/**
 * Concrete error class for the stasis (cache) package.
 * Extends StorageException to participate in the GravitoException hierarchy.
 * @public
 */
export class StasisError extends StorageException {
  constructor(
    status: number,
    code: StasisErrorCode,
    options: InfrastructureExceptionOptions = {}
  ) {
    super(status, code, options)
    this.name = 'StasisError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
