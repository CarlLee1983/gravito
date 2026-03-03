/**
 * @fileoverview Gravito - High-Performance Web Engine for Bun
 *
 * The standalone engine optimized exclusively for Bun runtime.
 * 99% API-compatible with Hono, but faster through Bun-specific optimizations.
 *
 * Key optimizations:
 * 1. Object pooling for zero-allocation request handling
 * 2. AOT router with O(1) static route lookup
 * 3. Lazy parsing - only parse what's accessed
 * 4. Direct Bun.serve integration without wrapper layers
 *
 * @module @gravito/core/engine
 */
import type {
  EngineOptions,
  ErrorHandler,
  Handler,
  Middleware,
  NotFoundHandler,
  RouteMetadata,
} from './types'
/**
 * Gravito - The High-Performance Web Engine
 */
export declare class Gravito {
  private router
  private contextPool
  private errorHandler?
  private notFoundHandler?
  /** @internal */
  staticRoutes: Map<string, RouteMetadata>
  private isPureStaticApp
  private compiledDynamicRoutes
  /**
   * Create a new Gravito instance
   *
   * @param options - Engine configuration options
   */
  constructor(options?: EngineOptions)
  /**
   * Register a GET route
   */
  get(path: string, ...handlers: Handler[]): this
  /**
   * Register a POST route
   */
  post(path: string, ...handlers: Handler[]): this
  /**
   * Register a PUT route
   */
  put(path: string, ...handlers: Handler[]): this
  /**
   * Register a DELETE route
   */
  delete(path: string, ...handlers: Handler[]): this
  /**
   * Register a PATCH route
   */
  patch(path: string, ...handlers: Handler[]): this
  /**
   * Register an OPTIONS route
   */
  options(path: string, ...handlers: Handler[]): this
  /**
   * Register a HEAD route
   */
  head(path: string, ...handlers: Handler[]): this
  /**
   * Register a route for all HTTP methods
   */
  all(path: string, ...handlers: Handler[]): this
  /**
   * Register global or path-based middleware
   */
  use(path: string, ...middleware: Middleware[]): this
  use(...middleware: Middleware[]): this
  /**
   * Mount a sub-application at a path prefix
   */
  route(path: string, app: Gravito): this
  /**
   * Set custom error handler
   */
  onError(handler: ErrorHandler): this
  /**
   * Set custom 404 handler
   */
  notFound(handler: NotFoundHandler): this
  /**
   * Predictive Route Warming (JIT Optimization)
   *
   * Simulates requests to specified routes to trigger JIT compilation (FTL)
   * before real traffic arrives.
   *
   * @param paths List of paths to warm up (e.g. ['/api/users', '/health'])
   */
  warmup(paths: string[]): Promise<void>
  /**
   * Generate Native Bun.serve Configuration
   *
   * Offloads static routes to Bun's SIMD-accelerated native router.
   * Supports pre-compiled middleware chains for zero runtime lookup.
   */
  serveConfig(baseConfig?: Record<string, unknown>): Record<string, unknown>
  /**
   * Optimize TLS Configuration for Bun 1.39+
   */
  private optimizeTLS
  /**
   * Handle an incoming request
   */
  fetch: (request: Request) => Promise<Response>
  /**
   * Handle dynamic routes with Radix Tree
   */
  private handleDynamicRoute
  /**
   * Sync error handler (for ultra-fast path)
   */
  private handleErrorSync
  /**
   * Sync 404 handler (for ultra-fast path)
   */
  private handleNotFoundSync
  /**
   * Collect middleware for a specific path
   */
  private collectMiddlewareForPath
  /**
   * Compile routes for optimization
   */
  private compileRoutes
  /**
   * Add a route to the router
   */
  private addRoute
}
