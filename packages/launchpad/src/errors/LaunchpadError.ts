import { SystemException, type ExceptionOptions } from '@gravito/core'
import type { LaunchpadErrorCode } from './codes'

export class LaunchpadError extends SystemException {
  constructor(status: number, code: LaunchpadErrorCode, options: ExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'LaunchpadError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
