import { DomainException } from './DomainException'

/**
 * Concrete 401 Unauthorized exception — throw this when a request lacks valid credentials.
 *
 * This class extends {@link DomainException} directly and is **not** a subclass
 * of {@link AuthException}. To create a custom auth error for use with fortify
 * or sentinel, extend AuthException instead.
 *
 * @public
 * @see AuthException
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
