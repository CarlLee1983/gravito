import type { Authenticatable } from '../contracts/Authenticatable'
import type { UserProvider } from '../contracts/UserProvider'

/**
 * Callback function to retrieve user by ID.
 * @public
 */
export type Retriever<T> = (identifier: string | number) => Promise<T | null>

/**
 * Callback function to validate credentials.
 * @public
 */
export type CredentialValidator<T> = (
  user: T,
  credentials: Record<string, unknown>
) => Promise<boolean>

/**
 * Callback function to retrieve user by 'remember me' token.
 * @public
 */
export type TokenRetriever<T> = (identifier: string | number, token: string) => Promise<T | null>

/**
 * Callback function to retrieve user by credentials.
 * @public
 */
export type CredentialRetriever<T> = (credentials: Record<string, unknown>) => Promise<T | null>

/**
 * User provider implementation that delegates logic to provided callbacks.
 *
 * This provider is useful for custom data sources where a full class
 * implementation of UserProvider is not desired. It allows defining
 * retrieval and validation logic using simple asynchronous functions.
 *
 * @public
 * @example
 * ```typescript
 * const provider = new CallbackUserProvider(
 *   async (id) => findUserById(id),
 *   async (user, creds) => validatePassword(user, creds.password)
 * );
 * ```
 */
export class CallbackUserProvider<T extends Authenticatable = Authenticatable>
  implements UserProvider<T>
{
  /**
   * Create a new callback user provider.
   *
   * @param retrieveByIdCallback - Logic to fetch user by ID
   * @param validateCredentialsCallback - Logic to validate user credentials
   * @param retrieveByTokenCallback - Optional logic for "remember me" token retrieval
   * @param retrieveByCredentialsCallback - Optional logic to find user by credentials
   */
  constructor(
    private retrieveByIdCallback: Retriever<T>,
    private validateCredentialsCallback: CredentialValidator<T>,
    private retrieveByTokenCallback?: TokenRetriever<T>,
    private retrieveByCredentialsCallback?: CredentialRetriever<T>
  ) {}

  /**
   * Retrieve a user by their identifier.
   *
   * @param identifier - Unique ID
   * @returns The user instance or null
   */
  async retrieveById(identifier: string | number): Promise<T | null> {
    return this.retrieveByIdCallback(identifier)
  }

  /**
   * Retrieve a user by their identifier and token.
   *
   * @param identifier - Unique ID
   * @param token - Remember token
   * @returns The user instance or null
   */
  async retrieveByToken(identifier: string | number, token: string): Promise<T | null> {
    if (this.retrieveByTokenCallback) {
      return this.retrieveByTokenCallback(identifier, token)
    }
    return null
  }

  /**
   * Update the remember token for the user.
   *
   * @param user - User instance
   * @param token - New token
   */
  async updateRememberToken(user: T, token: string): Promise<void> {
    if (user.setRememberToken) {
      user.setRememberToken(token)
    }
  }

  /**
   * Retrieve a user by the given credentials.
   *
   * @param credentials - Search criteria
   * @returns The user instance or null
   */
  async retrieveByCredentials(credentials: Record<string, unknown>): Promise<T | null> {
    if (this.retrieveByCredentialsCallback) {
      return this.retrieveByCredentialsCallback(credentials)
    }

    return null
  }

  /**
   * Validate a user against the given credentials.
   *
   * @param user - User instance
   * @param credentials - Credentials to check
   * @returns True if valid, false otherwise
   */
  async validateCredentials(user: T, credentials: Record<string, unknown>): Promise<boolean> {
    if (this.validateCredentialsCallback) {
      return this.validateCredentialsCallback(user, credentials)
    }
    return true
  }
}
