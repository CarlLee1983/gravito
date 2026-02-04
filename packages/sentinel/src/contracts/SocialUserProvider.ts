import type { Authenticatable } from './Authenticatable'
import type { UserProvider } from './UserProvider'

/**
 * Interface for retrieving users from social login providers (OIDC/OAuth2).
 *
 * @public
 */
export interface SocialUserProvider<T extends Authenticatable = Authenticatable>
  extends UserProvider<T> {
  /**
   * Retrieve a user by their social provider identifier.
   *
   * @param provider - The provider name (e.g., 'google', 'github')
   * @param socialId - The unique ID from the provider
   * @returns The user instance or null
   */
  retrieveBySocialId(provider: string, socialId: string): Promise<T | null>

  /**
   * Create or update a user from a social profile.
   *
   * @param provider - The provider name
   * @param profile - The normalized user profile from the provider
   * @returns The user instance
   */
  mapUserFromSocialProfile(provider: string, profile: SocialProfile): Promise<T>
}

/**
 * Normalized social user profile.
 * @public
 */
export interface SocialProfile {
  id: string
  name: string
  email?: string
  avatar?: string
  nickname?: string
  raw: Record<string, unknown>
}
