import { type ExceptionOptions, GravitoException } from './GravitoException'

/**
 * Abstract base class for internal framework / system-level errors.
 * Extend this for exceptions that represent an unexpected or unrecoverable framework state.
 * @public
 */
export abstract class SystemException extends GravitoException {
  constructor(status: number, code: string, options: ExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'SystemException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
