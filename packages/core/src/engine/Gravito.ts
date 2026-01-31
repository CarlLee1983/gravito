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

import type { HttpMethod } from '../http/types'
import { AOTRouter } from './AOTRouter'
import { analyzeHandler, getOptimalContextType } from './analyzer'
import { CACHED_RESPONSES, HEADERS } from './constants'
import { FastContext as FastContextImpl } from './FastContext'
import { MinimalContext } from './MinimalContext'
import { extractPath } from './path'
import { ObjectPool } from './pool'
import type {
  CompiledHandler,
  EngineOptions,
  ErrorHandler,
  FastContext,
  Handler,
  Middleware,
  NotFoundHandler,
  RouteMetadata,
} from './types'

/**
 * Precompile middleware chain into a single function
 */
function compileMiddlewareChain(middleware: Middleware[], handler: Handler): CompiledHandler {
  if (middleware.length === 0) {
    return handler as CompiledHandler
  }

  let compiled: CompiledHandler = handler as CompiledHandler

  for (let i = middleware.length - 1; i >= 0; i--) {
    const mw = middleware[i]!
    const nextHandler = compiled
    compiled = async (ctx) => {
      let nextResult: Response | undefined
      const next = async (): Promise<Response | undefined> => {
        nextResult = (await nextHandler(ctx)) as Response
        return nextResult
      }

      const result = await mw(ctx, next)
      // If middleware returns undefined, fall back to the result of next()
      return (result ?? nextResult) as Response
    }
  }

  return compiled
}

/**
 * Gravito - The High-Performance Web Engine
 */
export class Gravito {
  private router = new AOTRouter()
  private contextPool: ObjectPool<FastContextImpl>
  private errorHandler?: ErrorHandler
  private notFoundHandler?: NotFoundHandler

  // Direct reference to static routes Map (O(1) access)
  /** @internal */
  public staticRoutes!: Map<string, RouteMetadata>
  // Flag: pure static app (no middleware at all) allows ultra-fast path
  private isPureStaticApp = true

  // Cache for precompiled dynamic routes
  private compiledDynamicRoutes = new Map<string, { compiled: CompiledHandler; version: number }>()

  // Version tracking for cache invalidation
  private middlewareVersion = 0

