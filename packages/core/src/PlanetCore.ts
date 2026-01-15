/**
 * @fileoverview PlanetCore - The Heart of Gravito Framework
 *
 * The micro-kernel that orchestrates the entire Galaxy Architecture.
 * Manages HTTP routing, middleware, error handling, and orbit integration.
 *
 * @module @gravito/core
 * @since 1.0.0
 */

import { PhotonAdapter } from './adapters/PhotonAdapter'
import type { HttpAdapter } from './adapters/types'
import { ConfigManager } from './ConfigManager'
import { Container } from './Container'
import { ErrorHandler } from './ErrorHandler'
import { EventManager } from './EventManager'
import {
  type RegisterGlobalErrorHandlersOptions,
  registerGlobalErrorHandlers,
} from './GlobalErrorHandlers'
import { HookManager } from './HookManager'
import type { fail } from './helpers/response'
import type { ContentfulStatusCode, GravitoContext } from './http/types'
import { ConsoleLogger, type Logger } from './Logger'
import type { ServiceProvider } from './ServiceProvider'

/**
 * CacheService interface for orbit-injected cache
 * Orbits implementing cache should conform to this interface
 */
export interface CacheService {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T>
}

export interface ViewService {
  render(view: string, data?: Record<string, unknown>, options?: Record<string, unknown>): string
}

export type ErrorHandlerContext = {
  core: PlanetCore
  c: GravitoContext
  error: unknown
  isProduction: boolean
  accept: string
  wantsHtml: boolean
  status: ContentfulStatusCode
  payload: ReturnType<typeof fail>
  logLevel?: 'error' | 'warn' | 'info' | 'none'
  logMessage?: string
  html?: {
    templates: string[]
    data: Record<string, unknown>
  }
}

// Photon Variables Type for Context Injection
type RouteParams = Record<string, string | number>
type RouteQuery = Record<string, string | number | boolean | null | undefined>

export interface GravitoOrbit {
  install(core: PlanetCore): void | Promise<void>
}

export type GravitoConfig = {
  logger?: Logger
  config?: Record<string, unknown>
  orbits?: (new () => GravitoOrbit)[] | GravitoOrbit[]
  /**
   * HTTP Adapter to use. Defaults to PhotonAdapter.
   * @since 2.0.0
   */
  adapter?: HttpAdapter
}

import { BunNativeAdapter } from './adapters/bun/BunNativeAdapter'
import { setApp } from './helpers'
import { CookieJar } from './http/CookieJar'
import { Router } from './Router'
import { Encrypter } from './security/Encrypter'
import { BunHasher } from './security/Hasher'

export class PlanetCore {
  /**
   * The HTTP adapter used by this core instance.
   * @since 2.0.0
   */
  private _adapter!: HttpAdapter

  /**
   * Access the underlying Photon app instance.
   * @deprecated Use adapter methods for new code. This property is kept for backward compatibility.
   */
  public get app(): unknown {
    return this._adapter.native
  }

  /**
   * Get the HTTP adapter instance.
   * @since 2.0.0
   */
  public get adapter(): HttpAdapter {
    return this._adapter
  }

  public logger: Logger
  public config: ConfigManager
  public hooks: HookManager
  public events: EventManager
  public router: Router
  public container: Container = new Container()
  /** @deprecated Use core.container instead */
  public services: Map<string, unknown> = new Map()

  public encrypter?: Encrypter
  public hasher: BunHasher

  private providers: ServiceProvider[] = []
  private deferredProviders: Map<string, ServiceProvider> = new Map()
  private bootedProviders: Set<ServiceProvider> = new Set()

  /**
   * Register a service provider.
   *
   * @param provider - The ServiceProvider instance to register.
   * @returns The PlanetCore instance for chaining.
   *
   * @example
   * ```typescript
   * core.register(new DatabaseServiceProvider());
   * ```
   */
  register(provider: ServiceProvider): this {
    // Set core reference
    provider.setCore(this)

    // Handle deferred providers
    if (provider.deferred) {
      const services = provider.provides()
      for (const service of services) {
        this.deferredProviders.set(service, provider)
      }
    } else {
      this.providers.push(provider)
    }

    return this
  }

