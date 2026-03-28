import { AuthenticationException, type GravitoContext } from '@gravito/core'
import type { Authenticatable } from './contracts/Authenticatable'
import { SentinelError } from './errors/SentinelError'
import { SentinelErrorCodes } from './errors/codes'
import type { Guard, StatefulGuard } from './contracts/Guard'
import type { UserProvider } from './contracts/UserProvider'
import { JwtGuard } from './guards/JwtGuard'
import { SessionGuard } from './guards/SessionGuard'
import { TokenGuard } from './guards/TokenGuard'

/**
 * Complete configuration for the authentication system.
 * @public
 */
export interface AuthConfig {
  defaults: {
    guard: string
    passwords?: string // provider name
  }
  guards: Record<
    string,
    {
      driver: 'session' | 'jwt' | 'token' | string
      provider?: string
      allowQueryToken?: boolean
      [key: string]: unknown
    }
  >
  providers: Record<
    string,
    {
      driver: 'callback' | string
      [key: string]: unknown
    }
  >
}

/**
 * Resolver function type for user providers.
 * @public
 */
export type UserProviderResolver = (config: Record<string, unknown>) => UserProvider

/**
 * Resolver function type for custom guards.
 * @public
 */
export type GuardResolver = (
  ctx: GravitoContext,
  name: string,
  config: Record<string, unknown>,
  provider?: UserProvider
) => Guard

/**
 * Central manager for authentication in Gravito.
 * Handles guard resolution, user providers, and authentication state.
 * @public
 * @since 1.0.0
 */
export class AuthManager {
  protected guards: Map<string, Guard> = new Map()
  protected customGuardCreators: Map<string, GuardResolver> = new Map()
  protected customProviderCreators: Map<string, UserProviderResolver> = new Map()
  private defaultGuardResolved = false

  protected resolvedProviders: Map<string, UserProvider> = new Map()

  /**
   * Create a new AuthManager instance.
   * @param ctx - The request context
   * @param config - The auth configuration
   * @param providerResolvers - Optional user provider resolvers
   */
  constructor(
    protected ctx: GravitoContext,
    protected config: AuthConfig,
    protected providerResolvers: Map<string, UserProviderResolver> = new Map()
  ) {}

  /**
   * Set the default guard for the current request.
   * @param name - Guard name
   */
  public shouldUse(name: string): this {
    this.config.defaults.guard = name
    return this
  }

  /**
   * Resolve and return a guard instance by name.
   *
   * This method resolves the guard configuration, creates the appropriate
   * guard instance (Session, JWT, or Token), and caches it for subsequent calls.
   *
   * @param name - The name of the guard defined in AuthConfig
   * @returns The resolved guard instance
   * @throws {Error} If the guard is not defined or driver is unsupported
   */
  public guard<T extends Guard = Guard>(name?: string): T {
    const guardName = name || this.config.defaults.guard

    if (!name && !this.defaultGuardResolved) {
      this.defaultGuardResolved = true
    }

    if (!this.guards.has(guardName)) {
      this.guards.set(guardName, this.resolve(guardName))
    }

    return this.guards.get(guardName) as T
  }

  /**
   * Get the currently authenticated user from the default guard.
   *
   * @returns A promise resolving to the authenticatable user or null
   */
  public async user<T extends Authenticatable = Authenticatable>(): Promise<T | null> {
    return this.guard().user() as Promise<T | null>
  }

  /**
   * Get the unique identifier of the currently authenticated user.
   *
   * @returns A promise resolving to the user ID or null
   */
  public async id(): Promise<string | number | null> {
    return this.guard().id()
  }

  /**
   * Check if the user is authenticated via the default guard.
   *
   * @returns A promise resolving to true if authenticated
   */
  public async check(): Promise<boolean> {
    return this.guard().check()
  }

  /**
   * Authenticate the user or throw an exception if not authenticated.
   *
   * @returns A promise resolving to the authenticated user instance
   * @throws {AuthenticationException} If the user is not authenticated
   */
  public async authenticate(): Promise<Authenticatable> {
    const user = await this.user()
    if (!user) {
      throw new AuthenticationException()
    }
    return user
  }

  /**
   * Attempt to authenticate using credentials via the default guard.
   *
   * If the guard is stateful, it will also log the user in.
   *
   * @param credentials - Key-value pairs for authentication
   * @param remember - Whether to start a persistent session
   * @returns A promise resolving to true if authentication succeeded
   */
  public async attempt(credentials: Record<string, unknown>, remember = false): Promise<boolean> {
    const guard = this.guard()
    if ('attempt' in guard) {
      return (guard as unknown as StatefulGuard).attempt(credentials, remember)
    }
    return guard.validate(credentials)
  }

  /**
   * Log a specific user instance into the application via the default guard.
   *
   * @param user - The user instance to log in
   * @param remember - Whether to start a persistent session
   */
  public async login(user: Authenticatable, remember = false): Promise<void> {
    const guard = this.guard()
    if ('login' in guard) {
      return (guard as unknown as StatefulGuard).login(user, remember)
    }
  }

