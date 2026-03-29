import { type ExceptionOptions } from './GravitoException'
import { DomainException } from './DomainException'

/**
 * Abstract base class for authentication/authorization-related domain errors.
 * Used by fortify and sentinel packages.
 * @public
 */
export abstract class AuthException extends DomainException {
  constructor(status: number, code: string, options: ExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'AuthException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
