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
 * @public
 */
export class JwtRefreshGuard<User extends Authenticatable = Authenticatable>
  implements Guard<User>
{
  protected userInstance: User | null = null
  private readonly accessTokenTtl: number
  private readonly refreshTokenTtl: number

  constructor(
    protected provider: UserProvider<User>,
    protected ctx: GravitoContext,
    protected config: JwtRefreshConfig
  ) {
    this.accessTokenTtl = config.accessTokenTtl ?? 900
    this.refreshTokenTtl = config.refreshTokenTtl ?? 604800
  }

  async check(): Promise<boolean> {
    return (await this.user()) !== null
  }

  async guest(): Promise<boolean> {
    return !(await this.check())
  }

  async user(): Promise<User | null> {
    if (this.userInstance) {
      return this.userInstance
    }

    const token = this.getTokenForRequest()
    if (!token) return null

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

  async id(): Promise<string | number | null> {
    const user = await this.user()
    return user ? user.getAuthIdentifier() : null
  }

  async validate(credentials: Record<string, unknown>): Promise<boolean> {
    const user = await this.provider.retrieveByCredentials(credentials)
    if (user && (await this.provider.validateCredentials(user, credentials))) {
      return true
    }
    return false
  }

  setUser(user: User): this {
    this.userInstance = user
    return this
  }

  getProvider(): UserProvider<User> {
    return this.provider
  }

  setProvider(provider: UserProvider<User>): void {
    this.provider = provider
  }

  /**
   * Create a new token pair for the given user.
   * @param user - The user to create tokens for
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
   * Refresh tokens using a valid refresh token.
   * @param refreshToken - The refresh token provided by the client
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
      if (!user) return null

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