  /**
   * Create a new Gravito instance
   *
   * @param options - Engine configuration options
   */
  constructor(options: EngineOptions = {}) {
    const poolSize = options.poolSize ?? 256

    // Initialize context pool
    this.contextPool = new ObjectPool(
      () => new FastContextImpl(),
      (ctx) => ctx.reset(),
      poolSize
    )

    // Pre-warm pool for lower first-request latency
    this.contextPool.prewarm(Math.min(32, poolSize))

    // Set custom handlers if provided
    if (options.onError) {
      this.errorHandler = options.onError
    }
    if (options.onNotFound) {
      this.notFoundHandler = options.onNotFound
    }

    // Initialize route compilation
    this.compileRoutes()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HTTP Method Registration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Register a GET route
   *
   * @param path - Route path (e.g., '/users/:id')
   * @param handlers - Handler and optional middleware
   * @returns This instance for chaining
   */
  get(path: string, ...handlers: Handler[]): this {
    return this.addRoute('get', path, handlers)
  }

  /**
   * Register a POST route
   */
  post(path: string, ...handlers: Handler[]): this {
    return this.addRoute('post', path, handlers)
  }

  /**
   * Register a PUT route
   */
  put(path: string, ...handlers: Handler[]): this {
    return this.addRoute('put', path, handlers)
  }

  /**
   * Register a DELETE route
   */
  delete(path: string, ...handlers: Handler[]): this {
    return this.addRoute('delete', path, handlers)
  }

  /**
   * Register a PDF route
   */
  patch(path: string, ...handlers: Handler[]): this {
    return this.addRoute('patch', path, handlers)
  }

  /**
   * Register an OPTIONS route
   */
  options(path: string, ...handlers: Handler[]): this {
    return this.addRoute('options', path, handlers)
  }

  /**
   * Register a HEAD route
   */
  head(path: string, ...handlers: Handler[]): this {
    return this.addRoute('head', path, handlers)
  }

  /**
   * Register a route for all HTTP methods
   */
  all(path: string, ...handlers: Handler[]): this {
    const methods: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head']
    for (const method of methods) {
      this.addRoute(method, path, handlers)
    }
    return this
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Middleware Registration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Register global or path-based middleware
   */
  use(path: string, ...middleware: Middleware[]): this
  use(...middleware: Middleware[]): this
  use(pathOrMiddleware: string | Middleware, ...middleware: Middleware[]): this {
    // Mark as not pure static since we have middleware
    this.isPureStaticApp = false

    if (typeof pathOrMiddleware === 'string') {
      // Path-based middleware
      this.router.usePattern(pathOrMiddleware, ...middleware)
    } else {
      // Global middleware
      this.router.use(pathOrMiddleware, ...middleware)
    }

    this.middlewareVersion++
    this.compileRoutes()
    return this
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Route Grouping
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Mount a sub-application at a path prefix
   */
  route(path: string, app: Gravito): this {
    // Mount the sub-application's router using the AOTRouter optimization
    this.router.mount(path, app.router)

    // Re-compile routes to update the static route map and optimizations
    this.compileRoutes()

    return this
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set custom error handler
   */
  onError(handler: ErrorHandler): this {
    this.errorHandler = handler
    return this
  }

  /**
   * Set custom 404 handler
   */
  notFound(handler: NotFoundHandler): this {
    this.notFoundHandler = handler
    return this
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Request Handling (Bun.serve integration)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Predictive Route Warming (JIT Optimization)
   *
   * Simulates requests to specified routes to trigger JIT compilation (FTL)
   * before real traffic arrives.
   *
   * @param paths List of paths to warm up (e.g. ['/api/users', '/health'])
   */
  async warmup(paths: string[]): Promise<void> {
    const dummyReqOpts = { headers: { 'User-Agent': 'Gravito-Warmup/1.0' } }

    for (const path of paths) {
      const req = new Request(`http://localhost${path}`, dummyReqOpts)
      await this.fetch(req)
    }
  }

  /**
   * Handle an incoming request
   */
  fetch = async (request: Request): Promise<Response> => {
    // Fast path: extract pathname without creating URL object
    const path = extractPath(request.url)
    const method = request.method.toLowerCase()

    // Try static route first (O(1) lookup, inlined for performance)
    const staticKey = `${method}:${path}`
    const staticRoute = this.staticRoutes.get(staticKey)

    if (staticRoute) {
      if (staticRoute.useMinimal) {
        // Ultra-fast path: no middleware, minimal context
        const ctx = new MinimalContext(request, {}, path, path) // Static routes: routePattern === path

        try {
          const result = staticRoute.handler(ctx)

          if (result instanceof Response) {
            return result
          }
          return await result
        } catch (error) {
          return this.handleErrorSync(error as Error, request, path)
        }
      }

      // Has middleware, or needs FastContext: use pooled context
      return await this.handleWithMiddleware(request, path, staticRoute)
    }

    // Dynamic route: use Radix Tree
    return await this.handleDynamicRoute(request, method, path)
  }

  /**
   * Handle routes with middleware (async path)
   */
  private async handleWithMiddleware(
    request: Request,
    path: string,
    route: RouteMetadata
  ): Promise<Response> {
    const ctx = this.contextPool.acquire()

    try {
      ctx.init(request, {}, path, path) // Static routes: routePattern === path

      if (route.compiled) {
        return await route.compiled(ctx)
      }

      // Fallback
      const middleware = this.collectMiddlewareForPath(path, route.middleware)
      if (middleware.length === 0) {
        return await route.handler(ctx)
      }

      return await this.executeMiddleware(ctx, middleware, route.handler)
    } catch (error) {
      return await this.handleError(error as Error, ctx)
    } finally {
      this.contextPool.release(ctx)
    }
  }

  /**
   * Handle dynamic routes (Radix Tree lookup)
   */
  private handleDynamicRoute(
    request: Request,
    method: string,
    path: string
  ): Response | Promise<Response> {
    const match = this.router.match(method.toUpperCase(), path)

    if (!match.handler) {
      return this.handleNotFoundSync(request, path)
    }

    const cacheKey = `${method}:${match.routePattern ?? path}`
    let entry = this.compiledDynamicRoutes.get(cacheKey)

    if (!entry || entry.version !== this.middlewareVersion) {
      const compiled = compileMiddlewareChain(match.middleware, match.handler)
      // Simple cache management: clear if too large
      if (this.compiledDynamicRoutes.size > 1000) {
        this.compiledDynamicRoutes.clear()
      }
      entry = { compiled, version: this.middlewareVersion }
      this.compiledDynamicRoutes.set(cacheKey, entry)
    }

    // Dynamic routes always use pooled context (need params)
    const ctx = this.contextPool.acquire()

    const execute = async (): Promise<Response> => {
      try {
        ctx.init(request, match.params, path, match.routePattern)
        return await entry?.compiled(ctx)
      } catch (error) {
        return await this.handleError(error as Error, ctx)
      } finally {
        this.contextPool.release(ctx)
      }
    }

    return execute()
  }

  /**
   * Sync error handler (for ultra-fast path)
   */
  private handleErrorSync(
    error: Error,
    request: Request,
    path: string
  ): Response | Promise<Response> {
    if (this.errorHandler) {
      const ctx = new MinimalContext(request, {}, path)
      const result = this.errorHandler(error, ctx)
      if (result instanceof Response) {
        return result
      }
      return result as Promise<Response>
    }

    console.error('Unhandled error:', error)
    return new Response(CACHED_RESPONSES.INTERNAL_ERROR, {
      status: 500,
      headers: HEADERS.JSON,
    })
  }

  /**
   * Sync 404 handler (for ultra-fast path)
   */
  private handleNotFoundSync(request: Request, path: string): Response | Promise<Response> {
    if (this.notFoundHandler) {
      const ctx = new MinimalContext(request, {}, path)
      const result = this.notFoundHandler(ctx)
      if (result instanceof Response) {
        return result
      }
      return result as Promise<Response>
    }

    return new Response(CACHED_RESPONSES.NOT_FOUND, {
      status: 404,
      headers: HEADERS.JSON,
    })
  }

  /**
   * Collect middleware for a specific path
   */
  private collectMiddlewareForPath(path: string, routeMiddleware: Middleware[]): Middleware[] {
    if (this.router.globalMiddleware.length === 0 && this.router.pathMiddleware.size === 0) {
      return routeMiddleware
    }

    return this.router.collectMiddlewarePublic(path, routeMiddleware)
  }

  /**
   * Compile routes for optimization
   */
  private compileRoutes(): void {
    this.staticRoutes = this.router.staticRoutes

    // Check if pure static app
    const hasGlobalMiddleware = this.router.globalMiddleware.length > 0
    const hasPathMiddleware = this.router.pathMiddleware.size > 0

    this.isPureStaticApp = !hasGlobalMiddleware && !hasPathMiddleware

    // Pre-mark routes
    for (const [key, route] of this.staticRoutes) {
      // Skip if already compiled for this version
      if (route.compiledVersion === this.middlewareVersion) {
        continue
      }

      const analysis = analyzeHandler(route.handler)
      const optimalType = getOptimalContextType(analysis)

      route.useMinimal =
        this.isPureStaticApp && route.middleware.length === 0 && optimalType === 'minimal'

      // Precompile middleware chain
      if (!route.useMinimal) {
        const allMiddleware = this.collectMiddlewareForPath(key.split(':')[1]!, route.middleware)
        route.compiled = compileMiddlewareChain(allMiddleware, route.handler)
      }

      route.compiledVersion = this.middlewareVersion
    }
  }

  /**
   * Add a route to the router
   */
  private addRoute(method: HttpMethod, path: string, handlers: Handler[]): this {
    if (handlers.length === 0) {
      throw new Error(`No handler provided for ${method.toUpperCase()} ${path}`)
    }

    const handler = handlers[handlers.length - 1]!
    const middleware = handlers.slice(0, -1) as unknown as Middleware[]

    this.router.add(method, path, handler, middleware)

    // Re-compile routes when new ones are added
    this.compileRoutes()

    return this
  }

  /**
   * Execute middleware chain followed by handler
   */
  private async executeMiddleware(
    ctx: FastContext,
    middleware: Middleware[],
    handler: Handler
  ): Promise<Response> {
    let index = 0

    const next = async (): Promise<Response | undefined> => {
      if (index < middleware.length) {
        const mw = middleware[index++]!
        return await mw(ctx, next)
      }
      return undefined
    }

    const result = await next()
    if (result instanceof Response) {
      return result
    }

    return await handler(ctx)
  }

  /**
   * Handle errors (Async version for dynamic/middleware paths)
   */
  private async handleError(error: Error, ctx: FastContext): Promise<Response> {
    if (this.errorHandler) {
      return await this.errorHandler(error, ctx)
    }

    console.error('Unhandled error:', error)
    return ctx.json(
      {
        error: 'Internal Server Error',
        message: error.message,
      },
      500
    )
  }
}
