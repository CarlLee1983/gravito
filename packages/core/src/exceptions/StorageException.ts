import { InfrastructureException, type InfrastructureExceptionOptions } from './InfrastructureException'

/**
 * Abstract base class for file/object storage infrastructure errors.
 * Used by constellation, nebula, nebula-s3, freeze, stasis packages.
 * @public
 */
export abstract class StorageException extends InfrastructureException {
  constructor(status: number, code: string, options: InfrastructureExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'StorageException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
