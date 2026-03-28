import { InfrastructureException, type InfrastructureExceptionOptions } from '@gravito/core'
import type { LuminosityErrorCode } from './codes'

export class LuminosityError extends InfrastructureException {
  constructor(
    status: number,
    code: LuminosityErrorCode,
    options: InfrastructureExceptionOptions = {}
  ) {
    super(status, code, options)
    this.name = 'LuminosityError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
