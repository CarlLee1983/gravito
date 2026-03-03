import { RequestScopeManager } from '../../Container/RequestScopeManager'
import type {
  ContentfulStatusCode,
  GravitoContext,
  GravitoVariables,
  ProxyOptions,
  StatusCode,
} from '../../http/types'
import { BunRequest } from './BunRequest'
/**
 * Bun-optimized implementation of GravitoContext.
 * @internal
 */
export declare class BunContext<V extends GravitoVariables = GravitoVariables>
  implements GravitoContext<V>
{
  readonly env: Record<string, unknown>
  req: BunRequest
  private _variables
  private _requestScope
  /**
   * URL generator helper
   */
  route: (name: string, params?: Record<string, any>, query?: Record<string, any>) => string
  private _status
  private _headers
  private _executionCtx?
  res: Response | undefined
  readonly native: unknown
  constructor(request: Request, env?: Record<string, unknown>, executionCtx?: ExecutionContext)
  /**
   * Create a proxied instance to enable object destructuring of context variables
   * This allows: async list({ userService }: Context)
   */
  static create<V extends GravitoVariables = GravitoVariables>(
    request: Request,
    env?: Record<string, unknown>,
    executionCtx?: ExecutionContext
  ): GravitoContext<V>
  json<T>(data: T, status?: ContentfulStatusCode): Response
  text(text: string, status?: ContentfulStatusCode): Response
  html(html: string, status?: ContentfulStatusCode): Response
  redirect(url: string, status?: 301 | 302 | 303 | 307 | 308): Response
  body(data: BodyInit | null, status?: StatusCode): Response
  stream(stream: ReadableStream, status?: ContentfulStatusCode): Response
  notFound(message?: string): Response
  forbidden(message?: string): Response
  unauthorized(message?: string): Response
  badRequest(message?: string): Response
  forward(target: string, options?: ProxyOptions): Promise<Response>
  header(
    name: string,
    value: string,
    options?: {
      append?: boolean
    }
  ): void
  header(name: string): string | undefined
  /**
   * Reset context state for reuse in pooling scenarios
   * @internal
   */
  reset(request: Request): void
  status(code: StatusCode): void
  get<K extends keyof V>(key: K): V[K]
  set<K extends keyof V>(key: K, value: V[K]): void
  get executionCtx(): ExecutionContext | undefined
  requestScope(): RequestScopeManager
  scoped<T>(key: string | symbol, factory: () => T): T
}
