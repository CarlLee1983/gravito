import { InfrastructureException, type InfrastructureExceptionOptions } from '@gravito/core'
import type { PulsarErrorCode } from './codes'

/**
 * Concrete error class for the pulsar (session) package.
 * Extends InfrastructureException to participate in the GravitoException hierarchy.
 * @public
 */
export class PulsarError extends InfrastructureException {
  constructor(
    status: number,
    code: PulsarErrorCode,
    options: InfrastructureExceptionOptions = {}
  ) {
    super(status, code, options)
    this.name = 'PulsarError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
