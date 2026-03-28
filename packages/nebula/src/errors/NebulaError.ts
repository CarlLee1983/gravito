import { StorageException, type InfrastructureExceptionOptions } from '@gravito/core'
import type { NebulaErrorCode } from './codes'

/**
 * Concrete error class for the nebula (file storage) package.
 * Extends StorageException to participate in the GravitoException hierarchy.
 * @public
 */
export class NebulaError extends StorageException {
  constructor(
    status: number,
    code: NebulaErrorCode,
    options: InfrastructureExceptionOptions = {}
  ) {
    super(status, code, options)
    this.name = 'NebulaError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
