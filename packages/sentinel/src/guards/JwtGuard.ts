import type { GravitoContext } from '@gravito/core'
import { verify } from '@gravito/photon/jwt'
import type { Authenticatable } from '../contracts/Authenticatable'
import type { Guard } from '../contracts/Guard'
import type { UserProvider } from '../contracts/UserProvider'

/**
 * Guard implementation for JWT-based authentication.
 *
 * This guard authenticates requests based on JSON Web Tokens provided in the
 * Authorization header as a Bearer token or as a query parameter.
 *
 * @public
 * @example
 * ```typescript
 * const guard = new JwtGuard(provider, ctx, 'my-secret');
 * const user = await guard.user();
 * ```
 */
export class JwtGuard<User extends Authenticatable = Authenticatable> implements Guard<User> {
  protected userInstance: User | null = null
  private verifyToken: typeof verify

  /**
   * Create a new JWT guard instance.
   *
   * @param provider - User provider instance
   * @param ctx - Gravito request context
   * @param secret - Secret key for token verification
   * @param algo - Algorithm used for signing the token
   * @param allowQueryToken - Whether to allow tokens in query string
   * @param deps - Optional dependencies for testing (e.g., mock verify)
   */
  constructor(
    protected provider: UserProvider<User>,
    protected ctx: GravitoContext,
    protected secret: string,
    protected algo = 'HS256',
    protected allowQueryToken = false,
    deps: { verify?: typeof verify } = {}
  ) {
    this.verifyToken = deps.verify ?? verify
  }

  /**
   * Determine if the current user is authenticated.
   *
   * @returns True if token is valid and user exists, false otherwise
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
   * @returns The user instance or null if token is invalid or user not found
   */
  async user(): Promise<User | null> {
    if (this.userInstance) {
      return this.userInstance
    }

    const token = this.getTokenForRequest()
    if (!token) {
      return null
    }

    try {
      const payload = await this.verifyToken(
        token,
        this.secret,
        this.algo as Parameters<typeof verify>[2]
      )
      if (payload?.sub) {
        this.userInstance = await this.provider.retrieveById(payload.sub as string)

        if (this.userInstance?.getTenantId) {
          const tenantId = this.ctx.get(
            'tenantId' as keyof import('@gravito/core').GravitoVariables
          ) as string | number | undefined
          if (tenantId && String(this.userInstance.getTenantId()) !== String(tenantId)) {
            this.userInstance = null
            return null
          }
        }
      }
    } catch (_e) {
      return null
    }

    return this.userInstance
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
    const user = await this.provider.retrieveByCredentials(credentials)
    return user ? await this.provider.validateCredentials(user, credentials) : false
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
    if (!header || !header.startsWith('Bearer ')) {
      return this.allowQueryToken ? this.ctx.req.query('token') || null : null
    }
    return header.substring(7)
  }
}
