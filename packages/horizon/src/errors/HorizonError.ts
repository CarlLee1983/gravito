import { SystemException, type ExceptionOptions } from '@gravito/core'
import type { HorizonErrorCode } from './codes'

export class HorizonError extends SystemException {
  constructor(status: number, code: HorizonErrorCode, options: ExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'HorizonError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
