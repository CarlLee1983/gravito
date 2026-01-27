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

import { RadixRouter } from '../adapters/bun/RadixRouter'
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
export class AOTRouter {
  // Static route cache: "METHOD:PATH" -> RouteMetadata
  /** @internal */
  public readonly staticRoutes = new Map<string, RouteMetadata>()

  // Dynamic route handler (Radix Tree)
  private dynamicRouter = new RadixRouter()

  // Store all route definitions to support mounting/merging
  /** @internal */
  public readonly routeDefinitions: RouteDefinition[] = []

  // Global middleware (applies to all routes)
  /** @internal */
  public readonly globalMiddleware: Middleware[] = []

  // Path-based middleware: pattern -> middleware[]
  /** @internal */
  public readonly pathMiddleware = new Map<string, Middleware[]>()

  private middlewareCache = new Map<string, { data: Middleware[]; version: number }>()
  private cacheMaxSize = 1000
  private version = 0

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
  add(method: HttpMethod, path: string, handler: Handler, middleware: Middleware[] = []): void {
    // Store definition for mounting support
    this.routeDefinitions.push({ method, path, handler, middleware })

    const normalizedMethod = method.toLowerCase() as HttpMethod

    if (this.isStaticPath(path)) {
      // Static route - use Map
      const key = `${normalizedMethod}:${path}`
      this.staticRoutes.set(key, { handler, middleware })
    } else {
      // Dynamic route - use Radix Tree
      // Wrap handler to match our Handler type
      const wrappedHandler = handler as unknown as Function
      this.dynamicRouter.add(normalizedMethod, path, [wrappedHandler])

      // Store middleware separately
      if (middleware.length > 0) {
        this.pathMiddleware.set(`${normalizedMethod}:${path}`, middleware)
      }
    }
  }

  /**
   * Mount another router at a prefix
   */
  mount(prefix: string, other: AOTRouter): void {
    // 1. Convert other's global middleware to pattern middleware
    if (other.globalMiddleware.length > 0) {
      // Apply to both /prefix and /prefix/*
      this.usePattern(prefix, ...other.globalMiddleware)

      const wildcard = prefix === '/' ? '/*' : `${prefix}/*`
      this.usePattern(wildcard, ...other.globalMiddleware)
    }

    // 2. Transfer pattern-based middleware
    for (const [pattern, mws] of other.pathMiddleware) {
      // Skip internal dynamic route entries (contain ':')
      if (pattern.includes(':')) {
        continue
      }

      // Normalize pattern
      let newPattern: string
      if (pattern === '*') {
        newPattern = prefix === '/' ? '/*' : `${prefix}/*`
      } else if (pattern.startsWith('/')) {
        newPattern = prefix === '/' ? pattern : `${prefix}${pattern}`
      } else {
        newPattern = prefix === '/' ? `/${pattern}` : `${prefix}/${pattern}`
      }

      this.usePattern(newPattern, ...mws)
    }

    // 3. Transfer all routes
    for (const def of other.routeDefinitions) {
      // Calculate new path
      let newPath: string
      if (prefix === '/') {
        newPath = def.path
      } else if (def.path === '/') {
        newPath = prefix
      } else {
        newPath = `${prefix}${def.path}`
      }

      this.add(def.method, newPath, def.handler, def.middleware)
    }
  }

  /**
   * Add global middleware
   *
   * These run for every request, before route-specific middleware.
   *
   * @param middleware - Middleware functions
   */
  use(...middleware: Middleware[]): void {
    this.globalMiddleware.push(...middleware)
    this.version++
  }

  /**
   * Add path-based middleware
   *
   * Supports wildcard patterns like '/api/*'
   *
   * @param pattern - Path pattern
   * @param middleware - Middleware functions
   */
  usePattern(pattern: string, ...middleware: Middleware[]): void {
    // Special case: '*' pattern should be treated as global middleware
    if (pattern === '*') {
      this.globalMiddleware.push(...middleware)
    } else {
      const existing = this.pathMiddleware.get(pattern) ?? []
      this.pathMiddleware.set(pattern, [...existing, ...middleware])
    }
    this.version++
  }

