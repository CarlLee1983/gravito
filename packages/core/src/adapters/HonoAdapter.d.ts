/**
 * @fileoverview Hono Adapter Implementation
 *
 * This adapter wraps Hono to implement the Gravito HttpAdapter interface.
 * It serves as the default adapter and reference implementation for others.
 *
 * @module @gravito/core/adapters/hono
 * @since 2.0.0
 */
import type { Context, Handler, Hono, MiddlewareHandler } from 'hono'
import type {
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNotFoundHandler,
  GravitoRequest,
  GravitoVariables,
  HttpMethod,
  StatusCode,
} from '../http/types'
import type { AdapterConfig, HttpAdapter, RouteDefinition } from './types'
/**
 * Wraps Hono's request object to implement GravitoRequest
 */
declare class HonoRequestWrapper implements GravitoRequest {
  private honoCtx
  constructor(honoCtx: Context)
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
 * Wraps Hono's context to implement GravitoContext
 */
declare class HonoContextWrapper<V extends GravitoVariables = GravitoVariables>
  implements GravitoContext<V>
{
  private honoCtx
  private _req
  constructor(honoCtx: Context)
  /**
   * Create a proxied instance to enable object destructuring of context variables
   * This allows: async list({ userService }: Context)
   */
  static create<V extends GravitoVariables = GravitoVariables>(honoCtx: Context): GravitoContext<V>
  get req(): GravitoRequest
  json<T>(data: T, status?: number): Response
  text(text: string, status?: number): Response
  html(html: string, status?: number): Response
  redirect(url: string, status?: 301 | 302 | 303 | 307 | 308): Response
  body(data: BodyInit | null, status?: number): Response
  stream(stream: ReadableStream, status?: number): Response
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
}
/**
 * Convert a GravitoHandler to a Hono Handler
 */
declare function toHonoHandler<V extends GravitoVariables>(handler: GravitoHandler<V>): Handler
/**
 * Convert a GravitoMiddleware to a Hono MiddlewareHandler
 */
declare function toHonoMiddleware<V extends GravitoVariables>(
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
export declare class HonoAdapter<V extends GravitoVariables = GravitoVariables>
  implements HttpAdapter<V>
{
  private config
  readonly name = 'hono'
  readonly version = '1.0.0'
  private app
  constructor(config?: AdapterConfig, honoInstance?: unknown)
  /**
   * Get the underlying Hono app instance
   */
  get native(): Hono
  /**
   * Set the underlying Hono app instance
   * Used by PlanetCore during initialization
   */
  setNative(app: Hono): void
  route(
    method: HttpMethod,
    path: string,
    ...handlers: (GravitoHandler<V> | GravitoMiddleware<V>)[]
  ): void
  routes(routes: RouteDefinition[]): void
  use(path: string, ...middleware: GravitoMiddleware<V>[]): void
  useGlobal(...middleware: GravitoMiddleware<V>[]): void
  mount(path: string, subAdapter: HttpAdapter<V>): void
  onError(handler: GravitoErrorHandler<V>): void
  onNotFound(handler: GravitoNotFoundHandler<V>): void
  fetch: (request: Request, server?: unknown) => Response | Promise<Response>
  createContext(_request: Request): GravitoContext<V>
  init(): Promise<void>
  shutdown(): Promise<void>
}
/**
 * Create a new HonoAdapter instance
 */
export declare function createHonoAdapter<V extends GravitoVariables = GravitoVariables>(
  config?: AdapterConfig
): HonoAdapter<V>
export { HonoContextWrapper, HonoRequestWrapper, toHonoHandler, toHonoMiddleware }
/**
 * Rebranded alias for HonoAdapter.
 * @category Rebranding
 */
export declare const GravitoAdapter: typeof HonoAdapter
export type GravitoAdapter<V extends GravitoVariables = GravitoVariables> = HonoAdapter<V>
/**
 * Rebranded alias for createHonoAdapter.
 * @category Rebranding
 */
export declare const createGravitoAdapter: typeof createHonoAdapter
//# sourceMappingURL=HonoAdapter.d.ts.map
