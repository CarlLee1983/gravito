import { GravitoException } from './GravitoException'
/**
 * Exception thrown when user is not authorized to perform an action.
 * @public
 */
export declare class AuthorizationException extends GravitoException {
  constructor(message?: string)
}
