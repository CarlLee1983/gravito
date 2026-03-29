import { InfrastructureException, type InfrastructureExceptionOptions } from './InfrastructureException'

/**
 * Abstract base class for cache/Redis-related infrastructure errors.
 * All plasma error classes extend this instead of bare Error.
 * @public
 */
export abstract class CacheException extends InfrastructureException {
  constructor(status: number, code: string, options: InfrastructureExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'CacheException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
