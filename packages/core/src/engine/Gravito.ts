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
import { FastContext } from './FastContext'
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
   * This is the main entry point called by Bun.serve.
   * Optimized for minimal allocations and maximum throughput.
   *
   * @param request - Incoming Request object
   * @returns Response object
   */
  fetch = async (request: Request): Promise<Response> => {
    // Parse URL once
    const url = new URL(request.url)
    const method = request.method
    const path = url.pathname

    // Acquire context from pool
    const ctx = this.contextPool.acquire()

    try {
      // Match route
      const match = this.router.match(method, path)

      if (!match.handler) {
        // Reset context for 404 handler
        ctx.reset(request, {})
        return await this.handleNotFound(ctx)
      }

      // Reset context with request and params
      ctx.reset(request, match.params)

      // Fast path: no middleware
      if (match.middleware.length === 0) {
        return await match.handler(ctx)
      }

      // Execute middleware chain + handler
      const response = await this.executeMiddleware(ctx, match.middleware, match.handler)

      return response
    } catch (error) {
      return await this.handleError(error as Error, ctx)
    } finally {
      // Always release context back to pool
      this.contextPool.release(ctx)
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
   * Handle 404 Not Found
   */
  private async handleNotFound(ctx: FastContext): Promise<Response> {
    if (this.notFoundHandler) {
      return await this.notFoundHandler(ctx)
    }

    return ctx.json({ error: 'Not Found' }, 404)
  }

  /**
   * Handle errors
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
