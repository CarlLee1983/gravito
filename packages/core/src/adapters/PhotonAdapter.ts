/**
 * @fileoverview Photon Adapter Implementation
 *
 * This adapter wraps Photon to implement the Gravito HttpAdapter interface.
 * It serves as the default adapter and reference implementation for others.
 *
 * @module @gravito/core/adapters/photon
 * @since 2.0.0
 */

import type { Context, Handler, MiddlewareHandler, Next, Photon } from '@gravito/photon'
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
// Photon Request Wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps Photon's request object to implement GravitoRequest
 */
class PhotonRequestWrapper implements GravitoRequest {
  constructor(private photonCtx: Context) {}

  get url(): string {
    return this.photonCtx.req.url
  }

  get method(): string {
    return this.photonCtx.req.method
  }

  get path(): string {
    return this.photonCtx.req.path
  }

  param(name: string): string | undefined {
    return this.photonCtx.req.param(name)
  }

  params(): Record<string, string> {
    return this.photonCtx.req.param() as Record<string, string>
  }

  query(name: string): string | undefined {
    return this.photonCtx.req.query(name)
  }

  queries(): Record<string, string | string[]> {
    return this.photonCtx.req.queries() as Record<string, string | string[]>
  }

  header(name: string): string | undefined
  header(): Record<string, string>
  header(name?: string): string | undefined | Record<string, string> {
    if (name) {
      return this.photonCtx.req.header(name)
    }
    return this.photonCtx.req.header()
  }

  async json<T = unknown>(): Promise<T> {
    return this.photonCtx.req.json<T>()
  }

  async text(): Promise<string> {
    return this.photonCtx.req.text()
  }

  async formData(): Promise<FormData> {
    return this.photonCtx.req.formData()
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.photonCtx.req.arrayBuffer()
  }

  async parseBody<T = unknown>(): Promise<T> {
    return this.photonCtx.req.parseBody() as Promise<T>
  }

  get raw(): Request {
    return this.photonCtx.req.raw
  }

