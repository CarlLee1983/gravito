import type {
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNotFoundHandler,
  HttpMethod,
} from '../../http/types'
import type { HttpAdapter, RouteDefinition } from '../types'
import { BunContext } from './BunContext'
import type { BunRequest } from './BunRequest'
import type { WebSocketRouteHandlers } from './BunWebSocketHandler'
import { BunWebSocketHandler } from './BunWebSocketHandler'
import { RadixRouter } from './RadixRouter'

/**
 * Native Bun-optimized HTTP Adapter for Gravito.
 * Uses Bun's standard Request/Response classes and efficient router.
 * @public
 */
export class BunNativeAdapter implements HttpAdapter {
  public readonly name = 'bun-native'
  public readonly version = '0.0.1'

  public get native(): unknown {
    return this
  }

  private router = new RadixRouter()
  private middlewares: Array<{ path: string; handlers: GravitoMiddleware[] }> = []
  private errorHandler: GravitoErrorHandler | null = null
  private notFoundHandler: GravitoNotFoundHandler | null = null

  // Context pooling for P0 fix (state pollution)
  private contextPool: BunContext[] = []
  private readonly maxPoolSize = 100

  // P2 optimization: Pre-compiled middleware chains
  private middlewareChainCache = new Map<string, GravitoMiddleware[]>()

  // WebSocket support
  private wsHandler = new BunWebSocketHandler()

  route(
    method: HttpMethod,
    path: string,
    ...handlers: (GravitoHandler | GravitoMiddleware)[]
  ): void {
    this.router.add(method, path, handlers as Function[])
  }

  routes(routes: RouteDefinition[]): void {
    for (const route of routes) {
      this.route(
        route.method,
        route.path,
        ...(route.handlers as (GravitoHandler | GravitoMiddleware)[])
      )
    }
  }

  use(path: string, ...middleware: GravitoMiddleware[]): void {
    this.middlewares.push({ path, handlers: middleware })
    // P2 optimization: Clear middleware cache when new middleware added
    this.middlewareChainCache.clear()
  }

  useGlobal(...middleware: GravitoMiddleware[]): void {
    this.use('*', ...middleware)
  }

  useScoped(scope: string, path: string, ...middleware: GravitoMiddleware[]): void {
    if (path === '*' || path === '*/*') {
      throw new Error(
        `useScoped(): Cannot use wildcard path '*' in Orbit-scoped middleware. ` +
          `Use regular use('*') for global middleware, or specify explicit paths like '${scope}/*'`
      )
    }

    const normalizedScope = scope.startsWith('/') ? scope : `/${scope}`
    const fullPath = normalizedScope + (path.startsWith('/') ? '' : `/${path}`)

    if (!fullPath.includes(normalizedScope)) {
      throw new Error(
        `useScoped(): Path '${path}' must include scope prefix '${scope}'. ` +
          `Expected path to be under '${scope}' (e.g., '${scope}${path}')`
      )
    }

    this.middlewares.push({ path: fullPath, handlers: middleware })
  }

  /**
   * P1 Fix: Accurate path pattern matching for middleware
   * Handles wildcards: *, /api/*, /api
   */
  private matchesPath(pattern: string, path: string): boolean {
    if (pattern === '*') {
      return true // Global wildcard
    }

    // HTTP convention: use('/') means "match all paths" (global middleware)
    if (pattern === '/') {
      return true
    }

    // Handle /api/* format
    if (pattern.endsWith('/*')) {
      const basePattern = pattern.slice(0, -2) // Remove /*
      return path === basePattern || path.startsWith(`${basePattern}/`)
    }

    // Handle /api* format (without slash)
    if (pattern.endsWith('*')) {
      const basePattern = pattern.slice(0, -1)
      return path.startsWith(basePattern)
    }

    // Default: treat as prefix match if it matches exactly or as a parent directory
    // This allows .use('/api', ...) to match '/api/test'
    return path === pattern || path.startsWith(`${pattern}/`)
  }

  /**
   * P2 optimization: Pre-compile middleware chain for a path
   */
  private getCompiledMiddlewareChain(path: string): GravitoMiddleware[] {
    // Check cache first
    if (this.middlewareChainCache.has(path)) {
      return this.middlewareChainCache.get(path)!
    }

    // Build chain
    const chain: GravitoMiddleware[] = []

    for (const mw of this.middlewares) {
      if (this.matchesPath(mw.path, path)) {
        chain.push(...mw.handlers)
      }
    }

    // Cache it
    this.middlewareChainCache.set(path, chain)

    return chain
  }

  /**
   * P0 Fix: Context object pooling to prevent state pollution
   */
  private acquireContext(request: Request): BunContext {
    const ctx = this.contextPool.pop()
    if (ctx) {
      ctx.reset(request)
      return ctx
    }
    return BunContext.create(request) as BunContext
  }

  /**
   * P0 Fix: Release context back to pool
   */
  private releaseContext(ctx: BunContext): void {
    if (this.contextPool.length < this.maxPoolSize) {
      // Reset before returning to pool (with dummy request)
      ctx.reset(new Request('http://localhost/'))
      this.contextPool.push(ctx)
    }
  }

