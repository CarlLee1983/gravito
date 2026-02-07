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
import { type HttpAdapter, isHttpAdapter } from './adapters/types'
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

/**
 * Interface for View Rendering Service
 * @public
 */
export interface ViewService {
  render(view: string, data?: Record<string, unknown>, options?: Record<string, unknown>): string
}

/**
 * Context passed to error handlers
 * @public
 */
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

/**
 * Interface for Gravito Orbit (Plugin/Module)
 * @public
 */
export interface GravitoOrbit {
  install(core: PlanetCore): void | Promise<void>
}

/**
 * Configuration for booting PlanetCore
 * @public
 */
export type GravitoConfig = {
  logger?: Logger
  config?: Record<string, unknown>
  orbits?: (new () => GravitoOrbit)[] | GravitoOrbit[]
  /**
   * HTTP Adapter to use. Defaults to PhotonAdapter.
   * @since 2.0.0
   */
  adapter?: HttpAdapter
  /**
   * Dependency Injection Container. If provided, PlanetCore will use this
   * container instead of creating a new one. This allows sharing a container
   * between Application and PlanetCore.
   * @since 2.0.0
   */
  container?: Container
}

import { BunNativeAdapter } from './adapters/bun/BunNativeAdapter'
import { setApp } from './helpers'
import { CookieJar } from './http/CookieJar'
import { Router } from './Router'
import { Encrypter } from './security/Encrypter'
import { BunHasher } from './security/Hasher'