  /**
   * Bootstrap the application by registering and booting providers.
   *
   * This method must be called before the application starts handling requests.
   * It calls `register()` on all providers first, then `boot()` on all providers.
   *
   * Supports async register() methods.
   *
   * @returns Promise that resolves when bootstrapping is complete.
   */
  async bootstrap(): Promise<void> {
    // Phase 1: Register all bindings (supports async)
    for (const provider of this.providers) {
      await provider.register(this.container)
    }

    // Phase 2: Setup deferred provider resolution
    this.setupDeferredProviderResolution()

    // Phase 3: Boot all providers
    for (const provider of this.providers) {
      await this.bootProvider(provider)
    }
  }

  /**
   * Setup deferred provider resolution.
   * Wraps container.make to auto-register deferred providers on first request.
   *
   * @internal
   */
  private setupDeferredProviderResolution(): void {
    const originalMake = this.container.make.bind(this.container)

    this.container.make = <T>(key: string): T => {
      // Check if we need to register a deferred provider
      if (this.deferredProviders.has(key)) {
        const provider = this.deferredProviders.get(key)!
        this.registerDeferredProvider(provider)
      }

      return originalMake<T>(key)
    }
  }

  /**
   * Register a deferred provider on-demand.
   *
   * @internal
   */
  private registerDeferredProvider(provider: ServiceProvider): void {
    // Remove from deferred map (for all services it provides)
    for (const service of provider.provides()) {
      this.deferredProviders.delete(service)
    }

    // Register synchronously (deferred providers should have sync register)
    const result = provider.register(this.container)
    if (result instanceof Promise) {
      throw new Error(
        `Deferred provider ${provider.constructor.name} has async register(). ` +
          'Deferred providers must have synchronous register() methods.'
      )
    }

    // Boot the provider
    this.bootProvider(provider)
  }

  /**
   * Boot a single provider if not already booted.
   *
   * @internal
   */
  private async bootProvider(provider: ServiceProvider): Promise<void> {
    if (this.bootedProviders.has(provider)) {
      return
    }

    this.bootedProviders.add(provider)

    if (provider.boot) {
      await provider.boot(this)
    }
  }

  constructor(
    options: {
      logger?: Logger
      config?: Record<string, unknown>
      adapter?: HttpAdapter
    } = {}
  ) {
    this.logger = options.logger ?? new ConsoleLogger()
    this.config = new ConfigManager(options.config ?? {})
    this.hooks = new HookManager()
    this.events = new EventManager(this)

    this.hasher = new BunHasher()

    // Bind this instance to the global app helper
    setApp(this)

    // Initialize Encrypter if APP_KEY is present
    const appKey =
      (this.config.has('APP_KEY') ? this.config.get<string>('APP_KEY') : undefined) ||
      process.env.APP_KEY
    if (appKey) {
      try {
        this.encrypter = new Encrypter({ key: appKey })
      } catch (e) {
        this.logger.warn('Failed to initialize Encrypter (invalid APP_KEY?):', e)
      }
    }

    // Initialize HTTP adapter
    // Priority:
    // 1. Config 'adapter' option (explicit)
    // 2. BunNativeAdapter (if Bun is detected)
    // 3. PhotonAdapter (fallback for Node/others)
    if (options.adapter) {
      this._adapter = options.adapter
    } else if (typeof Bun !== 'undefined') {
      this._adapter = new BunNativeAdapter()
    } else {
      this._adapter = new PhotonAdapter()
    }

    // Core Middleware for Context Injection
    this.adapter.use('*', async (c, next) => {
      c.set('core', this)
      c.set('logger', this.logger)
      c.set('config', this.config)

      const cookieJar = new CookieJar(this.encrypter)
      c.set('cookieJar', cookieJar)

      // Add route helper
      // @ts-expect-error
      c.route = (name: string, params?: RouteParams, query?: RouteQuery) =>
        this.router.url(name, params, query)

      return await next()
    })
    // Router depends on `core.app` for route registration and optional global middleware.
    this.router = new Router(this)

    // Standard Error Handling - Delegated to ErrorHandler
    const errorHandler = new ErrorHandler({
      logger: this.logger,
      hooks: this.hooks,
      getCore: () => this,
    })

    this.adapter.onError(errorHandler.handleError.bind(errorHandler))
    this.adapter.onNotFound(errorHandler.handleNotFound.bind(errorHandler))
  }

  /**
   * Programmatically register an infrastructure module (Orbit).
   * @since 2.0.0
   *
   * @param orbit - The orbit class or instance to register.
   * @returns The PlanetCore instance for chaining.
   *
   * @example
   * ```typescript
   * await core.orbit(OrbitCache);
   * ```
   */
  async orbit(orbit: GravitoOrbit | (new () => GravitoOrbit)): Promise<this> {
    const instance = typeof orbit === 'function' ? new orbit() : orbit
    await instance.install(this)
    return this
  }