  valid<T = unknown>(target: string): T {
    // Use 'any' to bypass Photon's strict valid() typing
    // The actual validation is handled by the validator middleware
    return (this.photonCtx.req as unknown as { valid(t: string): T }).valid(target)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Photon Context Wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps Photon's context to implement GravitoContext
 */
class PhotonContextWrapper<V extends GravitoVariables = GravitoVariables>
  implements GravitoContext<V>
{
  private _req: PhotonRequestWrapper

  constructor(private photonCtx: Context) {
    this._req = new PhotonRequestWrapper(photonCtx)
  }

  /**
   * Create a proxied instance to enable object destructuring of context variables
   * This allows: async list({ userService }: Context)
   */
  static create<V extends GravitoVariables = GravitoVariables>(
    photonCtx: Context
  ): GravitoContext<V> {
    const instance = new PhotonContextWrapper<V>(photonCtx)
    return new Proxy(instance, {
      get(target, prop, receiver) {
        // 1. If property exists on the instance (method, property), return it
        if (prop in target) {
          const value = Reflect.get(target, prop, receiver)
          if (typeof value === 'function') {
            return value.bind(target) // Ensure 'this' points to instance
          }
          return value
        }

        // 2. If not, try to fetch from Photon context variables
        if (typeof prop === 'string') {
          return target.get(prop as any)
        }

        return undefined
      },
    }) as any
  }

  get req(): GravitoRequest {
    return this._req
  }

  json<T>(data: T, status?: number): Response {
    if (status !== undefined) {
      return this.photonCtx.json(data as object, status as 200)
    }
    return this.photonCtx.json(data as object)
  }

  text(text: string, status?: number): Response {
    if (status !== undefined) {
      return this.photonCtx.text(text, status as 200)
    }
    return this.photonCtx.text(text)
  }

  html(html: string, status?: number): Response {
    if (status !== undefined) {
      return this.photonCtx.html(html, status as 200)
    }
    return this.photonCtx.html(html)
  }

  redirect(url: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
    return this.photonCtx.redirect(url, status)
  }

  body(data: BodyInit | null, status?: number): Response {
    if (data === null) {
      return this.photonCtx.body(null, status as 200)
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

  notFound(message?: string): Response {
    return this.photonCtx.text(message ?? 'Not Found', 404)
  }

  forbidden(message?: string): Response {
    return this.photonCtx.text(message ?? 'Forbidden', 403)
  }

  unauthorized(message?: string): Response {
    return this.photonCtx.text(message ?? 'Unauthorized', 401)
  }

  badRequest(message?: string): Response {
    return this.photonCtx.text(message ?? 'Bad Request', 400)
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
        // console.log('[PhotonAdapter] Appending header:', name, value)
        this.photonCtx.header(name, value, { append: true })
      } else {
        // console.log('[PhotonAdapter] Setting header:', name, value)
        this.photonCtx.header(name, value)
      }
      return undefined // Return undefined for setter to match type
    }
    return this.photonCtx.req.header(name)
  }

  status(code: StatusCode): void {
    this.photonCtx.status(code as 200)
  }

  get<K extends keyof V>(key: K): V[K] {
    return this.photonCtx.get(key as string) as V[K]
  }

  set<K extends keyof V>(key: K, value: V[K]): void {
    this.photonCtx.set(key as string, value)
  }

  get executionCtx(): ExecutionContext | undefined {
    return this.photonCtx.executionCtx
  }

  get env(): Record<string, unknown> | undefined {
    return this.photonCtx.env as Record<string, unknown> | undefined
  }

  get native(): Context {
    return this.photonCtx
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler Conversion Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a GravitoHandler to a Photon Handler
 */
function toPhotonHandler<V extends GravitoVariables>(handler: GravitoHandler<V>): Handler {
  return async (c: Context): Promise<Response> => {
    const ctx = PhotonContextWrapper.create<V>(c)
    return handler(ctx)
  }
}

/**
 * Convert a GravitoMiddleware to a Photon MiddlewareHandler
 */
function toPhotonMiddleware<V extends GravitoVariables>(
  middleware: GravitoMiddleware<V>
): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<Response | undefined> => {
    // console.log('[PhotonAdapter] Wrapping context')
    const ctx = PhotonContextWrapper.create<V>(c)
    const gravitoNext: GravitoNext = async () => {
      await next()
    }
    return middleware(ctx, gravitoNext) as any
  }
}

/**
 * Convert a GravitoErrorHandler to Photon's error handler signature
 */
function toPhotonErrorHandler<V extends GravitoVariables>(
  handler: GravitoErrorHandler<V>
): (err: Error, c: Context) => Response | Promise<Response> {
  return async (err: Error, c: Context): Promise<Response> => {
    const ctx = PhotonContextWrapper.create<V>(c)
    return handler(err, ctx)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Photon Adapter Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default HTTP adapter using the optimized Gravito Core Engine.
 *
 * This adapter provides a consistent interface that can be
 * swapped out for other implementations without changing application code.
 *
 * @example
 * ```typescript
 * import { GravitoAdapter } from '@gravito/core'
 *
 * const adapter = new GravitoAdapter()
 *
 * // Register routes
 * adapter.route('get', '/hello', async (ctx) => {
 *   return ctx.json({ message: 'Hello, World!' })
 * })
 * ```
 */
export class PhotonAdapter<V extends GravitoVariables = GravitoVariables>
  implements HttpAdapter<V>
{
  readonly name = 'photon'
  readonly version = '1.0.0'

  private app: Photon

  constructor(
    private config: AdapterConfig = {},
    photonInstance?: unknown
  ) {
    // Allow injecting an existing Photon instance for backwards compatibility
    if (photonInstance) {
      // Cast to Photon - the caller is responsible for providing a valid instance
      this.app = photonInstance as Photon
    } else {
      // Lazy import to avoid circular dependency issues
      // In practice, PlanetCore will provide the Photon instance
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Photon: PhotonClass } = require('@gravito/photon')
      this.app = new PhotonClass()
    }
  }

  /**
   * Get the underlying Photon app instance
   */
  get native(): Photon {
    return this.app
  }

  /**
   * Set the underlying Photon app instance
   * Used by PlanetCore during initialization
   */
  setNative(app: Photon): void {
    this.app = app
  }

  route(
    method: HttpMethod,
    path: string,
    ...handlers: (GravitoHandler<V> | GravitoMiddleware<V>)[]
  ): void {
    const fullPath = (this.config.basePath || '') + path
    // We treat all handlers as potential middleware (accepting next)
    const photonHandlers = handlers.map((h) => toPhotonMiddleware<V>(h as GravitoMiddleware<V>))

    // Use bracket notation to dynamically call the method
    const methodFn = (this.app as unknown as Record<string, (...args: unknown[]) => unknown>)[
      method
    ]
    if (typeof methodFn !== 'function') {
      throw new Error(`Unsupported HTTP method: ${method}`)
    }

    methodFn.call(this.app, fullPath, ...photonHandlers)
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
    const photonMiddleware = middleware.map((m) => toPhotonMiddleware<V>(m))

    for (const m of photonMiddleware) {
      this.app.use(fullPath, m)
    }
  }

  useGlobal(...middleware: GravitoMiddleware<V>[]): void {
    this.use('*', ...middleware)
  }

  mount(path: string, subAdapter: HttpAdapter<V>): void {
    if (subAdapter.name === 'photon') {
      // Optimized path for Photon sub-adapters
      this.app.route(path, subAdapter.native as Photon)
    } else {
      // Generic fallback: relay all requests to sub-adapter
      this.use(`${path}/*`, async (ctx) => {
        const response = await subAdapter.fetch(ctx.req.raw)
        return response
      })
    }
  }

  onError(handler: GravitoErrorHandler<V>): void {
    this.app.onError(toPhotonErrorHandler<V>(handler))
  }

  onNotFound(handler: GravitoNotFoundHandler<V>): void {
    this.app.notFound(async (c: Context) => {
      const ctx = PhotonContextWrapper.create<V>(c)
      return handler(ctx)
    })
  }

  fetch = (request: Request, server?: unknown): Response | Promise<Response> => {
    return this.app.fetch(request, server)
  }

  createContext(_request: Request): GravitoContext<V> {
    // Create a minimal context for testing
    // In practice, this is called through the Photon routing pipeline
    throw new Error(
      'PhotonAdapter.createContext() should not be called directly. ' +
        'Use the router pipeline instead.'
    )
  }

  async init(): Promise<void> {
    // No-op for Photon
  }

  async shutdown(): Promise<void> {
    // No-op for Photon
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new PhotonAdapter instance
 */
export function createPhotonAdapter<V extends GravitoVariables = GravitoVariables>(
  config?: AdapterConfig
): PhotonAdapter<V> {
  return new PhotonAdapter<V>(config)
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Exports
// ─────────────────────────────────────────────────────────────────────────────

export { PhotonContextWrapper, PhotonRequestWrapper, toPhotonHandler, toPhotonMiddleware }

// ─────────────────────────────────────────────────────────────────────────────
// Rebranded Aliases (Gravito Core)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rebranded alias for PhotonAdapter.
 * @category Rebranding
 */
export const GravitoAdapter = PhotonAdapter
export type GravitoAdapter<V extends GravitoVariables = GravitoVariables> = PhotonAdapter<V>

/**
 * Rebranded alias for createPhotonAdapter.
 * @category Rebranding
 */
export const createGravitoAdapter = createPhotonAdapter
