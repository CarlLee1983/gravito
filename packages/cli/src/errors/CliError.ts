import { SystemException, type ExceptionOptions } from '@gravito/core'
import type { CliErrorCode } from './codes'

export class CliError extends SystemException {
  constructor(status: number, code: CliErrorCode, options: ExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'CliError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
