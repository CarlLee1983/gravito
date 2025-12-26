/**
 * @fileoverview PlanetCore - The Heart of Gravito Framework
 *
 * The micro-kernel that orchestrates the entire Galaxy Architecture.
 * Manages HTTP routing, middleware, error handling, and orbit integration.
 *
 * @module gravito-core
 * @since 1.0.0
 */

import { PhotonAdapter } from './adapters/PhotonAdapter'
import type { HttpAdapter } from './adapters/types'
import { ConfigManager } from './ConfigManager'
import { Container } from './Container'
import { EventManager } from './EventManager'
import { GravitoException } from './exceptions/GravitoException'
// import { Photon } from '@gravito/photon' - Decoupled
// import { HTTPException } from '@gravito/photon/http-exception' - Decoupled
import { HttpException } from './exceptions/HttpException'
import { ValidationException } from './exceptions/ValidationException'
import {
  type RegisterGlobalErrorHandlersOptions,
  registerGlobalErrorHandlers,
} from './GlobalErrorHandlers'
import { HookManager } from './HookManager'
import { fail } from './helpers/response'
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

type Variables = {
  core: PlanetCore
  logger: Logger
  config: ConfigManager
  cookieJar: CookieJar
  route: (name: string, params?: RouteParams, query?: RouteQuery) => string
  // Optional orbit-injected variables
  cache?: CacheService
  view?: ViewService
  i18n?: unknown
  session?: unknown
  routeModels?: Record<string, unknown>
}

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

      await next()
      return undefined
    })
    // Router depends on `core.app` for route registration and optional global middleware.
    this.router = new Router(this)

    // Standard Error Handling
    this.adapter.onError(async (err, c) => {
      const isProduction = process.env.NODE_ENV === 'production'
      const codeFromStatus = (status: number): string => {
        switch (status) {
          case 400:
            return 'BAD_REQUEST'
          case 401:
            return 'UNAUTHENTICATED'
          case 403:
            return 'FORBIDDEN'
          case 404:
            return 'NOT_FOUND'
          case 405:
            return 'METHOD_NOT_ALLOWED'
          case 409:
            return 'CONFLICT'
          case 422:
            return 'VALIDATION_ERROR'
          case 429:
            return 'TOO_MANY_REQUESTS'
          default:
            return status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR'
        }
      }
      const messageFromStatus = (status: number): string => {
        switch (status) {
          case 400:
            return 'Bad Request'
          case 401:
            return 'Unauthorized'
          case 403:
            return 'Forbidden'
          case 404:
            return 'Not Found'
          case 405:
            return 'Method Not Allowed'
          case 409:
            return 'Conflict'
          case 422:
            return 'Unprocessable Content'
          case 429:
            return 'Too Many Requests'
          case 500:
            return 'Internal Server Error'
          case 502:
            return 'Bad Gateway'
          case 503:
            return 'Service Unavailable'
          case 504:
            return 'Gateway Timeout'
          default:
            return status >= 500 ? 'Internal Server Error' : 'Request Error'
        }
      }

      // Try rendering HTML if available and requested
      const view = c.get('view') as ViewService | undefined
      const i18n = c.get('i18n') as { t?: (key: string, params?: unknown) => string } | undefined
      // GravitoContext uses c.req.header()
      const accept = c.req.header('Accept') || ''
      const wantsHtml = Boolean(
        view && accept.includes('text/html') && !accept.includes('application/json')
      )
      let status: ContentfulStatusCode = 500
      let message = messageFromStatus(500)
      let code = 'INTERNAL_ERROR'
      let details: unknown

      if (err instanceof GravitoException) {
        status = err.status as ContentfulStatusCode
        code = err.code

        // Fallback for generic HTTP errors to use status-based codes
        if (code === 'HTTP_ERROR') {
          code = codeFromStatus(status)
        }

        if (i18n?.t && err.i18nKey) {
          message = i18n.t(err.i18nKey, err.i18nParams)
        } else {
          message = err.message || messageFromStatus(status)
        }

        if (err instanceof ValidationException) {
          details = err.errors

          // Handle HTML Redirect for Validation
          if (wantsHtml) {
            const session = c.get('session') as
              | { flash: (key: string, value: unknown) => void }
              | undefined
            if (session) {
              // Transform details to ErrorBag format: Record<string, string[]>
              const errorBag: Record<string, string[]> = {}
              for (const e of err.errors) {
                if (!errorBag[e.field]) {
                  errorBag[e.field] = []
                }
                errorBag[e.field]?.push(e.message)
              }
              session.flash('errors', errorBag)

              if (err.input) {
                session.flash('_old_input', err.input)
              }

              const redirectUrl = err.redirectTo ?? c.req.header('Referer') ?? '/'
              return c.redirect(redirectUrl)
            }
          }
        } else if (err instanceof Error && !isProduction && err.cause) {
          details = { cause: err.cause }
        }
      } else if (err instanceof HttpException) {
        status = err.status
        message = err.message
      } else if (
        err instanceof Error &&
        'status' in err &&
        typeof (err as any).status === 'number'
      ) {
        // Handle Photon or other framework exceptions via duck typing
        status = (err as any).status as ContentfulStatusCode
        message = err.message
        code = codeFromStatus(status)
      } else if (err instanceof Error) {
        if (!isProduction) {
          message = err.message || message
        }
      } else if (typeof err === 'string') {
        if (!isProduction) {
          message = err
        }
      }

      if (isProduction && status >= 500) {
        message = messageFromStatus(status)
      }

      if (!isProduction && err instanceof Error && !details) {
        details = { stack: err.stack, ...(details as object) }
      }

      let handlerContext: ErrorHandlerContext = {
        core: this,
        c,
        error: err,
        isProduction,
        accept,
        wantsHtml,
        status,
        payload: fail(message, code, details),
        ...(wantsHtml
          ? {
              html: {
                templates: status === 500 ? ['errors/500'] : [`errors/${status}`, 'errors/500'],
                data: {
                  status,
                  message,
                  code,
                  error: !isProduction && err instanceof Error ? err.stack : undefined,
                  debug: !isProduction,
                  details,
                },
              },
            }
          : {}),
      }

      handlerContext = await this.hooks.applyFilters<ErrorHandlerContext>(
        'error:context',
        handlerContext
      )

      const defaultLogLevel = handlerContext.status >= 500 ? 'error' : 'none'
      const logLevel = handlerContext.logLevel ?? defaultLogLevel
      if (logLevel !== 'none') {
        const rawErrorMessage =
          handlerContext.error instanceof Error
            ? handlerContext.error.message
            : typeof handlerContext.error === 'string'
              ? handlerContext.error
              : handlerContext.payload.error.message
        const msg =
          handlerContext.logMessage ??
          (logLevel === 'error'
            ? `Application Error: ${rawErrorMessage || handlerContext.payload.error.message}`
            : `HTTP ${handlerContext.status}: ${handlerContext.payload.error.message}`)

        if (logLevel === 'error') {
          this.logger.error(msg, err)
        } else if (logLevel === 'warn') {
          this.logger.warn(msg)
        } else {
          this.logger.info(msg)
        }
      }

      await this.hooks.doAction('error:report', handlerContext)

      const customResponse = await this.hooks.applyFilters<Response | null>(
        'error:render',
        null,
        handlerContext
      )
      if (customResponse) {
        return customResponse
      }

      if (handlerContext.wantsHtml && view && handlerContext.html) {
        let lastRenderError: unknown
        for (const template of handlerContext.html.templates) {
          try {
            return c.html(view.render(template, handlerContext.html.data), handlerContext.status)
          } catch (renderError) {
            lastRenderError = renderError
          }
        }
        this.logger.error('Failed to render error view', lastRenderError)
      }

      return c.json(handlerContext.payload, handlerContext.status)
    })

    this.adapter.onNotFound(async (c) => {
      // Try rendering HTML if available and requested
      const view = c.get('view') as ViewService | undefined
      // GravitoContext uses c.req.header
      const accept = c.req.header('Accept') || ''
      const wantsHtml = view && accept.includes('text/html') && !accept.includes('application/json')
      const isProduction = process.env.NODE_ENV === 'production'

      let handlerContext: ErrorHandlerContext = {
        core: this,
        c,
        error: new HttpException(404, { message: 'Route not found' }),
        isProduction,
        accept,
        wantsHtml: Boolean(wantsHtml),
        status: 404,
        payload: fail('Route not found', 'NOT_FOUND'),
        ...(wantsHtml
          ? {
              html: {
                templates: ['errors/404', 'errors/500'],
                data: {
                  status: 404,
                  message: 'Route not found',
                  code: 'NOT_FOUND',
                  debug: !isProduction,
                },
              },
            }
          : {}),
      }

      handlerContext = await this.hooks.applyFilters<ErrorHandlerContext>(
        'notFound:context',
        handlerContext
      )

      const logLevel = handlerContext.logLevel ?? 'info'
      if (logLevel !== 'none') {
        const msg = handlerContext.logMessage ?? `404 Not Found: ${c.req.url}`
        if (logLevel === 'error') {
          this.logger.error(msg)
        } else if (logLevel === 'warn') {
          this.logger.warn(msg)
        } else {
          this.logger.info(msg)
        }
      }

      await this.hooks.doAction('notFound:report', handlerContext)

      const customResponse = await this.hooks.applyFilters<Response | null>(
        'notFound:render',
        null,
        handlerContext
      )
      if (customResponse) {
        return customResponse
      }

      if (handlerContext.wantsHtml && view && handlerContext.html) {
        let lastRenderError: unknown
        for (const template of handlerContext.html.templates) {
          try {
            return c.html(view.render(template, handlerContext.html.data), handlerContext.status)
          } catch (renderError) {
            lastRenderError = renderError
          }
        }
        this.logger.error('Failed to render 404 view', lastRenderError)
      }

      return c.json(handlerContext.payload, handlerContext.status)
    })
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
