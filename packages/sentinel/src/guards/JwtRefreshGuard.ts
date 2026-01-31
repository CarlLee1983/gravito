import type { GravitoContext } from '@gravito/core'
import { sign, verify } from '@gravito/photon/jwt'
import type { Authenticatable } from '../contracts/Authenticatable'
import type { Guard } from '../contracts/Guard'
import type { UserProvider } from '../contracts/UserProvider'

/**
 * JWT token pair containing access and refresh tokens.
 * @public
 */
export interface JwtTokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/**
 * Configuration for JWT Refresh Guard.
 * @public
 */
export interface JwtRefreshConfig {
  accessTokenTtl?: number
  refreshTokenTtl?: number
  secret: string
  refreshSecret?: string
  algo?: 'HS256' | 'RS256'
}

/**
 * Guard implementation with support for JWT access and refresh tokens.
 *
 * This guard manages a pair of tokens: a short-lived access token for
 * authentication and a long-lived refresh token for obtaining new access
 * tokens without re-authenticating.
 *
 * @public
 * @example
 * ```typescript
 * const guard = new JwtRefreshGuard(provider, ctx, config);
 * const tokens = await guard.createTokenPair(user);
 * ```
 */
export class JwtRefreshGuard<User extends Authenticatable = Authenticatable>
  implements Guard<User>
{
  protected userInstance: User | null = null
  private readonly accessTokenTtl: number
  private readonly refreshTokenTtl: number

  /**
   * Create a new JWT refresh guard instance.
   *
   * @param provider - User provider instance
   * @param ctx - Gravito request context
   * @param config - Guard configuration including TTLs and secrets
   */
  constructor(
    protected provider: UserProvider<User>,
    protected ctx: GravitoContext,
    protected config: JwtRefreshConfig
  ) {
    this.accessTokenTtl = config.accessTokenTtl ?? 900
    this.refreshTokenTtl = config.refreshTokenTtl ?? 604800
  }

  /**
   * Determine if the current user is authenticated.
   *
   * @returns True if a valid access token is present, false otherwise
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
   * @returns The user instance or null if access token is invalid
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
      const payload = await verify(token, this.config.secret, this.config.algo ?? 'HS256')
      if (payload?.type !== 'access' || !payload.sub) {
        return null
      }

      this.userInstance = (await this.provider.retrieveById(payload.sub as string)) as User | null
      return this.userInstance
    } catch {
      return null
    }
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
    if (user && (await this.provider.validateCredentials(user, credentials))) {
      return true
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

  /**
   * Create a new access and refresh token pair for the given user.
   *
   * @param user - The user instance to create tokens for
   * @returns The token pair and expiration time
   */
  async createTokenPair(user: User): Promise<JwtTokenPair> {
    const now = Math.floor(Date.now() / 1000)
    const sub = String(user.getAuthIdentifier())

    const accessToken = await sign(
      { sub, iat: now, exp: now + this.accessTokenTtl, type: 'access' },
      this.config.secret,
      this.config.algo ?? 'HS256'
    )

    const refreshToken = await sign(
      { sub, iat: now, exp: now + this.refreshTokenTtl, type: 'refresh' },
      this.config.refreshSecret ?? this.config.secret,
      this.config.algo ?? 'HS256'
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenTtl,
    }
  }

  /**
   * Refresh the token pair using a valid refresh token.
   *
   * @param refreshToken - The long-lived refresh token
   * @returns A new token pair or null if the refresh token is invalid
   */
  async refreshTokens(refreshToken: string): Promise<JwtTokenPair | null> {
    try {
      const payload = await verify(
        refreshToken,
        this.config.refreshSecret ?? this.config.secret,
        this.config.algo ?? 'HS256'
      )

      if (payload?.type !== 'refresh' || !payload.sub) {
        return null
      }

      const user = (await this.provider.retrieveById(payload.sub as string)) as User | null
      if (!user) {
        return null
      }

      return this.createTokenPair(user)
    } catch {
      return null
    }
  }

  protected getTokenForRequest(): string | null {
    const header = this.ctx.req.header('Authorization')
    if (header?.startsWith('Bearer ')) {
      return header.substring(7)
    }
    return null
  }
}
