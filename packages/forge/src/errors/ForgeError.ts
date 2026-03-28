import { InfrastructureException, type InfrastructureExceptionOptions } from '@gravito/core'
import type { ForgeErrorCode } from './codes'

/**
 * Concrete error class for the forge (media processing) package.
 * Extends InfrastructureException to participate in the GravitoException hierarchy.
 * @public
 */
export class ForgeError extends InfrastructureException {
  constructor(
    status: number,
    code: ForgeErrorCode,
    options: InfrastructureExceptionOptions = {}
  ) {
    super(status, code, options)
    this.name = 'ForgeError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
