import { InfrastructureException, type InfrastructureExceptionOptions } from './InfrastructureException'

/**
 * Abstract base class for database-related infrastructure errors.
 * All atlas error classes extend this instead of bare Error.
 * @public
 */
export abstract class DatabaseException extends InfrastructureException {
  constructor(status: number, code: string, options: InfrastructureExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'DatabaseException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
