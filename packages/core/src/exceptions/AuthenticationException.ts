import { DomainException } from './DomainException'

/**
 * Exception thrown when authentication fails.
 * @public
 */
export class AuthenticationException extends DomainException {
  constructor(message = 'Unauthenticated.') {
    super(401, 'UNAUTHENTICATED', {
      message,
      i18nKey: 'errors.authentication.unauthenticated',
    })
    this.name = 'AuthenticationException'
  }
}
