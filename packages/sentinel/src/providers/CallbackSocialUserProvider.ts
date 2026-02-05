import type { Authenticatable } from '../contracts/Authenticatable'
import type { SocialProfile, SocialUserProvider } from '../contracts/SocialUserProvider'
import {
  CallbackUserProvider,
  type CredentialRetriever,
  type CredentialValidator,
  type Retriever,
  type TokenRetriever,
} from './CallbackUserProvider'

/**
 * Callback function to retrieve user by social ID.
 * @public
 */
export type SocialIdRetriever<T> = (provider: string, socialId: string) => Promise<T | null>

/**
 * Callback function to map/create user from social profile.
 * @public
 */
export type SocialProfileMapper<T> = (provider: string, profile: SocialProfile) => Promise<T>

/**
 * Social user provider implementation that delegates logic to provided callbacks.
 *
 * This provider extends CallbackUserProvider to add support for social login methods.
 * It allows defining social retrieval and mapping logic using simple asynchronous functions.
 *
 * @public
 */
export class CallbackSocialUserProvider<T extends Authenticatable = Authenticatable>
  extends CallbackUserProvider<T>
  implements SocialUserProvider<T>
{
  /**
   * Create a new callback social user provider.
   *
   * @param retrieveByIdCallback - Logic to fetch user by ID
   * @param validateCredentialsCallback - Logic to validate user credentials
   * @param retrieveBySocialIdCallback - Logic to find user by social provider ID
   * @param mapUserFromSocialProfileCallback - Logic to create/update user from social profile
   * @param retrieveByTokenCallback - Optional logic for "remember me" token retrieval
   * @param retrieveByCredentialsCallback - Optional logic to find user by credentials
   */
  constructor(
    retrieveByIdCallback: Retriever<T>,
    validateCredentialsCallback: CredentialValidator<T>,
    private retrieveBySocialIdCallback: SocialIdRetriever<T>,
    private mapUserFromSocialProfileCallback: SocialProfileMapper<T>,
    retrieveByTokenCallback?: TokenRetriever<T>,
    retrieveByCredentialsCallback?: CredentialRetriever<T>
  ) {
    super(
      retrieveByIdCallback,
      validateCredentialsCallback,
      retrieveByTokenCallback,
      retrieveByCredentialsCallback
    )
  }

  /**
   * Retrieve a user by their social provider identifier.
   *
   * @param provider - The provider name (e.g., 'google', 'github')
   * @param socialId - The unique ID from the provider
   * @returns The user instance or null
   */
  async retrieveBySocialId(provider: string, socialId: string): Promise<T | null> {
    return this.retrieveBySocialIdCallback(provider, socialId)
  }

  /**
   * Create or update a user from a social profile.
   *
   * @param provider - The provider name
   * @param profile - The normalized user profile from the provider
   * @returns The user instance
   */
  async mapUserFromSocialProfile(provider: string, profile: SocialProfile): Promise<T> {
    return this.mapUserFromSocialProfileCallback(provider, profile)
  }
}