/**
 * PlanetCore - The Heart of Gravito Framework
 *
 * The micro-kernel that orchestrates the entire Galaxy Architecture.
 * Manages HTTP routing, middleware, error handling, and orbit integration.
 * @public
 */
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
  public container: Container
  /** @deprecated Use core.container instead */
  public services: Map<string, unknown> = new Map()

  public encrypter?: Encrypter
  public hasher: BunHasher

  private providers: ServiceProvider[] = []
  private deferredProviders: Map<string, ServiceProvider> = new Map()
  private bootedProviders: Set<ServiceProvider> = new Set()

  /**
   * Register a service provider to the core.
   *
   * Service providers are the central place to configure your application.
   * They bind services to the container and bootstrap application features.
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
    if (typeof (provider as any).setCore === 'function') {
      ;(provider as any).setCore(this)
    } else {
      // Fallback: set core directly on the provider
      ;(provider as any).core = this
    }

    // Handle deferred providers
    if (provider.deferred) {
      const services = provider.provides()
      for (const service of services) {
        this.deferredProviders.set(service, provider)
      }
    } else {
      this.logger.debug(`📝 Registering provider: ${provider.constructor.name}`)
      this.providers.push(provider)
    }

    return this
  }

  /**
   * Bootstrap the application by registering and booting providers.
   *
   * This method orchestrates the two-phase startup sequence:
   * 1. Registration: Calls `register()` on all providers to bind services.
   * 2. Booting: Calls `boot()` on all providers once all bindings are ready.
   *
   * This method must be called before the application starts handling requests.
   *
   * @returns Promise that resolves when bootstrapping is complete.
   * @throws Error if a deferred provider has an asynchronous register method.
   *
   * @example
   * ```typescript
   * await core.bootstrap();
   * ```
   */
  async bootstrap(): Promise<void> {
    // Phase 1: Register all bindings (supports async)
    this.logger.debug(`🔄 Bootstrapping ${this.providers.length} providers`)
    for (const provider of this.providers) {
      this.logger.debug(`  Registering: ${provider.constructor.name}`)
      await provider.register(this.container)
    }

    // Phase 2: Setup deferred provider resolution
    this.setupDeferredProviderResolution()

    // Phase 3: Boot all providers
    for (const provider of this.providers) {
      await this.bootProvider(provider)
    }

    // Phase 4: Bind global error handler (swappable via container)
    // We bind this late to allow ServiceProviders to override 'error.handler'
    if (this.container.has('error.handler')) {
      const errorHandler = this.container.make<ErrorHandler>('error.handler')
      this.adapter.onError(errorHandler.handleError.bind(errorHandler))
      this.adapter.onNotFound(errorHandler.handleNotFound.bind(errorHandler))
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
      container?: Container
    } = {}
  ) {
    this.logger = options.logger ?? new ConsoleLogger()
    this.config = new ConfigManager(options.config ?? {})
    this.hooks = new HookManager()
    this.events = new EventManager(this)

    // Use provided container or create a new one
    this.container = options.container ?? new Container()

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

    /**
     * Core Middleware for Context Injection
     */
    this.adapter.use('*', async (c, next) => {
      c.set('core', this)
      c.set('logger', this.logger)
      c.set('config', this.config)

      const cookieJar = new CookieJar(this.encrypter)
      c.set('cookieJar', cookieJar)

      // Add route helper
      c.route = (name: string, params?: any, query?: any) => this.router.url(name, params, query)

      const result = await next()

      // Automatically attach queued cookies to response
      cookieJar.attach(c)

      return result
    })

    // Router depends on `core.app` for route registration and optional global middleware.
    this.router = new Router(this)

    // Register Default Error Handler
    // Can be overridden by binding 'error.handler' in a ServiceProvider
    this.container.singleton('error.handler', () => {
      return new ErrorHandler({
        logger: this.logger,
        hooks: this.hooks,
        getCore: () => this,
      })
    })

    // Bind default handlers immediately so basic usage and tests work without explicit bootstrap()
    const defaultHandler = this.container.make<ErrorHandler>('error.handler')
    this.adapter.onError(defaultHandler.handleError.bind(defaultHandler))
    this.adapter.onNotFound(defaultHandler.handleNotFound.bind(defaultHandler))
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

  /**
   * Register a global error handler for process-level exceptions.
   *
   * Captures `unhandledRejection` and `uncaughtException` to prevent process crashes
   * and allow for graceful shutdown or error reporting.
   *
   * @param options - Configuration for global error handling.
   * @returns A function to unregister the global error handlers.
   *
   * @example
   * ```typescript
   * const unregister = core.registerGlobalErrorHandlers({
   *   exitOnFatal: true
   * });
   * ```
   */
  registerGlobalErrorHandlers(
    options: Omit<RegisterGlobalErrorHandlersOptions, 'core'> = {}
  ): () => void {
    return registerGlobalErrorHandlers({ ...options, core: this })
  }

  /**
   * Predictive Route Warming (JIT Optimization).
   *
   * Pre-compiles or warms up the specified paths in the HTTP adapter to reduce
   * latency for the first request to these endpoints.
   *
   * @param paths - List of paths to warm up.
   * @returns Promise that resolves when warming is complete.
   *
   * @example
   * ```typescript
   * await core.warmup(['/api/v1/products', '/api/v1/categories']);
   * ```
   */
  async warmup(paths: string[]): Promise<void> {
    if (this.adapter.warmup) {
      await this.adapter.warmup(paths)
    }
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
      ...(config.container && { container: config.container }),
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
   * Mount an Orbit (a PlanetCore instance or native app) to a specific URL path.
   *
   * This allows for micro-service like composition where different parts of the
   * application can be developed as independent Orbits and mounted together.
   *
   * @param path - The URL path to mount the orbit at.
   * @param orbitApp - The application instance (PlanetCore, HttpAdapter, or native app).
   *
   * @example
   * ```typescript
   * const blogOrbit = new PlanetCore();
   * core.mountOrbit('/blog', blogOrbit);
   * ```
   */
  mountOrbit(path: string, orbitApp: unknown): void {
    this.logger.info(`Mounting orbit at path: ${path}`)

    let subAdapter: HttpAdapter

    if (orbitApp instanceof PlanetCore) {
      subAdapter = orbitApp.adapter
    } else if (isHttpAdapter(orbitApp)) {
      subAdapter = orbitApp
    } else {
      // It's likely a native app instance (e.g. Hono)
      // Wrap it in PhotonAdapter to conform to HttpAdapter interface.
      // PhotonAdapter.mount() will handle optimization if parent is also Photon.
      subAdapter = new PhotonAdapter({}, orbitApp)
    }

    this.adapter.mount(path, subAdapter)
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
    websocket?: HttpAdapter['websocket']
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
      websocket: this.adapter.websocket,
    }
  }
}
