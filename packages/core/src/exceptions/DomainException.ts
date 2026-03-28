import { type ExceptionOptions, GravitoException } from './GravitoException'

/**
 * Abstract base class for business logic / domain rule violations.
 * Extend this for exceptions that represent a caller mistake (invalid input, constraint violation, etc.).
 * @public
 */
export abstract class DomainException extends GravitoException {
  constructor(status: number, code: string, options: ExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'DomainException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
