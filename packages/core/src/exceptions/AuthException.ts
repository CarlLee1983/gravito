import { type ExceptionOptions } from './GravitoException'
import { DomainException } from './DomainException'

/**
 * Abstract base class for authentication and authorization errors in the Gravito ecosystem.
 *
 * Do not throw this class directly — it serves as the common supertype that
 * `fortify` ({@link FortifyError}) and `sentinel` ({@link SentinelError}) extend
 * to participate in shared `instanceof` checks.
 *
 * To signal a 401 Unauthorized response, throw {@link AuthenticationException} instead
 * (which is a sibling class extending DomainException, not a subclass of AuthException).
 *
 * @abstract
 * @public
 * @see AuthenticationException
 */
export abstract class AuthException extends DomainException {
  constructor(status: number, code: string, options: ExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'AuthException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
