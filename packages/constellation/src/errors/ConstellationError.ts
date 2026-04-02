import { type InfrastructureExceptionOptions, StorageException } from '@gravito/core'
import type { ConstellationErrorCode } from './codes'

/**
 * Concrete error class for the constellation (sitemap/SEO) package.
 * Extends StorageException to participate in the GravitoException hierarchy.
 * @public
 */
export class ConstellationError extends StorageException {
  override name = 'ConstellationError'

  constructor(
    status: number,
    code: ConstellationErrorCode,
    options: InfrastructureExceptionOptions = {}
  ) {
    super(status, code, options)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