  /**
   * Match a request to a route
   *
   * Returns the handler, params, and all applicable middleware.
   *
   * @param method - HTTP method
   * @param path - Request path
   * @returns Route match or null if not found
   */
  match(method: string, path: string): RouteMatch {
    const normalizedMethod = method.toLowerCase() as HttpMethod

    // Try static route first (O(1))
    const staticKey = `${normalizedMethod}:${path}`
    const staticRoute = this.staticRoutes.get(staticKey)

    if (staticRoute) {
      return {
        handler: staticRoute.handler,
        params: {},
        middleware: this.collectMiddleware(path, staticRoute.middleware),
        routePattern: path,
      }
    }

    // Try dynamic route (Radix Tree)
    const match = this.dynamicRouter.match(normalizedMethod, path)

    if (match && match.handlers.length > 0) {
      const handler = match.handlers[0] as unknown as Handler
      const routeKey = this.findDynamicRouteKey(normalizedMethod, path)
      const routeMiddleware = routeKey ? (this.pathMiddleware.get(routeKey) ?? []) : []

      return {
        handler,
        params: match.params,
        middleware: this.collectMiddleware(path, routeMiddleware),
        routePattern: routeKey ?? undefined,
      }
    }

    // No match
    return {
      handler: null,
      params: {},
      middleware: [],
    }
  }

  /**
   * Public wrapper for collectMiddleware (used by Gravito for optimization)
   */
  collectMiddlewarePublic(path: string, routeMiddleware: Middleware[]): Middleware[] {
    return this.collectMiddleware(path, routeMiddleware)
  }

  /**
   * Collect all applicable middleware for a path
   *
   * Order: global -> pattern-based -> route-specific
   *
   * @param path - Request path
   * @param routeMiddleware - Route-specific middleware
   * @returns Combined middleware array
   */
  private collectMiddleware(path: string, routeMiddleware: Middleware[]): Middleware[] {
    // Fast path: no middleware at all
    if (
      this.globalMiddleware.length === 0 &&
      this.pathMiddleware.size === 0 &&
      routeMiddleware.length === 0
    ) {
      return []
    }

    const cacheKey = `${path}:${routeMiddleware.length}`
    const cached = this.middlewareCache.get(cacheKey)
    if (cached !== undefined && cached.version === this.version) {
      return cached.data
    }

    const middleware: Middleware[] = []

    // 1. Global middleware
    if (this.globalMiddleware.length > 0) {
      middleware.push(...this.globalMiddleware)
    }

    // 2. Pattern-based middleware
    if (this.pathMiddleware.size > 0) {
      for (const [pattern, mw] of this.pathMiddleware) {
        // Skip route-specific entries (they have method prefix)
        if (pattern.includes(':')) {
          continue
        }

        if (this.matchPattern(pattern, path)) {
          middleware.push(...mw)
        }
      }
    }

    if (routeMiddleware.length > 0) {
      middleware.push(...routeMiddleware)
    }

    if (this.middlewareCache.size < this.cacheMaxSize) {
      this.middlewareCache.set(cacheKey, { data: middleware, version: this.version })
    }

    return middleware
  }

  /**
   * Check if a path is static (no parameters or wildcards)
   */
  private isStaticPath(path: string): boolean {
    return !path.includes(':') && !path.includes('*')
  }

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
  private matchPattern(pattern: string, path: string): boolean {
    if (pattern === '*') {
      return true
    }
    if (pattern === path) {
      return true
    }

    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2)
      return path.startsWith(prefix)
    }

    return false
  }

  /**
   * Find the original route key for a matched dynamic route
   *
   * This is needed to look up route-specific middleware.
   * It's a bit of a hack, but avoids storing duplicate data.
   *
   * @param method - HTTP method
   * @param path - Matched path
   * @returns Route key or null
   */
  private findDynamicRouteKey(method: HttpMethod, _path: string): string | null {
    // This is a simple implementation
    // In production, we might want to store a reverse mapping
    for (const key of this.pathMiddleware.keys()) {
      if (key.startsWith(`${method}:`)) {
        return key
      }
    }
    return null
  }

  /**
   * Get all registered routes (for debugging)
   */
  getRoutes(): Array<{ method: string; path: string; type: 'static' | 'dynamic' }> {
    const routes: Array<{ method: string; path: string; type: 'static' | 'dynamic' }> = []

    // Static routes
    for (const key of this.staticRoutes.keys()) {
      const [method, path] = key.split(':')
      routes.push({ method: method!, path: path!, type: 'static' })
    }

    // Dynamic routes (harder to enumerate from Radix Tree)
    // For now, we'll skip this - it's mainly for debugging anyway

    return routes
  }
}
