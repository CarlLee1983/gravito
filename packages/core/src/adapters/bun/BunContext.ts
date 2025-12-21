import type {
    GravitoContext,
    GravitoRequest,
    GravitoVariables,
    ContentfulStatusCode,
    StatusCode
} from '../../http/types'
import { BunRequest } from './BunRequest'

export class BunContext<V extends GravitoVariables = GravitoVariables> implements GravitoContext<V> {
    // Request wrapper
    public readonly req: BunRequest

    // Context variables
    private _variables: Map<string, unknown> = new Map()

    // Response state
    private _status: StatusCode = 200
    private _headers: Headers = new Headers()
    private _executionCtx?: ExecutionContext

    // Stored response (Hono-like behavior)
    public res: Response | undefined

    public readonly native: unknown

    constructor(
        request: Request,
        public readonly env: Record<string, unknown> = {},
        executionCtx?: ExecutionContext
    ) {
        this.req = new BunRequest(request)
        this._executionCtx = executionCtx
        this.native = { request, env, executionCtx }
    }

    // Response Builders
    json<T>(data: T, status: ContentfulStatusCode = 200): Response {
        this.status(status)
        this.header('Content-Type', 'application/json')
        this.res = new Response(JSON.stringify(data), {
            status: this._status,
            headers: this._headers
        })
        return this.res
    }

    text(text: string, status: ContentfulStatusCode = 200): Response {
        this.status(status)
        this.header('Content-Type', 'text/plain')
        this.res = new Response(text, {
            status: this._status,
            headers: this._headers
        })
        return this.res
    }

    html(html: string, status: ContentfulStatusCode = 200): Response {
        this.status(status)
        this.header('Content-Type', 'text/html')
        this.res = new Response(html, {
            status: this._status,
            headers: this._headers
        })
        return this.res
    }

    redirect(url: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
        this.status(status)
        this.header('Location', url)
        this.res = new Response(null, {
            status: this._status,
            headers: this._headers
        })
        return this.res
    }

    body(data: BodyInit | null, status: StatusCode = 200): Response {
        this.status(status)
        this.res = new Response(data, {
            status: this._status,
            headers: this._headers
        })
        return this.res
    }

    stream(stream: ReadableStream, status: ContentfulStatusCode = 200): Response {
        this.status(status)
        this.res = new Response(stream, {
            status: this._status,
            headers: this._headers
        })
        return this.res
    }

    // Headers
    header(name: string, value: string, options?: { append?: boolean }): void
    header(name: string): string | undefined
    header(name: string, value?: string, options?: { append?: boolean }): string | undefined | void {
        if (value === undefined) {
            return this.req.header(name)
        }
        if (options?.append) {
            console.log('[BunContext] Appending to RES headers:', name, value)
            this._headers.append(name, value)
            this.res?.headers.append(name, value)
        } else {
            this._headers.set(name, value)
            if (this.res) {
                this.res.headers.set(name, value)
            }
        }
    }

    status(code: StatusCode): void {
        this._status = code
    }

    // Context Variables
    get<K extends keyof V>(key: K): V[K] {
        return this._variables.get(key as string) as V[K]
    }

    set<K extends keyof V>(key: K, value: V[K]): void {
        this._variables.set(key as string, value)
    }

    // Execution Control
    get executionCtx(): ExecutionContext | undefined {
        return this._executionCtx
    }
}
