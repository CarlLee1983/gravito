import { GravitoException } from './GravitoException'

/**
 * Exception thrown when user is not authorized to perform an action.
 * @public
 */
export class AuthorizationException extends GravitoException {
  constructor(message = 'This action is unauthorized.') {
    super(403, 'FORBIDDEN', {
      message,
      i18nKey: 'errors.authorization.forbidden',
    })
  }
}
