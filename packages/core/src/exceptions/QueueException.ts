import { InfrastructureException, type InfrastructureExceptionOptions } from './InfrastructureException'

/**
 * Abstract base class for message queue infrastructure errors.
 * Used by quasar and flux packages.
 * @public
 */
export abstract class QueueException extends InfrastructureException {
  constructor(status: number, code: string, options: InfrastructureExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'QueueException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
