/**
 * @fileoverview Hono Adapter Implementation
 *
 * This adapter wraps Hono to implement the Gravito HttpAdapter interface.
 * It serves as the default adapter and reference implementation for others.
 *
 * @module @gravito/core/adapters/hono
 * @since 2.0.0
 */

import type { Context, Handler, Hono, MiddlewareHandler, Next } from 'hono'
import type {
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNext,
  GravitoNotFoundHandler,
  GravitoRequest,
  GravitoVariables,
  HttpMethod,
  StatusCode,
} from '../http/types'
import type { AdapterConfig, HttpAdapter, RouteDefinition } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Hono Request Wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps Hono's request object to implement GravitoRequest
 */
class HonoRequestWrapper implements GravitoRequest {
  constructor(private honoCtx: Context) {}

  get url(): string {
    return this.honoCtx.req.url
  }

  get method(): string {
    return this.honoCtx.req.method
  }

  get path(): string {
    return this.honoCtx.req.path
  }

  param(name: string): string | undefined {
    return this.honoCtx.req.param(name)
  }

  params(): Record<string, string> {
    return this.honoCtx.req.param() as Record<string, string>
  }

  query(name: string): string | undefined {
    return this.honoCtx.req.query(name)
  }

  queries(): Record<string, string | string[]> {
    return this.honoCtx.req.queries() as Record<string, string | string[]>
  }

  header(name: string): string | undefined
  header(): Record<string, string>
  header(name?: string): string | undefined | Record<string, string> {
    if (name) {
      return this.honoCtx.req.header(name)
    }
    return this.honoCtx.req.header()
  }

  async json<T = unknown>(): Promise<T> {
    return this.honoCtx.req.json<T>()
  }

  async text(): Promise<string> {
    return this.honoCtx.req.text()
  }

  async formData(): Promise<FormData> {
    return this.honoCtx.req.formData()
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.honoCtx.req.arrayBuffer()
  }

  get raw(): Request {
    return this.honoCtx.req.raw
  }

