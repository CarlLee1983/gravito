import { DomainException } from './DomainException'

/**
 * Exception thrown when user is not authorized to perform an action.
 * @public
 */
export class AuthorizationException extends DomainException {
  constructor(message = 'This action is unauthorized.') {
    super(403, 'FORBIDDEN', {
      message,
      i18nKey: 'errors.authorization.forbidden',
    })
    this.name = 'AuthorizationException'
  }
}
