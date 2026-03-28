import { InfrastructureException, type InfrastructureExceptionOptions } from '@gravito/core'
import type { DarkMatterErrorCode } from './codes'

/**
 * Concrete error class for the dark-matter (MongoDB) package.
 * Extends InfrastructureException to participate in the GravitoException hierarchy.
 * @public
 */
export class DarkMatterError extends InfrastructureException {
  constructor(
    status: number,
    code: DarkMatterErrorCode,
    options: InfrastructureExceptionOptions = {}
  ) {
    super(status, code, options)
    this.name = 'DarkMatterError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