  /**
   * Log the user out of the application via the default guard.
   */
  public async logout(): Promise<void> {
    const guard = this.guard()
    if ('logout' in guard) {
      return (guard as unknown as StatefulGuard).logout()
    }
  }

  /**
   * Resolve a guard instance based on configuration.
   */
  protected resolve(name: string): Guard {
    const config = this.config.guards[name]

    if (!config) {
      throw new SentinelError(500, SentinelErrorCodes.GUARD_NOT_DEFINED, {
        message: `Auth guard [${name}] is not defined.`,
      })
    }

    if (config.driver === 'session') {
      return this.createSessionGuard(name, config)
    }

    if (config.driver === 'jwt') {
      return this.createJwtGuard(name, config)
    }

    if (config.driver === 'token') {
      return this.createTokenGuard(name, config)
    }

    if (this.customGuardCreators.has(config.driver)) {
      const providerName = config.provider
      const provider = providerName ? this.createUserProvider(providerName) : undefined
      if (!provider && providerName) {
        throw new SentinelError(500, SentinelErrorCodes.PROVIDER_NOT_FOUND, {
          message: `User provider [${providerName}] not found for guard [${name}].`,
        })
      }
      const creator = this.customGuardCreators.get(config.driver)
      if (!creator) {
        throw new SentinelError(500, SentinelErrorCodes.GUARD_CREATOR_NOT_FOUND, {
          message: `Custom guard creator for [${config.driver}] not found.`,
        })
      }
      return creator(this.ctx, name, config, provider)
    }

    throw new SentinelError(500, SentinelErrorCodes.GUARD_DRIVER_UNSUPPORTED, {
      message: `Auth driver [${config.driver}] for guard [${name}] is not supported.`,
    })
  }

  /**
   * Create a session-based guard instance.
   */
  protected createSessionGuard(
    name: string,
    config: {
      provider?: string
      sessionKey?: string
      [key: string]: unknown
    }
  ): SessionGuard {
    const provider = this.createUserProvider(config.provider)
    return new SessionGuard(name, provider, this.ctx, config.sessionKey)
  }

  /**
   * Create a JWT-based guard instance.
   */
  protected createJwtGuard(
    _name: string,
    config: {
      provider?: string
      secret?: string
      algo?: string
      allowQueryToken?: boolean
      [key: string]: unknown
    }
  ): JwtGuard {
    const provider = this.createUserProvider(config.provider)
    return new JwtGuard(
      provider,
      this.ctx,
      config.secret as string,
      config.algo as 'HS256' | 'RS256',
      config.allowQueryToken ?? false
    )
  }

  /**
   * Create an API token-based guard instance.
   */
  protected createTokenGuard(
    _name: string,
    config: {
      provider?: string
      inputKey?: string
      storageKey?: string
      hash?: boolean
      allowQueryToken?: boolean
      [key: string]: unknown
    }
  ): TokenGuard {
    const provider = this.createUserProvider(config.provider)
    return new TokenGuard(
      provider,
      this.ctx,
      config.inputKey,
      config.storageKey,
      config.hash,
      config.allowQueryToken ?? false
    )
  }

  /**
   * Create a user provider instance by name.
   *
   * @param name - Provider name (defaults to default passwords provider)
   * @returns The resolved user provider instance
   * @throws {Error} If the provider is not defined or unsupported
   */
  public createUserProvider(name?: string): UserProvider {
    const providerName = name || this.config.defaults.passwords || 'users'

    if (this.resolvedProviders.has(providerName)) {
      const existing = this.resolvedProviders.get(providerName)
      if (existing) {
        return existing
      }
    }

    const config = this.config.providers[providerName]

    if (!config) {
      throw new SentinelError(500, SentinelErrorCodes.PROVIDER_NOT_DEFINED, {
        message: `User provider [${providerName}] is not defined.`,
      })
    }

    let provider: UserProvider | null = null

    if (config.driver === 'callback') {
      if (this.providerResolvers.has(providerName)) {
        const resolver = this.providerResolvers.get(providerName)
        provider = resolver ? resolver(config) : null
      }
    } else if (this.customProviderCreators.has(config.driver)) {
      const creator = this.customProviderCreators.get(config.driver)
      provider = creator ? creator(config) : null
    }

    if (!provider) {
      if (this.providerResolvers.has(providerName)) {
        const resolver = this.providerResolvers.get(providerName)
        provider = resolver ? resolver(config) : null
      }
    }

    if (!provider) {
      throw new SentinelError(500, SentinelErrorCodes.PROVIDER_DRIVER_UNSUPPORTED, {
        message: `Auth provider driver [${config.driver}] for [${providerName}] is not supported or not registered.`,
      })
    }

    this.resolvedProviders.set(providerName, provider)
    return provider
  }

  /**
   * Register a custom guard creator.
   *
   * @param driver - Driver name
   * @param callback - Factory function for the guard
   */
  public extend(driver: string, callback: GuardResolver): this {
    this.customGuardCreators.set(driver, callback)
    return this
  }

  /**
   * Register a custom provider creator.
   *
   * @param name - Driver name
   * @param callback - Factory function for the provider
   */
  public provider(name: string, callback: UserProviderResolver): this {
    this.customProviderCreators.set(name, callback)
    return this
  }
}
