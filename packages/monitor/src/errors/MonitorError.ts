import { SystemException, type ExceptionOptions } from '@gravito/core'
import type { MonitorErrorCode } from './codes'

export class MonitorError extends SystemException {
  constructor(status: number, code: MonitorErrorCode, options: ExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'MonitorError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
