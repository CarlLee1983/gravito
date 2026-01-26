import type { Authenticatable } from './Authenticatable'

/**
 * Interface for retrieving authenticatable users from a data source.
 *
 * User providers are responsible for fetching user instances by ID,
 * credentials, or tokens, allowing the authentication system to be
 * decoupled from the actual data storage (e.g., database, memory).
 *
 * @public
 */
export interface UserProvider<T extends Authenticatable = Authenticatable> {
  /**
   * Retrieve a user by their unique identifier.
   *
   * @param identifier - The user's primary key or unique ID
   * @returns The user instance or null if not found
   */
  retrieveById(identifier: string | number): Promise<T | null>

  /**
   * Retrieve a user by their identifier and "remember me" token.
   *
   * @param identifier - The user's unique ID
   * @param token - The persistent session token
   * @returns The user instance or null if not found or token mismatch
   */
  retrieveByToken?(identifier: string | number, token: string): Promise<T | null>

  /**
   * Update the "remember me" token for the given user.
   *
   * @param user - The user instance to update
   * @param token - The new persistent session token
   */
  updateRememberToken?(user: T, token: string): Promise<void>

  /**
   * Retrieve a user by the given credentials.
   *
   * @param credentials - Key-value pairs of credentials (e.g., email/username)
   * @returns The user instance or null if no matching user exists
   */
  retrieveByCredentials(credentials: Record<string, unknown>): Promise<T | null>

  /**
   * Validate a user against the given credentials.
   *
   * @param user - The user instance to validate
   * @param credentials - The credentials to check against (e.g., password)
   * @returns True if the credentials are valid for the user, false otherwise
   */
  validateCredentials(user: T, credentials: Record<string, unknown>): Promise<boolean>
}
