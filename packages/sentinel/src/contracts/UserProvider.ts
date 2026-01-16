import type { Authenticatable } from './Authenticatable'

/**
 * Interface for retrieving users.
 * @public
 */
export interface UserProvider<T extends Authenticatable = Authenticatable> {
  retrieveById(identifier: string | number): Promise<T | null>
  retrieveByToken?(identifier: string | number, token: string): Promise<T | null>
  updateRememberToken?(user: T, token: string): Promise<void>
  retrieveByCredentials(credentials: Record<string, unknown>): Promise<T | null>
  validateCredentials(user: T, credentials: Record<string, unknown>): Promise<boolean>
}
