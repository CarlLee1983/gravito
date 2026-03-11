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
  Handler,
  Middleware,
  NotFoundHandler,
  RouteMetadata,
} from './types'

// Bun runtime optimization: cache frequently used functions
let bunPeek: ((promise: any) => any) | null = null
let bunFile: ((path: string) => any) | null = null

try {
  const bunModule = require('bun') as any
  bunPeek = bunModule.peek
  bunFile = bunModule.file
} catch {
  // Fallback for Node.js environments
  bunPeek = (promise: any) => promise
  bunFile = (path: string) => path // Just return the path as-is
}

/**
 * Precompile middleware chain into a single function
 */
function compileMiddlewareChain(middleware: Middleware[], handler: Handler): CompiledHandler {
  // Fast path: no middleware
  if (middleware.length === 0) {
    return handler as CompiledHandler
  }

  // Single middleware optimization - avoid wrapping overhead
  if (middleware.length === 1) {
    const mw = middleware[0]!
    return async (ctx) => {
      let nextCalled = false
      const result = mw(ctx, async () => {
        nextCalled = true
        return undefined
      })

      // Optimization: Only use peek/await if result is truly a Promise
      let finalResult: any
      if (result instanceof Promise) {
        const peeked = bunPeek(result)
        finalResult = peeked === result ? await result : peeked
      } else {
        finalResult = result
      }

      if (finalResult instanceof Response) {
        return finalResult
      }

      if (nextCalled) {
        const hResult = handler(ctx)
        if (hResult instanceof Promise) {
          const p = bunPeek(hResult)
          return p === hResult ? await hResult : p
        }
        return hResult
      }
      return ctx.json({ error: 'Middleware did not call next or return response' }, 500)
    }
  }

  // Multiple middleware: compile right-to-left into a chain
  let compiled: CompiledHandler = handler as CompiledHandler

  for (let i = middleware.length - 1; i >= 0; i--) {
    const mw = middleware[i]!
    const nextHandler = compiled
    compiled = async (ctx) => {
      let nextCalled = false
      const result = mw(ctx, async () => {
        nextCalled = true
        return undefined
      })

      // Optimization: Only use peek/await if result is truly a Promise
      let finalResult: any
      if (result instanceof Promise) {
        const peeked = bunPeek(result)
        finalResult = peeked === result ? await result : peeked
      } else {
        finalResult = result
      }

      if (finalResult instanceof Response) {
        return finalResult
      }

      if (nextCalled) {
        const nextResult = nextHandler(ctx)
        if (nextResult instanceof Promise) {
          const p = bunPeek(nextResult)
          return p === nextResult ? await nextResult : p
        }
        return nextResult
      }

      return ctx.json({ error: 'Middleware did not call next or return response' }, 500)
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
   * Generate Native Bun.serve Configuration
   *
   * Offloads static routes to Bun's SIMD-accelerated native router.
   * Supports pre-compiled middleware chains for zero runtime lookup.
   */
  serveConfig(baseConfig: Record<string, unknown> = {}): Record<string, unknown> {
    // 1. Extract and pre-compile routes for Bun's native router
    const nativeRoutes = this.router.getNativeRoutes((handler, middleware, path) => {
      // Pre-compile the middleware chain for this specific static route
      const compiled = compileMiddlewareChain(middleware, handler)

      // Create a native request handler that uses our pooling
      return async (req: Request) => {
        const ctx = this.contextPool.acquire()
        ctx.init(req, {}, path, path)

        try {
          const result = compiled(ctx)

          // Pro-level optimization: skip await if synchronous
          let response: Response
          if (result instanceof Promise) {
            const peeked = bunPeek(result)
            response = peeked === result ? await result : peeked
          } else {
            response = result
          }

          // Cleanup and release
          const cleanup = ctx.requestScope().cleanup()
          if (cleanup instanceof Promise) {
            await cleanup
          }
          this.contextPool.release(ctx)
          return response
        } catch (error) {
          // Cleanup even on error
          const cleanup = ctx.requestScope().cleanup()
          if (cleanup instanceof Promise) {
            await cleanup
          }
          this.contextPool.release(ctx)
          return this.handleErrorSync(error as Error, req, path)
        }
      }
    })

    return {
      ...baseConfig,
      routes: nativeRoutes,
      fetch: this.fetch, // Fallback for dynamic routes
      // Optimize TLS if provided in baseConfig
      tls: baseConfig.tls ? this.optimizeTLS(baseConfig.tls) : undefined,
      error: (error: Error) => {
        console.error('Native route error:', error)
        return new Response(CACHED_RESPONSES.INTERNAL_ERROR, {
          status: 500,
          headers: HEADERS.JSON,
        })
      },
    }
  }

  /**
   * Optimize TLS Configuration for Bun 1.39+
   */
  private optimizeTLS(tls: any): any {
    const isProd = process.env.NODE_ENV === 'production'

    const optimizeEntry = (entry: any) => {
      const optimized = { ...entry }
      if (typeof optimized.key === 'string' && !optimized.key.startsWith('-----BEGIN')) {
        optimized.key = bunFile(optimized.key)
      }
      if (typeof optimized.cert === 'string' && !optimized.cert.startsWith('-----BEGIN')) {
        optimized.cert = bunFile(optimized.cert)
      }
      if (isProd && optimized.lowMemoryMode === undefined) {
        optimized.lowMemoryMode = true
      }
      return optimized
    }

    return Array.isArray(tls) ? tls.map(optimizeEntry) : optimizeEntry(tls)
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
      const ctx = this.contextPool.acquire()
      ctx.init(request, {}, path, path)

      try {
        const compiled =
          staticRoute.compiled ||
          compileMiddlewareChain(staticRoute.middleware, staticRoute.handler)
        const result = compiled(ctx)

        let response: Response
        if (result instanceof Promise) {
          const peeked = bunPeek(result)
          response = peeked === result ? await result : peeked
        } else {
          response = result
        }

        const cleanup = ctx.requestScope().cleanup()
        if (cleanup instanceof Promise) {
          await cleanup
        }
        this.contextPool.release(ctx)
        return response
      } catch (error) {
        const cleanup = ctx.requestScope().cleanup()
        if (cleanup instanceof Promise) {
          await cleanup
        }
        this.contextPool.release(ctx)
        return this.handleErrorSync(error as Error, request, path)
      }
    }

    // Dynamic route: use Radix Tree
    return await this.handleDynamicRoute(request, method, path)
  }

  /**
   * Handle dynamic routes with Radix Tree
   */
  private async handleDynamicRoute(
    request: Request,
    method: string,
    path: string
  ): Promise<Response> {
    const match = this.router.match(method, path)

    if (match.handler) {
      const ctx = this.contextPool.acquire()
      ctx.init(request, match.params, path, match.routePattern)

      try {
        // Use cached compilation if available
        const routeKey = `${method}:${match.routePattern}`
        let compiledObj = this.compiledDynamicRoutes.get(routeKey)

        if (!compiledObj || compiledObj.version !== this.router.version) {
          const compiled = compileMiddlewareChain(match.middleware, match.handler)
          compiledObj = { compiled, version: this.router.version }
          this.compiledDynamicRoutes.set(routeKey, compiledObj)
        }

        const result = compiledObj.compiled(ctx)

        let response: Response
        if (result instanceof Promise) {
          const peeked = bunPeek(result)
          response = peeked === result ? await result : peeked
        } else {
          response = result
        }

        const cleanup = ctx.requestScope().cleanup()
        if (cleanup instanceof Promise) {
          await cleanup
        }
        this.contextPool.release(ctx)
        return response
      } catch (error) {
        const cleanup = ctx.requestScope().cleanup()
        if (cleanup instanceof Promise) {
          await cleanup
        }
        this.contextPool.release(ctx)
        return this.handleErrorSync(error as Error, request, path)
      }
    }

    // 404
    return this.handleNotFoundSync(request, path)
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
      if (route.compiledVersion === this.router.version) {
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

      route.compiledVersion = this.router.version
    }
  }

  /**
   * Add a route to the router
   */
  private addRoute(method: string, path: string, handlers: Handler[]): this {
    if (handlers.length === 0) {
      throw new Error(`No handler provided for ${method.toUpperCase()} ${path}`)
    }

    const handler = handlers[handlers.length - 1]!
    const middleware = handlers.slice(0, -1) as unknown as Middleware[]

    this.router.add(method as HttpMethod, path, handler, middleware)

    // Re-compile routes when new ones are added
    this.compileRoutes()

    return this
  }
}
