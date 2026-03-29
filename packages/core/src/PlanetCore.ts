/**
 * @fileoverview PlanetCore - The Heart of Gravito Framework
 *
 * The micro-kernel that orchestrates the entire Galaxy Architecture.
 * Manages HTTP routing, middleware, error handling, and orbit integration.
 *
 * @module @gravito/core
 * @since 1.0.0
 */

import { type HttpAdapter, isHttpAdapter } from './adapters/types'
import { ConfigManager } from './ConfigManager'
import { Container } from './Container'
import { ErrorHandler } from './ErrorHandler'
import { EventManager } from './EventManager'
import { ObservableHookManager } from './events/observability/ObservableHookManager'
import { OTelEventMetrics } from './events/observability/OTelEventMetrics'
import {
  type RegisterGlobalErrorHandlersOptions,
  registerGlobalErrorHandlers,
} from './GlobalErrorHandlers'
import { HookManager } from './HookManager'
import type { fail } from './helpers/response'
import type { ContentfulStatusCode, GravitoContext } from './http/types'
import { ConsoleLogger, type Logger } from './Logger'
import {
  createNoOpObservabilityProvider,
  type ObservabilityProvider,
} from './observability/contracts'
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
   * HTTP Adapter to use. Defaults to BunNativeAdapter in Bun environments.
   * In non-Bun environments, must be provided explicitly.
   * @example
   * ```typescript
   * import { PhotonAdapter } from '@gravito/photon/adapter'
   * new PlanetCore({ adapter: new PhotonAdapter() })
   * ```
   * See https://gravito.dev/guides/http-adapters for available adapters.
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

  /**
   * Observability configuration for event system.
   * @since 2.1.0
   */
  observability?: {
    /**
     * Enable event system observability (metrics, tracing).
     * @default false
     */
    enabled?: boolean
    /**
     * Enable OpenTelemetry distributed tracing.
     * @default false
     */
    tracing?: boolean
    /**
     * Prefix for metric names.
     * @default 'gravito_event_'
     */
    metricsPrefix?: string
    /**
     * Prometheus metrics configuration.
     */
    prometheus?: {
      /**
       * Enable Prometheus metrics endpoint.
       * @default true
       */
      enabled?: boolean
      /**
       * Port for Prometheus metrics endpoint.
       * @default 9090
       */
      port?: number
      /**
       * Endpoint path for metrics.
       * @default '/metrics'
       */
      endpoint?: string
    }
  }

  /**
   * Observability provider for distributed tracing and metrics.
   * If provided, this will be used instead of the default OTel setup.
   * @since 2.2.0
   */
  observabilityProvider?: ObservabilityProvider
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

  /**
   * Observability provider for distributed tracing and metrics.
   * @since 2.2.0
   */
  public observabilityProvider: ObservabilityProvider

  private providers: ServiceProvider[] = []
  private deferredProviders: Map<string, ServiceProvider> = new Map()
  private bootedProviders: Set<ServiceProvider> = new Set()
  private isShuttingDown = false

  /**
   * Global shutdown timeout in milliseconds (D-10).
   * If the entire shutdown sequence does not complete within this limit,
   * a warning is logged and shutdown is force-completed so the process can exit.
   */
  private static readonly GLOBAL_SHUTDOWN_TIMEOUT = 10_000

  /**
   * Initialize observability asynchronously (metrics, tracing, Prometheus).
   * This is called from constructor but doesn't block initialization.
   *
   * Phase 2.2 Update: Now uses the observabilityProvider passed from @gravito/monitor
   * or falls back to OTel implementation if available for backward compatibility.
   *
   * @internal
   */
  private async initializeObservabilityAsync(
    obsConfig: GravitoConfig['observability']
  ): Promise<void> {
    try {
      // If observabilityProvider is already provided (from monitor), use it directly
      if (
        this.observabilityProvider &&
        this.observabilityProvider !== (this.observabilityProvider as any)._isNoOp
      ) {
        this.logger.info('[Observability] ✅ Using observability provider from @gravito/monitor')
        // Prometheus setup is handled by monitor
        if (obsConfig?.prometheus?.enabled !== false) {
          await this.initializePrometheusAsync(obsConfig)
        }
        return
      }

      // Fallback: Import OpenTelemetry API (backward compatibility)
      // @deprecated This path is deprecated in Phase 2.2. Use @gravito/monitor instead.
      try {
        const otel = await import('@opentelemetry/api')
        const meter = otel.metrics.getMeter('@gravito/core', '2.1.0')

        // Create event metrics
        const eventMetrics = new OTelEventMetrics(
          meter,
          obsConfig?.metricsPrefix ?? 'gravito_event_'
        )

        // Create and set ObservableHookManager
        const observableHooks = new ObservableHookManager(
          {},
          {
            enabled: true,
            metrics: eventMetrics,
            tracing: obsConfig?.tracing ?? false,
            metricsPrefix: obsConfig?.metricsPrefix ?? 'gravito_event_',
          }
        )

        // Set queue depth callback
        eventMetrics.setQueueDepthCallback(() => {
          const queue = (observableHooks as any).getEventQueue()
          return {
            critical: queue.getDepthByPriority('critical'),
            high: queue.getDepthByPriority('high'),
            normal: queue.getDepthByPriority('normal'),
            low: queue.getDepthByPriority('low'),
          }
        })

        // Replace hooks with observable version
        this.hooks = observableHooks
        this.logger.warn(
          '[Observability] ⚠️  Using legacy OTel path. Migrate to @gravito/monitor for full observability.'
        )

        // Initialize Prometheus if enabled
        if (obsConfig?.prometheus?.enabled !== false) {
          await this.initializePrometheusAsync(obsConfig)
        }
      } catch (error) {
        this.logger.debug('[Observability] OpenTelemetry not available, using no-op', error)
        // Use the no-op observability provider that was set in constructor
      }
    } catch (error) {
      this.logger.error('[Observability] Failed to initialize observability:', error)
      // Hooks already initialized to HookManager in constructor
    }
  }

  /**
   * Initialize Prometheus metrics asynchronously.
   *
   * @internal
   * @deprecated Prometheus setup has been moved to @gravito/monitor
   */
  private async initializePrometheusAsync(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _obsConfig: GravitoConfig['observability']
  ): Promise<void> {
    // Prometheus metrics setup has been moved to @gravito/monitor
    // This method is retained for backwards compatibility but is now a no-op.
    this.logger.debug(
      '[Observability] Prometheus setup moved to @gravito/monitor. ' +
        'Use monitor package for metrics initialization.'
    )
  }

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
    // Phase 0: Validate configuration
    try {
      this.config.validate()
    } catch (error) {
      this.logger.error('Configuration validation failed:', error)
      throw error
    }

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

    // Phase 5: Call ready() hook for final initialization
    await this.ready()
  }

  /**
   * Called when the application is ready to accept requests.
   *
   * Invokes the `onReady()` lifecycle hook on all providers.
   * Called automatically at the end of `bootstrap()`.
   *
   * @returns Promise that resolves when all providers are ready.
   *
   * @example
   * ```typescript
   * await core.ready();
   * ```
   */
  async ready(): Promise<void> {
    this.logger.debug('🟢 Application ready phase started')
    for (const provider of this.providers) {
      if (provider.onReady) {
        this.logger.debug(`  onReady: ${provider.constructor.name}`)
        await provider.onReady(this)
      }
    }
    this.hooks.doAction('app:ready', this)
    this.logger.debug('✅ Application ready')
  }

  /**
   * Gracefully shutdown the application.
   *
   * Invokes the `onShutdown()` lifecycle hook on all providers in reverse order (LIFO).
   * Should be called when the application receives a termination signal.
   *
   * @returns Promise that resolves when all providers have shut down.
   *
   * @example
   * ```typescript
   * process.on('SIGTERM', () => core.shutdown());
   * ```
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn('Shutdown already in progress')
      return
    }

    this.isShuttingDown = true
    this.logger.debug('🛑 Application shutdown started')

    const shutdownSequence = async () => {
      // Call onShutdown in reverse order (LIFO)
      for (const provider of [...this.providers].reverse()) {
        if (provider.onShutdown) {
          try {
            this.logger.debug(`  onShutdown: ${provider.constructor.name}`)
            await provider.onShutdown(this)
          } catch (error) {
            this.logger.error(`Error during shutdown of ${provider.constructor.name}:`, error)
          }
        }
      }
    }

    const globalDeadline = new Promise<void>((_, reject) =>
      setTimeout(
        () => reject(new Error('[PlanetCore] Global shutdown timeout exceeded (10s)')),
        PlanetCore.GLOBAL_SHUTDOWN_TIMEOUT
      )
    )

    try {
      await Promise.race([shutdownSequence(), globalDeadline])
    } catch (err) {
      this.logger.warn('[PlanetCore] Forced shutdown after global timeout:', err)
    }

    // Always fire the shutdown hook, even if the global timeout fired
    this.hooks.doAction('app:shutdown', this)
    this.logger.debug('✅ Application shutdown complete')
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

      return originalMake(key) as T
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
      observabilityProvider?: ObservabilityProvider
    } = {}
  ) {
    this.logger = options.logger ?? new ConsoleLogger()
    this.config = new ConfigManager(options.config ?? {})

    // Initialize observability provider (Phase 2.2)
    this.observabilityProvider = options.observabilityProvider ?? createNoOpObservabilityProvider()

    // 可觀測性配置初始化
    const obsConfig = this.config.get<GravitoConfig['observability']>('observability', {
      enabled: false,
    })

    // 初始化 hooks（同步）
    if (obsConfig?.enabled) {
      this.logger.info('[Observability] Enabling event system observability')

      // 異步初始化可觀測性（不阻塞 constructor）
      this.initializeObservabilityAsync(obsConfig)

      // 暫時使用標準 HookManager，會被異步替換
      this.hooks = new HookManager()
    } else {
      // 使用標準 HookManager（向後兼容）
      this.hooks = new HookManager()
    }

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
    // 3. No fallback — caller must provide adapter explicitly
    if (options.adapter) {
      this._adapter = options.adapter
    } else if (typeof Bun !== 'undefined') {
      this._adapter = new BunNativeAdapter()
    } else {
      throw new Error(
        'No HTTP adapter provided. In non-Bun environments, ' +
          'you must explicitly provide an adapter. ' +
          'See https://gravito.dev/guides/http-adapters for available implementations.'
      )
    }

    /**
     * Core Middleware for Context Injection with Request Scope
     */
    this.adapter.use('*', async (c, next) => {
      c.set('core', this)
      c.set('logger', this.logger)
      c.set('config', this.config)

      const cookieJar = new CookieJar(this.encrypter)
      c.set('cookieJar', cookieJar)

      // Add route helper
      c.route = (name: string, params?: any, query?: any) => this.router.url(name, params, query)

      // Execute the request within the container scope context
      // This enables request-scoped services to be properly isolated
      const requestScope = (c as any).requestScope?.()
      const result = requestScope
        ? await Container.runWithScope(requestScope, async () => next())
        : await next()

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

    // Setup signal handlers for graceful shutdown
    this.setupSignalHandlers()
  }

  /**
   * Setup process signal handlers for graceful shutdown
   *
   * @internal
   */
  private setupSignalHandlers(): void {
    const handleSignal = async (signal: string) => {
      this.logger.info(`📍 Received ${signal}, initiating graceful shutdown...`)
      await this.shutdown()
      // Exit after shutdown completes
      process.exit(0)
    }

    process.on('SIGTERM', () => handleSignal('SIGTERM'))
    process.on('SIGINT', () => handleSignal('SIGINT'))
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
      ...(config.observabilityProvider && { observabilityProvider: config.observabilityProvider }),
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
      throw new Error(
        'mountOrbit() expects a PlanetCore instance or HttpAdapter. ' +
          'To mount a native app (e.g. Hono), wrap it with an HTTP adapter. ' +
          'See https://gravito.dev/guides/http-adapters for available implementations.'
      )
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
