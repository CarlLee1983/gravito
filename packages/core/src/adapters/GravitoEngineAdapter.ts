import { Gravito } from '../engine/Gravito'
import type {
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNotFoundHandler,
  GravitoVariables,
  HttpMethod,
} from '../http/types'
import type { AdapterConfig, HttpAdapter, RouteDefinition } from './types'

/**
 * GravitoEngineAdapter - Optimized adapter using the Standalone Gravito Engine
 *
 * This adapter is exclusively for Bun and provides the best performance
 * by using the specialized Gravito engine with object pooling and AOT routing.
 */
export class GravitoEngineAdapter<V extends GravitoVariables = GravitoVariables>
  implements HttpAdapter<V>
{
  readonly name = 'gravito-engine'
  readonly version = '1.0.0'

  private engine: Gravito

  constructor(config: AdapterConfig = {}) {
    this.engine = new Gravito(config.engineOptions)
  }

  get native(): Gravito {
    return this.engine
  }

  route(
    method: HttpMethod,
    path: string,
    ...handlers: (GravitoHandler<V> | GravitoMiddleware<V>)[]
  ): void {
    // Gravito engine uses Hono-like API for methods
    const methodFn = (this.engine as any)[method.toLowerCase()]
    if (typeof methodFn !== 'function') {
      throw new Error(`Unsupported HTTP method: ${method}`)
    }
    methodFn.call(this.engine, path, ...handlers)
  }

  routes(routes: RouteDefinition[]): void {
    for (const route of routes) {
      this.route(route.method, route.path, ...(route.handlers as any[]))
    }
  }

  use(path: string, ...middleware: GravitoMiddleware<V>[]): void {
    this.engine.use(path, ...(middleware as any))
  }

  useGlobal(...middleware: GravitoMiddleware<V>[]): void {
    this.engine.use(...(middleware as any))
  }

  mount(path: string, subAdapter: HttpAdapter<V>): void {
    // For now, simple relay
    this.use(`${path}/*`, async (ctx) => {
      return await subAdapter.fetch(ctx.req.raw)
    })
  }

  onError(handler: GravitoErrorHandler<V>): void {
    this.engine.onError(handler as any)
  }

  onNotFound(handler: GravitoNotFoundHandler<V>): void {
    this.engine.notFound(handler as any)
  }

  fetch = (request: Request, _server?: unknown): Response | Promise<Response> => {
    return this.engine.fetch(request)
  }

  async warmup(paths: string[]): Promise<void> {
    await this.engine.warmup(paths)
  }

  createContext(_request: Request): GravitoContext<V> {
    // Gravito engine has its own internal context management
    throw new Error('GravitoEngineAdapter manages context internally through pooling.')
  }

  useScoped(scope: string, path: string, ...middleware: GravitoMiddleware<V>[]): void {
    if (path === '*' || path === '*/*') {
      throw new Error(
        `useScoped(): Cannot use wildcard path '*' in Orbit-scoped middleware. ` +
          `Use regular use('*') for global middleware, or specify explicit paths like '${scope}/*'`
      )
    }

    const normalizedScope = scope.startsWith('/') ? scope : `/${scope}`
    const fullPath = normalizedScope + (path.startsWith('/') ? '' : '/') + path

    this.use(fullPath, ...middleware)
  }
}
