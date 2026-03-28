import { SystemException, type ExceptionOptions } from '@gravito/core'
import type { PrismErrorCode } from './codes'

export class PrismError extends SystemException {
  constructor(status: number, code: PrismErrorCode, options: ExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'PrismError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
