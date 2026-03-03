import type {
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNotFoundHandler,
  HttpMethod,
} from '../../http/types'
import type { HttpAdapter, RouteDefinition } from '../types'
import type { WebSocketRouteHandlers } from './BunWebSocketHandler'
/**
 * Native Bun-optimized HTTP Adapter for Gravito.
 * Uses Bun's standard Request/Response classes and efficient router.
 * @public
 */
export declare class BunNativeAdapter implements HttpAdapter {
  readonly name = 'bun-native'
  readonly version = '0.0.1'
  get native(): unknown
  private router
  private middlewares
  private errorHandler
  private notFoundHandler
  private contextPool
  private readonly maxPoolSize
  private middlewareChainCache
  private wsHandler
  route(method: HttpMethod, path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void
  routes(routes: RouteDefinition[]): void
  use(path: string, ...middleware: GravitoMiddleware[]): void
  useGlobal(...middleware: GravitoMiddleware[]): void
  useScoped(scope: string, path: string, ...middleware: GravitoMiddleware[]): void
  /**
   * P1 Fix: Accurate path pattern matching for middleware
   * Handles wildcards: *, /api/*, /api
   */
  private matchesPath
  /**
   * P2 optimization: Pre-compile middleware chain for a path
   */
  private getCompiledMiddlewareChain
  /**
   * P0 Fix: Context object pooling to prevent state pollution
   */
  private acquireContext
  /**
   * P0 Fix: Release context back to pool
   */
  private releaseContext
  mount(path: string, subAdapter: HttpAdapter): void
  createContext(request: Request): GravitoContext
  onError(handler: GravitoErrorHandler): void
  onNotFound(handler: GravitoNotFoundHandler): void
  /**
   * 註冊 WebSocket 路由
   */
  registerWebSocketRoute(path: string, handlers: WebSocketRouteHandlers): void
  /**
   * 取得 WebSocket handler（供 Bun.serve 使用）
   */
  get websocket(): {
    open?: (ws: unknown) => void | Promise<void>
    message?: (ws: unknown, data: string | Buffer | Uint8Array) => void | Promise<void>
    close?: (ws: unknown, code: number, reason: string) => void | Promise<void>
    drain?: (ws: unknown) => void | Promise<void>
  }
  /**
   * Predictive Route Warming (JIT Optimization)
   */
  warmup(paths: string[]): Promise<void>
  fetch(request: Request, _server?: unknown): Promise<Response>
  private executeChain
}
