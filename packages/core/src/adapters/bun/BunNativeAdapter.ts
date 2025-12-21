import type {
    GravitoContext,
    GravitoHandler,
    GravitoMiddleware,
    GravitoErrorHandler,
    GravitoNotFoundHandler,
    HttpMethod,
    GravitoVariables
} from '../../http/types'
import type { HttpAdapter, RouteDefinition } from '../types'
import { RadixRouter } from './RadixRouter'
import { BunContext } from './BunContext'

export class BunNativeAdapter implements HttpAdapter {
    public readonly name = 'bun-native'
    public readonly version = '0.0.1'

    public get native(): unknown {
        return this
    }

    private router = new RadixRouter()
    private middlewares: Array<{ path: string, handlers: GravitoMiddleware[] }> = []
    private errorHandler: GravitoErrorHandler | null = null
    private notFoundHandler: GravitoNotFoundHandler | null = null

    constructor() { }

    route(method: HttpMethod, path: string, ...handlers: (GravitoHandler | GravitoMiddleware)[]): void {
        this.router.add(method, path, handlers as any[])
    }

    routes(routes: RouteDefinition[]): void {
        for (const route of routes) {
            this.route(route.method, route.path, ...(route.handlers as (GravitoHandler | GravitoMiddleware)[]))
        }
    }



    use(path: string, ...middleware: GravitoMiddleware[]): void {
        this.middlewares.push({ path, handlers: middleware })
    }

    useGlobal(...middleware: GravitoMiddleware[]): void {
        this.use('*', ...middleware)
    }

    mount(path: string, subAdapter: HttpAdapter): void {
        const fullPath = path.endsWith('/') ? `${path}*` : `${path}/*`

        // Register a wildcard route for ALL methods
        this.route('all' as HttpMethod, fullPath, async (ctx: GravitoContext) => {
            const url = new URL(ctx.req.url)
            // Strip the mounting path prefix (e.g., '/orbit') from the pathname
            const prefix = path.endsWith('/') ? path.slice(0, -1) : path

            console.log('[DEBUG] Mount Prefix:', prefix)
            console.log('[DEBUG] Original Path:', url.pathname)

            if (url.pathname.startsWith(prefix)) {
                // Ensure we handle root correctly (e.g. /orbit needs to become / or similar based on router logic)
                const newPath = url.pathname.slice(prefix.length)
                url.pathname = newPath === '' ? '/' : newPath
            }

            // Create a clean request with minimal properties to avoid carrying over internal state
            const newReq = new Request(url.toString(), {
                method: ctx.req.method,
                headers: ctx.req.raw.headers,
            })

            const res = await subAdapter.fetch(newReq)
            // Ensure response is stored in context for middleware chain
            if (ctx instanceof BunContext) {
                ctx.res = res
            }
            return res
        })
    }

    createContext(request: Request): GravitoContext {
        return new BunContext(request)
    }

    onError(handler: GravitoErrorHandler): void {
        this.errorHandler = handler
    }

    onNotFound(handler: GravitoNotFoundHandler): void {
        this.notFoundHandler = handler
    }

    async fetch(request: Request, server?: unknown): Promise<Response> {
        const ctx = new BunContext(request)

        try {
            const url = new URL(request.url)
            const path = url.pathname
            const method = request.method

            const match = this.router.match(method, path)

            const handlers: Function[] = []

            for (const mw of this.middlewares) {
                if (mw.path === '*' || path.startsWith(mw.path)) {
                    handlers.push(...mw.handlers)
                }
            }

            if (match) {
                if (match.params) {
                    ctx.req.setParams(match.params)
                }
                handlers.push(...match.handlers)
            } else {
                if (this.notFoundHandler) {
                    handlers.push(this.notFoundHandler)
                } else {
                    // Do NOT return response here, let it flow through chain in case middleware handles it?
                    // But if not found handler exists, we added it.
                    // If NO notFoundHandler, handlers ends after middleware.
                    // We can check if chain produced response.
                    // But middleware might run "on 404".
                }
            }

            return await this.executeChain(ctx, handlers)

        } catch (err) {
            if (this.errorHandler) {
                try {
                    const response = await this.errorHandler(err as Error, ctx)
                    if (response) return response
                } catch (e) {
                    console.error('Error handler failed', e)
                }
            }
            console.error(err)
            return new Response('Internal Server Error', { status: 500 })
        }
    }

    private async executeChain(ctx: GravitoContext, handlers: Function[]): Promise<Response> {
        let index = -1

        const dispatch = async (i: number): Promise<Response | undefined> => {
            if (i <= index) throw new Error('next() called multiple times')
            index = i

            const fn = handlers[i]
            if (!fn) return undefined

            const result = await fn(ctx, async () => {
                const res = await dispatch(i + 1)
                // If next() returned a response, attach it to context so subsequent c.header() calls work
                if (res && (ctx as BunContext).res !== res) {
                    console.log('[BunNativeAdapter] Linking response to context');
                    (ctx as BunContext).res = res
                }
                return res
            })

            return result
        }

        const finalResponse = await dispatch(0)

        if (finalResponse && (finalResponse instanceof Response || typeof (finalResponse as Response).status === 'number')) {
            return finalResponse as Response
        }

        // Check if context has stored response (from middleware/handler calls to ctx.json() etc)
        if ((ctx as BunContext).res) {
            return (ctx as BunContext).res!
        }

        // If no response returned and no notFoundHandler handled it:
        return new Response('Not Found', { status: 404 })
    }
}
