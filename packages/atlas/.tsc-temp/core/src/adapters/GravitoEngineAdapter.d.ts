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
export declare class GravitoEngineAdapter<V extends GravitoVariables = GravitoVariables>
  implements HttpAdapter<V>
{
  readonly name = 'gravito-engine'
  readonly version = '1.0.0'
  private engine
  constructor(config?: AdapterConfig)
  get native(): Gravito
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
  fetch: (request: Request, _server?: unknown) => Response | Promise<Response>
  warmup(paths: string[]): Promise<void>
  createContext(_request: Request): GravitoContext<V>
  useScoped(scope: string, path: string, ...middleware: GravitoMiddleware<V>[]): void
}
