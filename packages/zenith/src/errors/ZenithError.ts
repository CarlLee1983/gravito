import { SystemException, type ExceptionOptions } from '@gravito/core'
import type { ZenithErrorCode } from './codes'

export class ZenithError extends SystemException {
  constructor(status: number, code: ZenithErrorCode, options: ExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'ZenithError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
