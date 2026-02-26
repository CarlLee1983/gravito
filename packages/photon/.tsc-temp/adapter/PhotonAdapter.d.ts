/**
 * @fileoverview Photon Adapter Implementation
 *
 * This adapter wraps Photon to implement the Gravito HttpAdapter interface.
 * It serves as the default adapter and reference implementation for others.
 *
 * @module @gravito/photon/adapter
 * @since 2.0.0
 */
import type {
  AdapterConfig,
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNotFoundHandler,
  GravitoRequest,
  GravitoVariables,
  HttpAdapter,
  HttpMethod,
  ProxyOptions,
  RouteDefinition,
  StatusCode,
} from '@gravito/core'
import { RequestScopeManager } from '@gravito/core'
import type { Context, Handler, MiddlewareHandler, Photon } from '@gravito/photon'
/**
 * Wraps Photon's request object to implement GravitoRequest
 */
declare class PhotonRequestWrapper implements GravitoRequest {
  photonCtx: Context
  /**
   * Reset the wrapper for pooling
   */
  reset(photonCtx: Context): void
  /**
   * Create a proxied instance to delegate to Photon's request
   */
  static create(photonCtx: Context): PhotonRequestWrapper
  /**
   * Internal proxy wrapper
   */
  static wrap(instance: PhotonRequestWrapper): PhotonRequestWrapper
  get url(): string
  get method(): string
  get path(): string
  param(name: string): string | undefined
  params(): Record<string, string>
  query(name: string): string | undefined
  queries(): Record<string, string | string[]>
  header(name: string): string | undefined
  header(): Record<string, string>
  json<T = unknown>(): Promise<T>
  text(): Promise<string>
  formData(): Promise<FormData>
  arrayBuffer(): Promise<ArrayBuffer>
  parseBody<T = unknown>(): Promise<T>
  get raw(): Request
  valid<T = unknown>(target: string): T
}
/**
 * Wraps Photon's context to implement GravitoContext
 */
declare class PhotonContextWrapper<V extends GravitoVariables = GravitoVariables>
  implements GravitoContext<V>
{
  private _req
  private photonCtx
  private _requestScope
  route: (
    name: string,
    params?: Record<string, string | number>,
    query?: Record<string, string | number | boolean | null | undefined>
  ) => string
  /**
   * Reset the wrapper for pooling
   */
  reset(photonCtx: Context): void
  /**
   * Create a proxied instance to enable object destructuring of context variables
   */
  static create<V extends GravitoVariables = GravitoVariables>(
    photonCtx: Context
  ): GravitoContext<V>
  /**
   * Internal proxy wrapper
   */
  static wrap<V extends GravitoVariables = GravitoVariables>(
    instance: PhotonContextWrapper<V>
  ): GravitoContext<V>
  get req(): GravitoRequest
  get params(): Record<string, string>
  get query(): Record<string, string | string[]>
  get data(): unknown
  set data(value: unknown)
  back(status?: 301 | 302 | 303 | 307 | 308): Response
  json<T>(data: T, status?: number): Response
  text(text: string, status?: number): Response
  html(html: string, status?: number): Response
  redirect(url: string, status?: 301 | 302 | 303 | 307 | 308): Response
  body(data: BodyInit | null, status?: number): Response
  stream(stream: ReadableStream, status?: number): Response
  notFound(message?: string): Response
  forbidden(message?: string): Response
  unauthorized(message?: string): Response
  badRequest(message?: string): Response
  header(name: string): string | undefined
  header(
    name: string,
    value: string,
    options?: {
      append?: boolean
    }
  ): void
  status(code: StatusCode): void
  get<K extends keyof V>(key: K): V[K]
  set<K extends keyof V>(key: K, value: V[K]): void
  get executionCtx(): ExecutionContext | undefined
  get env(): Record<string, unknown> | undefined
  get native(): Context
  forward(target: string, options?: ProxyOptions): Promise<Response>
  requestScope(): RequestScopeManager
  scoped<T>(key: string | symbol, factory: () => T): T
}
/**
 * Convert a GravitoHandler to a Photon Handler
 */
declare function toPhotonHandler<V extends GravitoVariables>(handler: GravitoHandler<V>): Handler
/**
 * Convert a GravitoMiddleware to a Photon MiddlewareHandler
 */
declare function toPhotonMiddleware<V extends GravitoVariables>(
  middleware: GravitoMiddleware<V>
): MiddlewareHandler
/**
 * Default HTTP adapter using the optimized Gravito Core Engine.
 *
 * This adapter provides a consistent interface that can be
 * swapped out for other implementations without changing application code.
 *
 * @example
 * ```typescript
 * import { PhotonAdapter } from '@gravito/photon/adapter'
 *
 * const adapter = new PhotonAdapter()
 *
 * // Register routes
 * adapter.route('get', '/hello', async (ctx) => {
 *   return ctx.json({ message: 'Hello, World!' })
 * })
 * ```
 */
export declare class PhotonAdapter<V extends GravitoVariables = GravitoVariables>
  implements HttpAdapter<V>
{
  private config
  readonly name = 'photon'
  readonly version = '1.0.0'
  private app
  constructor(config?: AdapterConfig, photonInstance?: unknown)
  /**
   * Get the underlying Photon app instance
   */
  get native(): Photon
  /**
   * Set the underlying Photon app instance
   * Used by PlanetCore during initialization
   */
  setNative(app: Photon): void
  route(
    method: HttpMethod,
    path: string,
    ...handlers: (GravitoHandler<V> | GravitoMiddleware<V>)[]
  ): void
  routes(routes: RouteDefinition[]): void
  use(path: string, ...middleware: GravitoMiddleware<V>[]): void
  useGlobal(...middleware: GravitoMiddleware<V>[]): void
  useScoped(scope: string, path: string, ...middleware: GravitoMiddleware<V>[]): void
  mount(path: string, subAdapter: HttpAdapter<V>): void
  onError(handler: GravitoErrorHandler<V>): void
  onNotFound(handler: GravitoNotFoundHandler<V>): void
  /**
   * Predictive Route Warming (JIT Optimization)
   */
  warmup(paths: string[]): Promise<void>
  fetch: (request: Request, server?: unknown) => Response | Promise<Response>
  createContext(_request: Request): GravitoContext<V>
  init(): Promise<void>
  shutdown(): Promise<void>
}
/**
 * Create a new PhotonAdapter instance
 */
export declare function createPhotonAdapter<V extends GravitoVariables = GravitoVariables>(
  config?: AdapterConfig
): PhotonAdapter<V>
export { PhotonContextWrapper, PhotonRequestWrapper, toPhotonHandler, toPhotonMiddleware }
/**
 * Rebranded alias for PhotonAdapter.
 * @category Rebranding
 */
export declare const GravitoAdapter: typeof PhotonAdapter
/**
 * Rebranded alias for PhotonAdapter type.
 * @category Rebranding
 */
export type GravitoAdapter<V extends GravitoVariables = GravitoVariables> = PhotonAdapter<V>
/**
 * Rebranded alias for createPhotonAdapter.
 * @category Rebranding
 */
export declare const createGravitoAdapter: typeof createPhotonAdapter
