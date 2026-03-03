/**
 * @fileoverview AOT (Ahead-of-Time) Router
 *
 * Hybrid routing strategy:
 * - Static routes: O(1) Map lookup
 * - Dynamic routes: Optimized Radix Tree
 *
 * The key optimization is separating static from dynamic routes at registration time,
 * not at match time. This eliminates unnecessary tree traversal for static paths.
 *
 * @module @gravito/core/engine
 */
import type { HttpMethod } from '../http/types'
import type { Handler, Middleware, RouteMatch, RouteMetadata } from './types'
/**
 * Route definition for re-playing routes (mounting)
 */
interface RouteDefinition {
  method: HttpMethod
  path: string
  handler: Handler
  middleware: Middleware[]
}
/**
 * AOT Router - Optimized for Bun
 */
export declare class AOTRouter {
  /** @internal */
  readonly staticRoutes: Map<string, RouteMetadata>
  private dynamicRouter
  /** @internal */
  readonly routeDefinitions: RouteDefinition[]
  /** @internal */
  readonly globalMiddleware: Middleware[]
  /** @internal */
  readonly pathMiddleware: Map<string, Middleware[]>
  private dynamicRoutePatterns
  private middlewareCache
  private cacheMaxSize
  private _version
  /**
   * Get the current version for cache invalidation
   * Incremented whenever middleware or routes are modified
   */
  get version(): number
  /**
   * Register a route
   *
   * Automatically determines if route is static or dynamic.
   * Static routes are stored in a Map for O(1) lookup.
   * Dynamic routes use the Radix Tree.
   *
   * @param method - HTTP method
   * @param path - Route path
   * @param handler - Route handler
   * @param middleware - Route-specific middleware
   */
  add(method: HttpMethod, path: string, handler: Handler, middleware?: Middleware[]): void
  /**
   * Mount another router at a prefix
   */
  mount(prefix: string, other: AOTRouter): void
  /**
   * Add global middleware
   *
   * These run for every request, before route-specific middleware.
   *
   * @param middleware - Middleware functions
   */
  use(...middleware: Middleware[]): void
  /**
   * Add path-based middleware
   *
   * Supports wildcard patterns like '/api/*'
   *
   * @param pattern - Path pattern
   * @param middleware - Middleware functions
   */
  usePattern(pattern: string, ...middleware: Middleware[]): void
  /**
   * Match a request to a route
   *
   * Returns the handler, params, and all applicable middleware.
   *
   * @param method - HTTP method
   * @param path - Request path
   * @returns Route match or null if not found
   */
  match(method: string, path: string): RouteMatch
  /**
   * Public wrapper for collectMiddleware (used by Gravito for optimization)
   */
  collectMiddlewarePublic(path: string, routeMiddleware: Middleware[]): Middleware[]
  /**
   * Collect all applicable middleware for a path
   *
   * Order: global -> pattern-based -> route-specific
   *
   * @param path - Request path
   * @param routeMiddleware - Route-specific middleware
   * @returns Combined middleware array
   */
  private collectMiddleware
  /**
   * Get all static routes optimized for Bun's native router.
   *
   * Unlike basic offloading, this version supports routes with middleware
   * by pre-compiling the middleware chain into a single native handler.
   *
   * @param onMatch - Factory to wrap handler and middleware into a Bun-compatible function
   * @returns Record of path -> Handler (Bun-compatible)
   */
  getNativeRoutes(
    onMatch: (
      handler: Handler,
      middleware: Middleware[],
      path: string
    ) => (req: Request) => Response | Promise<Response>
  ): Record<string, any>
  /**
   * Check if a path is static (no parameters or wildcards)
   */
  private isStaticPath
  /**
   * Match a pattern against a path
   *
   * Supports:
   * - Exact match: '/api/users'
   * - Wildcard suffix: '/api/*'
   *
   * @param pattern - Pattern to match
   * @param path - Path to test
   * @returns True if pattern matches
   */
  private matchPattern
  /**
   * Get all registered routes (for debugging)
   */
  getRoutes(): Array<{
    method: string
    path: string
    type: 'static' | 'dynamic'
  }>
}