  /**
   * Programmatically register a feature module (Satellite).
   * Alias for register() with provider support.
   * @since 2.0.0
   *
   * @param satellite - The provider or setup function.
   * @returns The PlanetCore instance for chaining.
   *
   * @example
   * ```typescript
   * await core.use(new AuthProvider());
   * ```
   */
  async use(
    satellite: ServiceProvider | ((core: PlanetCore) => void | Promise<void>)
  ): Promise<this> {
    if (typeof satellite === 'function') {
      await satellite(this)
    } else {
      this.register(satellite)
    }
    return this
  }

  registerGlobalErrorHandlers(
    options: Omit<RegisterGlobalErrorHandlersOptions, 'core'> = {}
  ): () => void {
    return registerGlobalErrorHandlers({ ...options, core: this })
  }

  /**
   * Boot the application with a configuration object (IoC style default entry)
   *
   * @param config - The Gravito configuration object.
   * @returns A Promise resolving to the booted PlanetCore instance.
   *
   * @example
   * ```typescript
   * const core = await PlanetCore.boot(config);
   * ```
   */
  static async boot(config: GravitoConfig): Promise<PlanetCore> {
    const core = new PlanetCore({
      ...(config.logger && { logger: config.logger }),
      ...(config.config && { config: config.config }),
      ...(config.adapter && { adapter: config.adapter }),
    })

    if (config.orbits) {
      for (const OrbitClassOrInstance of config.orbits) {
        let orbit: GravitoOrbit
        if (typeof OrbitClassOrInstance === 'function') {
          // It's a constructor
          orbit = new (OrbitClassOrInstance as new () => GravitoOrbit)()
        } else {
          orbit = OrbitClassOrInstance
        }

        await orbit.install(core)
      }
    }

    return core
  }

  /**
   * Mount an Orbit (a Photon app) to a path.
   *
   * @param path - The URL path to mount the orbit at.
   * @param orbitApp - The Photon application instance.
   */
  mountOrbit(path: string, orbitApp: unknown): void {
    this.logger.info(`Mounting orbit at path: ${path}`)
    // Should reuse this.adapter.mount logic if possible, or fallback.
    // PhotonAdapter has special mount. BunNativeAdapter might not fully support mounting Photon apps yet.
    // For now, assume orbitApp is Photon and we are likely in an environment where Photon might be used.
    // BUT if we are in BunNativeAdapter, this.app is BunNativeAdapter.
    // BunNativeAdapter.mount() implementation warned it's not fully implemented.
    // If we want to support Orbits, we need to fix mount in BunNativeAdapter.
    // For now, let's just call adapter.mount.
    // But adapter.mount signature expects HttpAdapter, not Photon.
    // The current code expects a Photon instance.
    // This is a break.
    // Temporary fix: Check adapter type or wrap orbitApp.
    if (this.adapter.name === 'photon') {
      ;(this.adapter.native as any).route(path, orbitApp)
    } else {
      // Warn or try to mount if adapter supports it?
      // BunNativeAdapter "mount" takes HttpAdapter.
      // orbitApp is Photon. We can wrap orbitApp in PhotonAdapter!
      // NOTE: We assume 'orbitApp' is a Photon instance compatible with PhotonAdapter
      const subAdapter = new PhotonAdapter({}, orbitApp as any)
      this.adapter.mount(path, subAdapter)
    }
  }

  /**
   * Start the core (Liftoff).
   *
   * Returns a config object for `Bun.serve`.
   *
   * @param port - Optional port number (defaults to config or 3000).
   * @returns An object compatible with Bun.serve({ ... }).
   *
   * @example
   * ```typescript
   * export default core.liftoff(3000);
   * ```
   */
  liftoff(port?: number): {
    port: number
    fetch: (request: Request, server?: unknown) => Response | Promise<Response>
    core: PlanetCore
  } {
    // Priority: argument > config > default
    const finalPort = port ?? this.config.get<number>('PORT', 3000)

    // Call hooks before liftoff
    this.hooks.doAction('app:liftoff', { port: finalPort })

    this.logger.info(`Ready to liftoff on port ${finalPort} 🚀`)

    return {
      port: finalPort,
      fetch: this.adapter.fetch.bind(this.adapter), // Ensure we bind to adapter not app
      core: this,
    }
  }
}
