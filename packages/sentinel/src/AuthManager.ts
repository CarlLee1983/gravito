import { AuthenticationException } from 'gravito-core'
import type { Context } from 'hono'
import type { Authenticatable } from './contracts/Authenticatable'
import type { Guard, StatefulGuard } from './contracts/Guard'
import type { UserProvider } from './contracts/UserProvider'
import { JwtGuard } from './guards/JwtGuard'
import { SessionGuard } from './guards/SessionGuard'
import { TokenGuard } from './guards/TokenGuard'

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

export type UserProviderResolver = (config: Record<string, unknown>) => UserProvider
export type GuardResolver = (
  ctx: Context,
  name: string,
  config: Record<string, unknown>,
  provider?: UserProvider
) => Guard

export class AuthManager {
  protected guards: Map<string, Guard> = new Map()
  protected customGuardCreators: Map<string, GuardResolver> = new Map()
  protected customProviderCreators: Map<string, UserProviderResolver> = new Map()

  // Cache resolved providers to share across guards if needed
  protected resolvedProviders: Map<string, UserProvider> = new Map()

  /**
   * Create a new AuthManager instance.
   *
   * @param ctx - The request context.
   * @param config - The authentication configuration.
   * @param providerResolvers - A map of custom provider resolvers.
   */
  constructor(
    protected ctx: Context,
    protected config: AuthConfig,
    protected providerResolvers: Map<string, UserProviderResolver> = new Map()
  ) {}

  /**
   * Set the default guard for the current request.
   *
   * @param name - The name of the guard to use as default.
   * @returns The AuthManager instance.
   */
  public shouldUse(name: string): this {
    this.config.defaults.guard = name
    return this
  }

  /**
   * Get a guard instance by name.
   *
   * @param name - The name of the guard (optional). Defaults to the configured default guard.
   * @returns The guard instance.
   */
  public guard<T extends Guard = Guard>(name?: string): T {
    const guardName = name || this.config.defaults.guard

    if (!this.guards.has(guardName)) {
      this.guards.set(guardName, this.resolve(guardName))
    }

    return this.guards.get(guardName) as T
  }

  /**
   * Get the currently authenticated user.
   *
   * @returns A promise resolving to the authenticatable user or null.
   */
  public async user<T extends Authenticatable = Authenticatable>(): Promise<T | null> {
    return this.guard().user() as Promise<T | null>
  }

  /**
   * Get the ID of the currently authenticated user.
   *
   * @returns A promise resolving to the user ID or null.
   */
  public async id(): Promise<string | number | null> {
    return this.guard().id()
  }

  /**
   * Check if the user is authenticated.
   *
   * @returns A promise resolving to true if authenticated, false otherwise.
   */
  public async check(): Promise<boolean> {
    return this.guard().check()
  }

  /**
   * Authenticate the user and return the user instance.
   *
   * @returns A promise resolving to the authenticatable user.
   * @throws {AuthenticationException} If the user is not authenticated.
   */
  public async authenticate(): Promise<Authenticatable> {
    const user = await this.user()
    if (!user) {
      throw new AuthenticationException()
    }
    return user
  }

  /**
   * Attempt to authenticate using the default driver.
   *
   * @param credentials - The credentials to authenticate with.
   * @param remember - Whether to remember the user (if supported).
   * @returns A promise resolving to true if authentication was successful.
   */
  public async attempt(credentials: Record<string, unknown>, remember = false): Promise<boolean> {
    const guard = this.guard()
    if ('attempt' in guard) {
      return (guard as unknown as StatefulGuard).attempt(credentials, remember)
    }
    return guard.validate(credentials)
  }

  /**
   * Log the user into the application.
   *
   * @param user - The user to login.
   * @param remember - Whether to remember the user.
   * @returns A promise that resolves when the user is logged in.
   */
  public async login(user: Authenticatable, remember = false): Promise<void> {
    const guard = this.guard()
    if ('login' in guard) {
      return (guard as unknown as StatefulGuard).login(user, remember)
    }
  }

  /**
   * Log the user out of the application.
   *
   * @returns A promise that resolves when the user is logged out.
   */
  public async logout(): Promise<void> {
    const guard = this.guard()
    if ('logout' in guard) {
      return (guard as unknown as StatefulGuard).logout()
    }
  }

  protected resolve(name: string): Guard {
    const config = this.config.guards[name]

    if (!config) {
      throw new Error(`Auth guard [${name}] is not defined.`)
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
        throw new Error(`User provider [${providerName}] not found for guard [${name}].`)
      }
      const creator = this.customGuardCreators.get(config.driver)
      if (!creator) {
        throw new Error(`Custom guard creator for [${config.driver}] not found.`)
      }
      return creator(this.ctx, name, config, provider)
    }

    throw new Error(`Auth driver [${config.driver}] for guard [${name}] is not supported.`)
  }

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

  protected createJwtGuard(
    _name: string,
    config: {
      provider?: string
      secret?: string
      algo?: string
      [key: string]: unknown
    }
  ): JwtGuard {
    const provider = this.createUserProvider(config.provider)
    return new JwtGuard(
      provider,
      this.ctx,
      config.secret as string,
      config.algo as 'HS256' | 'RS256'
    )
  }

  protected createTokenGuard(
    _name: string,
    config: {
      provider?: string
      inputKey?: string
      storageKey?: string
      hash?: boolean
      [key: string]: unknown
    }
  ): TokenGuard {
    const provider = this.createUserProvider(config.provider)
    return new TokenGuard(provider, this.ctx, config.inputKey, config.storageKey, config.hash)
  }

  /**
   * Create a user provider instance.
   *
   * @param name - The name of the provider (optional). Defaults to the configured default password provider.
   * @returns The user provider instance.
   * @throws {Error} If the provider is not defined or not supported.
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
      throw new Error(`User provider [${providerName}] is not defined.`)
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
      throw new Error(
        `Auth provider driver [${config.driver}] for [${providerName}] is not supported or not registered.`
      )
    }

    this.resolvedProviders.set(providerName, provider)
    return provider
  }

  /**
   * Register a custom guard creator.
   *
   * @param driver - The driver name.
   * @param callback - The callback to create the guard.
   * @returns The AuthManager instance.
   */
  public extend(driver: string, callback: GuardResolver): this {
    this.customGuardCreators.set(driver, callback)
    return this
  }

  /**
   * Register a custom provider creator.
   *
   * @param name - The name of the provider.
   * @param callback - The callback to create the provider.
   * @returns The AuthManager instance.
   */
  public provider(name: string, callback: UserProviderResolver): this {
    this.customProviderCreators.set(name, callback)
    return this
  }
}