  valid<T = unknown>(target: string): T {
    // Use 'any' to bypass Hono's strict valid() typing
    // The actual validation is handled by the validator middleware
    return (this.honoCtx.req as unknown as { valid(t: string): T }).valid(target)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hono Context Wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps Hono's context to implement GravitoContext
 */
class HonoContextWrapper<V extends GravitoVariables = GravitoVariables>
  implements GravitoContext<V>
{
  private _req: HonoRequestWrapper
  private _statusCode: StatusCode = 200

  constructor(private honoCtx: Context) {
    this._req = new HonoRequestWrapper(honoCtx)
  }

  get req(): GravitoRequest {
    return this._req
  }

  json<T>(data: T, status?: number): Response {
    if (status !== undefined) {
      return this.honoCtx.json(data as object, status as 200)
    }
    return this.honoCtx.json(data as object)
  }

  text(text: string, status?: number): Response {
    if (status !== undefined) {
      return this.honoCtx.text(text, status as 200)
    }
    return this.honoCtx.text(text)
  }

  html(html: string, status?: number): Response {
    if (status !== undefined) {
      return this.honoCtx.html(html, status as 200)
    }
    return this.honoCtx.html(html)
  }

  redirect(url: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
    return this.honoCtx.redirect(url, status)
  }

  body(data: BodyInit | null, status?: number): Response {
    if (data === null) {
      return this.honoCtx.body(null, status as 200)
    }
    // For non-null body, create Response directly
    return new Response(data, {
      status: status ?? 200,
      headers: new Headers(),
    })
  }

  stream(stream: ReadableStream, status?: number): Response {
    return new Response(stream, {
      status: status ?? 200,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    })
  }

  // Implement header as separate methods internally
  header(name: string): string | undefined
  header(name: string, value: string, options?: { append?: boolean }): void
  header(
    name: string,
    value?: string,
    options?: { append?: boolean }
  ): string | undefined | undefined {
    if (value !== undefined) {
      if (options?.append) {
        // console.log('[HonoAdapter] Appending header:', name, value)
        this.honoCtx.header(name, value, { append: true })
      } else {
        // console.log('[HonoAdapter] Setting header:', name, value)
        this.honoCtx.header(name, value)
      }
      return undefined // Return undefined for setter to match type
    }
    return this.honoCtx.req.header(name)
  }

  status(code: StatusCode): void {
    this._statusCode = code
    this.honoCtx.status(code as 200)
  }

  get<K extends keyof V>(key: K): V[K] {
    return this.honoCtx.get(key as string) as V[K]
  }

  set<K extends keyof V>(key: K, value: V[K]): void {
    this.honoCtx.set(key as string, value)
  }

  get executionCtx(): ExecutionContext | undefined {
    return this.honoCtx.executionCtx
  }

  get env(): Record<string, unknown> | undefined {
    return this.honoCtx.env as Record<string, unknown> | undefined
  }

  get native(): Context {
    return this.honoCtx
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler Conversion Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a GravitoHandler to a Hono Handler
 */
function toHonoHandler<V extends GravitoVariables>(handler: GravitoHandler<V>): Handler {
  return async (c: Context): Promise<Response> => {
    const ctx = new HonoContextWrapper<V>(c) as GravitoContext<V>
    return handler(ctx)
  }
}

/**
 * Convert a GravitoMiddleware to a Hono MiddlewareHandler
 */
function toHonoMiddleware<V extends GravitoVariables>(
  middleware: GravitoMiddleware<V>
): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<Response | undefined> => {
    // console.log('[HonoAdapter] Wrapping context')
    const ctx = new HonoContextWrapper<V>(c) as GravitoContext<V>
    const gravitoNext: GravitoNext = async () => {
      await next()
    }
    return middleware(ctx, gravitoNext) as any
  }
}

/**
 * Convert a GravitoErrorHandler to Hono's error handler signature
 */
function toHonoErrorHandler<V extends GravitoVariables>(
  handler: GravitoErrorHandler<V>
): (err: Error, c: Context) => Response | Promise<Response> {
  return async (err: Error, c: Context): Promise<Response> => {
    const ctx = new HonoContextWrapper<V>(c) as GravitoContext<V>
    return handler(err, ctx)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hono Adapter Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default HTTP adapter using Hono as the underlying engine.
 *
 * This adapter wraps Hono to provide a consistent interface that can be
 * swapped out for other implementations (custom Bun, etc.) without changing
 * application code.
 *
 * @example
 * ```typescript
 * import { HonoAdapter } from '@gravito/core/adapters'
 *
 * const adapter = new HonoAdapter()
 *
 * // Register routes
 * adapter.route('get', '/hello', async (ctx) => {
 *   return ctx.json({ message: 'Hello, World!' })
 * })
 *
 * // Serve with Bun
 * Bun.serve({
 *   port: 3000,
 *   fetch: adapter.fetch
 * })
 * ```
 */
export class HonoAdapter<V extends GravitoVariables = GravitoVariables> implements HttpAdapter<V> {
  readonly name = 'hono'
  readonly version = '1.0.0'

  private app: Hono

  constructor(
    private config: AdapterConfig = {},
    honoInstance?: unknown
  ) {
    // Allow injecting an existing Hono instance for backwards compatibility
    if (honoInstance) {
      // Cast to Hono - the caller is responsible for providing a valid instance
      this.app = honoInstance as Hono
    } else {
      // Lazy import to avoid circular dependency issues
      // In practice, PlanetCore will provide the Hono instance
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Hono: HonoClass } = require('hono')
      this.app = new HonoClass()
    }
  }

  /**
   * Get the underlying Hono app instance
   */
  get native(): Hono {
    return this.app
  }

  /**
   * Set the underlying Hono app instance
   * Used by PlanetCore during initialization
   */
  setNative(app: Hono): void {
    this.app = app
  }

  route(
    method: HttpMethod,
    path: string,
    ...handlers: (GravitoHandler<V> | GravitoMiddleware<V>)[]
  ): void {
    const fullPath = (this.config.basePath || '') + path
    // We treat all handlers as potential middleware (accepting next)
    const honoHandlers = handlers.map((h) => toHonoMiddleware<V>(h as GravitoMiddleware<V>))

    // Use bracket notation to dynamically call the method
    const methodFn = (this.app as unknown as Record<string, (...args: unknown[]) => unknown>)[
      method
    ]
    if (typeof methodFn !== 'function') {
      throw new Error(`Unsupported HTTP method: ${method}`)
    }

    methodFn.call(this.app, fullPath, ...honoHandlers)
  }

  routes(routes: RouteDefinition[]): void {
    for (const routeDef of routes) {
      // Convert middleware and handlers to GravitoHandler<V>
      const middlewareHandlers = (routeDef.middleware || []).map(
        (m) => m as unknown as GravitoHandler<V>
      )
      const allHandlers = [
        ...middlewareHandlers,
        ...(routeDef.handlers as unknown as GravitoHandler<V>[]),
      ]
      this.route(routeDef.method, routeDef.path, ...allHandlers)
    }
  }

  use(path: string, ...middleware: GravitoMiddleware<V>[]): void {
    const fullPath = (this.config.basePath || '') + path
    const honoMiddleware = middleware.map((m) => toHonoMiddleware<V>(m))

    for (const m of honoMiddleware) {
      this.app.use(fullPath, m)
    }
  }

  useGlobal(...middleware: GravitoMiddleware<V>[]): void {
    this.use('*', ...middleware)
  }

  mount(path: string, subAdapter: HttpAdapter<V>): void {
    if (subAdapter.name === 'hono') {
      // Optimized path for Hono sub-adapters
      this.app.route(path, subAdapter.native as Hono)
    } else {
      // Generic fallback: relay all requests to sub-adapter
      this.use(`${path}/*`, async (ctx) => {
        const response = await subAdapter.fetch(ctx.req.raw)
        return response
      })
    }
  }

  onError(handler: GravitoErrorHandler<V>): void {
    this.app.onError(toHonoErrorHandler<V>(handler))
  }

  onNotFound(handler: GravitoNotFoundHandler<V>): void {
    this.app.notFound(async (c: Context) => {
      const ctx = new HonoContextWrapper<V>(c) as GravitoContext<V>
      return handler(ctx)
    })
  }

  fetch = (request: Request, server?: unknown): Response | Promise<Response> => {
    return this.app.fetch(request, server)
  }

  createContext(_request: Request): GravitoContext<V> {
    // Create a minimal context for testing
    // In practice, this is called through the Hono routing pipeline
    throw new Error(
      'HonoAdapter.createContext() should not be called directly. ' +
        'Use the router pipeline instead.'
    )
  }

  async init(): Promise<void> {
    // No-op for Hono
  }

  async shutdown(): Promise<void> {
    // No-op for Hono
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new HonoAdapter instance
 */
export function createHonoAdapter<V extends GravitoVariables = GravitoVariables>(
  config?: AdapterConfig
): HonoAdapter<V> {
  return new HonoAdapter<V>(config)
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Exports
// ─────────────────────────────────────────────────────────────────────────────

export { HonoContextWrapper, HonoRequestWrapper, toHonoHandler, toHonoMiddleware }
