/**
 * @fileoverview PlanetCore - The Heart of Gravito Framework
 *
 * The micro-kernel that orchestrates the entire Galaxy Architecture.
 * Manages HTTP routing, middleware, error handling, and orbit integration.
 *
 * @module @gravito/core
 * @since 1.0.0
 */
import { type HttpAdapter } from './adapters/types'
import { ConfigManager } from './ConfigManager'
import { Container } from './Container'
import { EventManager } from './EventManager'
import { type RegisterGlobalErrorHandlersOptions } from './GlobalErrorHandlers'
import { HookManager } from './HookManager'
import type { fail } from './helpers/response'
import type { ContentfulStatusCode, GravitoContext } from './http/types'
import { type Logger } from './Logger'
import { type ObservabilityProvider } from './observability/contracts'
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
export declare class PlanetCore {
  /**
   * The HTTP adapter used by this core instance.
   * @since 2.0.0
   */
  private _adapter
  /**
   * Access the underlying Photon app instance.
   * @deprecated Use adapter methods for new code. This property is kept for backward compatibility.
   */
  get app(): unknown
  /**
   * Get the HTTP adapter instance.
   * @since 2.0.0
   */
  get adapter(): HttpAdapter
  logger: Logger
  config: ConfigManager
  hooks: HookManager
  events: EventManager
  router: Router
  container: Container
  /** @deprecated Use core.container instead */
  services: Map<string, unknown>
  encrypter?: Encrypter
  hasher: BunHasher
  /**
   * Observability provider for distributed tracing and metrics.
   * @since 2.2.0
   */
  observabilityProvider: ObservabilityProvider
  private providers
  private deferredProviders
  private bootedProviders
  private isShuttingDown
  /**
   * Initialize observability asynchronously (metrics, tracing, Prometheus).
   * This is called from constructor but doesn't block initialization.
   *
   * Phase 2.2 Update: Now uses the observabilityProvider passed from @gravito/monitor
   * or falls back to OTel implementation if available for backward compatibility.
   *
   * @internal
   */
  private initializeObservabilityAsync
  /**
   * Initialize Prometheus metrics asynchronously.
   *
   * @internal
   * @deprecated Prometheus setup has been moved to @gravito/monitor
   */
  private initializePrometheusAsync
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
  register(provider: ServiceProvider): this
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
  bootstrap(): Promise<void>
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
  ready(): Promise<void>
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
  shutdown(): Promise<void>
  /**
   * Setup deferred provider resolution.
   * Wraps container.make to auto-register deferred providers on first request.
   *
   * @internal
   */
  private setupDeferredProviderResolution
  /**
   * Register a deferred provider on-demand.
   *
   * @internal
   */
  private registerDeferredProvider
  /**
   * Boot a single provider if not already booted.
   *
   * @internal
   */
  private bootProvider
  constructor(options?: {
    logger?: Logger
    config?: Record<string, unknown>
    adapter?: HttpAdapter
    container?: Container
    observabilityProvider?: ObservabilityProvider
  })
  /**
   * Setup process signal handlers for graceful shutdown
   *
   * @internal
   */
  private setupSignalHandlers
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
  orbit(orbit: GravitoOrbit | (new () => GravitoOrbit)): Promise<this>
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
  use(satellite: ServiceProvider | ((core: PlanetCore) => void | Promise<void>)): Promise<this>
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
    options?: Omit<RegisterGlobalErrorHandlersOptions, 'core'>
  ): () => void
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
  warmup(paths: string[]): Promise<void>
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
  static boot(config: GravitoConfig): Promise<PlanetCore>
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
  mountOrbit(path: string, orbitApp: unknown): void
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
  }
}
