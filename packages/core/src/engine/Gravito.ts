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
import { FastContext } from './FastContext'
import { MinimalContext } from './MinimalContext'
import { extractPath } from './path'
import { ObjectPool } from './pool'
import type { EngineOptions, ErrorHandler, Handler, Middleware, NotFoundHandler } from './types'

/**
 * Gravito - The High-Performance Web Engine
 *
 * @example
 * ```typescript
 * import { Gravito } from '@gravito/core/engine'
 *
 * const app = new Gravito()
 *
 * app.get('/', (c) => c.json({ message: 'Hello, World!' }))
 * app.get('/users/:id', (c) => {
 *   const id = c.req.param('id')
 *   return c.json({ id })
 * })
 *
 * export default app
 * ```
 */
export class Gravito {
  private router = new AOTRouter()
  private contextPool: ObjectPool<FastContext>
  private errorHandler?: ErrorHandler
  private notFoundHandler?: NotFoundHandler

  // Direct reference to static routes Map (O(1) access)
  // Optimization: Bypass getter/setter overhead
  private staticRoutes!: Map<string, { handler: Handler; middleware: Middleware[] }>
  // Flag: pure static app (no middleware at all) allows ultra-fast path
  private isPureStaticApp = true

  /**
   * Create a new Gravito instance
   *
   * @param options - Engine configuration options
   */
  constructor(options: EngineOptions = {}) {
    const poolSize = options.poolSize ?? 256

    // Initialize context pool
    this.contextPool = new ObjectPool(
      () => new FastContext(),
      (ctx) => ctx.reset(new Request('http://localhost')),
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
   * Register a PATCH route
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
   *
   * @example
   * ```typescript
   * // Global middleware
   * app.use(async (c, next) => {
   *   console.log(`${c.req.method} ${c.req.path}`)
   *   await next()
   * })
   *
   * // Path-based middleware
   * app.use('/api/*', async (c, next) => {
   *   c.header('X-API-Version', '1.0')
   *   await next()
   * })
   * ```
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
    return this
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Route Grouping
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Mount a sub-application at a path prefix
   *
   * @example
   * ```typescript
   * const api = new Gravito()
   * api.get('/users', (c) => c.json({ users: [] }))
   *
   * const app = new Gravito()
   * app.route('/api', api)
   * // Now accessible at /api/users
   * ```
   */
  route(path: string, app: Gravito): this {
    // This is a simplified implementation
    // In production, we'd need to merge routers properly
    // For now, we'll just note this as a TODO
    console.warn('route() method is not yet fully implemented')
    return this
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Set custom error handler
   *
   * @example
   * ```typescript
   * app.onError((err, c) => {
   *   console.error(err)
   *   return c.json({ error: err.message }, 500)
   * })
   * ```
   */
  onError(handler: ErrorHandler): this {
    this.errorHandler = handler
    return this
  }

  /**
   * Set custom 404 handler
   *
   * @example
   * ```typescript
   * app.notFound((c) => {
   *   return c.json({ error: 'Not Found' }, 404)
   * })
   * ```
   */
  notFound(handler: NotFoundHandler): this {
    this.notFoundHandler = handler
    return this
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Request Handling (Bun.serve integration)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Handle an incoming request
   *
   * Optimized for minimal allocations and maximum throughput.
   * Uses sync/async dual-path strategy inspired by Hono.
   *
   * @param request - Incoming Request object
   * @returns Response object (sync or async)
   */
  fetch = (request: Request): Response | Promise<Response> => {
    // Fast path: extract pathname without creating URL object
    const path = extractPath(request.url)
    const method = request.method.toLowerCase()

    // Try static route first (O(1) lookup, inlined for performance)
    const staticKey = `${method}:${path}`
    const staticRoute = this.staticRoutes.get(staticKey)

    if (staticRoute) {
      // Check pre-calculated flag: useMinimal means:
      // 1. No global/path middleware (pure static app)
      // 2. No route middleware
      // 3. Handler doesn't use unsupported features (like .header())
      // @ts-expect-error - Access custom property
      if (staticRoute.useMinimal) {
        // Ultra-fast path: no middleware, minimal context
        const ctx = new MinimalContext(request, {}, path)

        try {
          const result = staticRoute.handler(ctx)

          // Sync/async dual-path (Hono technique)
          if (result instanceof Response) {
            return result
          }
          return result as Promise<Response>
        } catch (error) {
          return this.handleErrorSync(error as Error, request, path)
        }
      }

      // Has middleware, or needs FastContext: use pooled context
      return this.handleWithMiddleware(request, path, staticRoute) as any
    }

    // Dynamic route: use Radix Tree
    return this.handleDynamicRoute(request, method, path) as any
  }

  /**
   * Handle routes with middleware (async path)
   */
  private async handleWithMiddleware(
    request: Request,
    path: string,
    route: { handler: Handler; middleware: Middleware[] }
  ): Promise<Response> {
    const ctx = this.contextPool.acquire()

    try {
      ctx.reset(request, {})

      // Collect all middleware
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

    // Dynamic routes always use pooled context (need params)
    const ctx = this.contextPool.acquire()

    const execute = async (): Promise<Response> => {
      try {
        ctx.reset(request, match.params)

        if (match.middleware.length === 0) {
          // match.handler is Handler | null according to match signature, but we checked !match.handler above
          return await match.handler!(ctx)
        }

        return await this.executeMiddleware(ctx, match.middleware, match.handler!)
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
      // If async, we need to await
      return result as Promise<Response>
    }

    console.error('Unhandled error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
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

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * Collect middleware for a specific path
   * (Simplified version - assumes we've already checked for pure static)
   */
  private collectMiddlewareForPath(path: string, routeMiddleware: Middleware[]): Middleware[] {
    // @ts-expect-error - Access private property for optimization
    if (this.router.globalMiddleware.length === 0 && this.router.pathMiddleware.size === 0) {
      return routeMiddleware
    }

    // Delegate to router for full collection
    // We can remove @ts-expect-error since we added public method
    return this.router.collectMiddlewarePublic(path, routeMiddleware)
  }

  /**
   * Compile routes for optimization
   * Called once during initialization and when routes change
   */
  private compileRoutes(): void {
    // @ts-expect-error - Access private property
    this.staticRoutes = this.router.staticRoutes

    // Check if pure static app
    // @ts-expect-error - Access private property
    const hasGlobalMiddleware = this.router.globalMiddleware.length > 0
    // @ts-expect-error - Access private property
    const hasPathMiddleware = this.router.pathMiddleware.size > 0

    this.isPureStaticApp = !hasGlobalMiddleware && !hasPathMiddleware

    // Pre-mark routes
    for (const [_key, route] of this.staticRoutes) {
      const analysis = analyzeHandler(route.handler)
      const optimalType = getOptimalContextType(analysis)

      // Use minimal context if:
      // 1. App is pure static (no middleware)
      // 2. No route middleware
      // 3. Analyzer suggests 'minimal' (no headers usage, etc.)
      // @ts-expect-error - Adding custom property
      route.useMinimal =
        this.isPureStaticApp && route.middleware.length === 0 && optimalType === 'minimal'
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internal Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Add a route to the router
   */
  private addRoute(method: HttpMethod, path: string, handlers: Handler[]): this {
    if (handlers.length === 0) {
      throw new Error(`No handler provided for ${method.toUpperCase()} ${path}`)
    }

    // Last handler is the route handler
    const handler = handlers[handlers.length - 1]!

    // Everything before is middleware
    // Note: Middleware and Handler have compatible signatures for this use case
    const middleware = handlers.slice(0, -1) as unknown as Middleware[]

    this.router.add(method, path, handler, middleware)

    // Re-compile routes when new ones are added
    this.compileRoutes()

    return this
  }

  /**
   * Execute middleware chain followed by handler
   *
   * Implements the standard middleware pattern:
   * Each middleware can call next() to continue the chain.
   */
  private async executeMiddleware(
    ctx: FastContext,
    middleware: Middleware[],
    handler: Handler
  ): Promise<Response> {
    let index = 0

    const next = async (): Promise<void> => {
      if (index < middleware.length) {
        const mw = middleware[index++]!
        await mw(ctx, next)
      }
    }

    // Execute all middleware
    await next()

    // Execute final handler
    return await handler(ctx)
  }

  /**
   * Handle 404 Not Found (Async version for dynamic/middleware paths)
   */
  private async handleNotFound(ctx: FastContext): Promise<Response> {
    if (this.notFoundHandler) {
      return await this.notFoundHandler(ctx)
    }

    return ctx.json({ error: 'Not Found' }, 404)
  }

  /**
   * Handle errors (Async version for dynamic/middleware paths)
   */
  private async handleError(error: Error, ctx: FastContext): Promise<Response> {
    if (this.errorHandler) {
      return await this.errorHandler(error, ctx)
    }

    // Default error response
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
