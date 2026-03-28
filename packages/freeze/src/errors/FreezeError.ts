import { StorageException, type InfrastructureExceptionOptions } from '@gravito/core'
import type { FreezeErrorCode } from './codes'

/**
 * Concrete error class for the freeze (i18n/localization) package.
 * Extends StorageException to participate in the GravitoException hierarchy.
 * @public
 */
export class FreezeError extends StorageException {
  constructor(
    status: number,
    code: FreezeErrorCode,
    options: InfrastructureExceptionOptions = {}
  ) {
    super(status, code, options)
    this.name = 'FreezeError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
