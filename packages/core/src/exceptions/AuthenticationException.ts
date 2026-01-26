import { GravitoException } from './GravitoException'

/**
 * Exception thrown when authentication fails.
 * @public
 */
export class AuthenticationException extends GravitoException {
  constructor(message = 'Unauthenticated.') {
    super(401, 'UNAUTHENTICATED', {
      message,
      i18nKey: 'errors.authentication.unauthenticated',
    })
  }
}
