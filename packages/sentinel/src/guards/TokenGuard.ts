import type { GravitoContext } from '@gravito/core'
import type { Authenticatable } from '../contracts/Authenticatable'
import type { Guard } from '../contracts/Guard'
import type { UserProvider } from '../contracts/UserProvider'

/**
 * Guard implementation for simple API token authentication.
 *
 * This guard authenticates requests based on a plain or hashed token
 * provided in the Authorization header or as a query parameter.
 *
 * @public
 * @example
 * ```typescript
 * const guard = new TokenGuard(provider, ctx);
 * const user = await guard.user();
 * ```
 */
export class TokenGuard<User extends Authenticatable = Authenticatable> implements Guard<User> {
  protected userInstance: User | null = null
  private static readonly HASH_ALGORITHMS = {
    sha256: 'SHA-256',
    sha512: 'SHA-512',
  } as const

  /**
   * Create a new token guard instance.
   *
   * @param provider - User provider instance
   * @param ctx - Gravito request context
   * @param inputKey - Key name for the token in the request
   * @param storageKey - Key name for the token in the data source
   * @param hash - Whether the token is stored as a hash
   * @param allowQueryToken - Whether to allow tokens in query string
   * @param hashAlgorithm - Hashing algorithm if hashing is enabled
   */
  constructor(
    protected provider: UserProvider<User>,
    protected ctx: GravitoContext,
    protected inputKey = 'api_token',
    protected storageKey = 'api_token',
    protected hash = false,
    protected allowQueryToken = false,
    protected hashAlgorithm: 'sha256' | 'sha512' = 'sha256'
  ) {}

  /**
   * Determine if the current user is authenticated.
   *
   * @returns True if a valid token is present and user exists, false otherwise
   */
  async check(): Promise<boolean> {
    return (await this.user()) !== null
  }

  /**
   * Determine if the current user is a guest.
   *
   * @returns True if not authenticated, false otherwise
   */
  async guest(): Promise<boolean> {
    return !(await this.check())
  }

  /**
   * Get the currently authenticated user instance.
   *
   * @returns The user instance or null if token is missing or invalid
   */
  async user(): Promise<User | null> {
    if (this.userInstance) {
      return this.userInstance
    }

    let token = this.getTokenForRequest()

    if (!token) {
      return null
    }

    if (this.hash) {
      token = await this.hashToken(token)
    }

    if (this.provider.retrieveByCredentials) {
      this.userInstance = await this.provider.retrieveByCredentials({
        [this.storageKey]: token,
      })
    }

    return this.userInstance
  }

  private static readonly sharedEncoder = new TextEncoder()

  private async hashToken(token: string): Promise<string> {
    const data = TokenGuard.sharedEncoder.encode(token)
    const hashBuffer = await crypto.subtle.digest(
      TokenGuard.HASH_ALGORITHMS[this.hashAlgorithm],
      data
    )
    return Buffer.from(hashBuffer).toString('hex')
  }

  /**
   * Get the unique identifier for the authenticated user.
   *
   * @returns The user ID or null
   */
  async id(): Promise<string | number | null> {
    const user = await this.user()
    return user ? user.getAuthIdentifier() : null
  }

  /**
   * Validate a user's credentials.
   *
   * @param credentials - Authentication credentials
   * @returns True if valid, false otherwise
   */
  async validate(credentials: Record<string, unknown>): Promise<boolean> {
    if (this.provider.retrieveByCredentials) {
      const user = await this.provider.retrieveByCredentials(credentials)
      if (user && this.provider.validateCredentials) {
        return await this.provider.validateCredentials(user, credentials)
      }
    }
    return false
  }

  /**
   * Set the current user.
   *
   * @param user - The user instance
   * @returns The guard instance
   */
  setUser(user: User): this {
    this.userInstance = user
    return this
  }

  /**
   * Get the user provider.
   *
   * @returns The user provider instance
   */
  getProvider(): UserProvider<User> {
    return this.provider
  }

  /**
   * Set the user provider.
   *
   * @param provider - The user provider instance
   */
  setProvider(provider: UserProvider<User>): void {
    this.provider = provider
  }

  protected getTokenForRequest(): string | null {
    const header = this.ctx.req.header('Authorization')
    if (header?.startsWith('Bearer ')) {
      return header.substring(7)
    }

    if (this.allowQueryToken) {
      return this.ctx.req.query(this.inputKey) || null
    }

    return null
  }
}