  mount(path: string, subAdapter: HttpAdapter): void {
    const fullPath = path.endsWith('/') ? `${path}*` : `${path}/*`

    // Register a wildcard route for ALL methods
    this.route('all' as HttpMethod, fullPath, async (ctx: GravitoContext) => {
      const url = new URL(ctx.req.url)
      // Strip the mounting path prefix (e.g., '/orbit') from the pathname
      const prefix = path.endsWith('/') ? path.slice(0, -1) : path

      if (url.pathname.startsWith(prefix)) {
        // Ensure we handle root correctly (e.g. /orbit needs to become / or similar based on router logic)
        const newPath = url.pathname.slice(prefix.length)
        url.pathname = newPath === '' ? '/' : newPath
      }

      // Create a clean request with minimal properties to avoid carrying over internal state
      const newReq = new Request(url.toString(), {
        method: ctx.req.method,
        headers: ctx.req.raw.headers,
        body: ctx.req.raw.body,
      })

      const res = await subAdapter.fetch(newReq)
      // Ensure response is stored in context for middleware chain
      if ('res' in ctx) {
        ctx.res = res
      }
      return res
    })
  }

  createContext(request: Request): GravitoContext {
    return BunContext.create(request)
  }

  onError(handler: GravitoErrorHandler): void {
    this.errorHandler = handler
  }

  onNotFound(handler: GravitoNotFoundHandler): void {
    this.notFoundHandler = handler
  }

  /**
   * 註冊 WebSocket 路由
   */
  registerWebSocketRoute(path: string, handlers: WebSocketRouteHandlers): void {
    this.wsHandler.register(path, handlers)
  }

  /**
   * 取得 WebSocket handler（供 Bun.serve 使用）
   */
  get websocket() {
    return this.wsHandler.hasAnyRoute() ? this.wsHandler.toHandler() : undefined
  }

  /**
   * Predictive Route Warming (JIT Optimization)
   */
  async warmup(paths: string[]): Promise<void> {
    const dummyReqOpts = { headers: { 'User-Agent': 'Gravito-Warmup/1.0' } }

    for (const path of paths) {
      const req = new Request(`http://localhost${path}`, dummyReqOpts)
      await this.fetch(req)
    }
  }

  async fetch(request: Request, _server?: unknown): Promise<Response> {
    // WebSocket upgrade check (before context acquisition)
    const url = new URL(request.url)
    if (
      _server != null &&
      typeof (_server as { upgrade?: unknown }).upgrade === 'function' &&
      request.headers.get('upgrade')?.toLowerCase() === 'websocket' &&
      this.wsHandler.hasRoute(url.pathname)
    ) {
      const upgraded = (_server as { upgrade: (req: Request, opts: { data: unknown }) => boolean }).upgrade(request, {
        data: {
          path: url.pathname,
          id: crypto.randomUUID(),
          channels: new Set<string>(),
        },
      })
      if (upgraded) {
        return new Response(null, { status: 101 })
      }
    }

    // P0 Fix: Use context pool to prevent state pollution
    const ctx = this.acquireContext(request)

    try {
      const path = url.pathname
      const method = request.method

      const match = this.router.match(method, path)

      const handlers: Function[] = []

      // P2 optimization: Use pre-compiled middleware chain
      const middlewareChain = this.getCompiledMiddlewareChain(path)
      handlers.push(...middlewareChain)

      if (match) {
        if (match.params) {
          ;(ctx.req as BunRequest).setParams(match.params)
        }
        handlers.push(...match.handlers)
      } else if (this.notFoundHandler) {
        // P2 Fix: Add notFound handler only when needed
        handlers.push(this.notFoundHandler)
      }

      return await this.executeChain(ctx, handlers)
    } catch (err) {
      if (this.errorHandler) {
        try {
          const response = await this.errorHandler(err as Error, ctx)
          if (response) {
            return response
          }
        } catch (e) {
          // biome-ignore lint/suspicious/noConsole: HTTP adapter error boundary — no Logger injected in BunNativeAdapter
          console.error('Error handler failed', e)
        }
      }
      // biome-ignore lint/suspicious/noConsole: HTTP adapter error boundary — no Logger injected in BunNativeAdapter
      console.error(err)
      return new Response('Internal Server Error', { status: 500 })
    } finally {
      // P0 Fix: Always release context back to pool
      this.releaseContext(ctx)
    }
  }

  private async executeChain(ctx: GravitoContext, handlers: Function[]): Promise<Response> {
    let index = -1

    const dispatch = async (i: number): Promise<Response | undefined> => {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      index = i

      const fn = handlers[i]
      if (!fn) {
        return undefined
      }

      const result = await fn(ctx, async () => {
        const res = await dispatch(i + 1)
        // If next() returned a response, attach it to context so subsequent c.header() calls work
        if (res && ctx.res !== res) {
          ctx.res = res
        }
        return res
      })

      return result
    }

    const finalResponse = await dispatch(0)

    if (
      finalResponse &&
      (finalResponse instanceof Response || typeof (finalResponse as Response).status === 'number')
    ) {
      return finalResponse as Response
    }

    // Check if context has stored response (from middleware/handler calls to ctx.json() etc)
    if (ctx.res) {
      return ctx.res
    }

    // If no response returned and no notFoundHandler handled it:
    return new Response('Not Found', { status: 404 })
  }
}
