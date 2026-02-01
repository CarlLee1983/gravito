/**
 * @fileoverview MinimalContext - Ultra-lightweight Request Context
 *
 * Designed for zero-middleware static routes where pool overhead
 * exceeds the cost of creating a new object.
 *
 * Key difference from FastContext:
 * - No object pooling (direct instantiation is faster for simple cases)
 * - No Headers object reuse (creates inline)
 * - Minimal memory footprint
 *
 * @module @gravito/core/engine
 */

import type { FastRequest, FastContext as IFastContext } from './types'

/**
 * Minimal request wrapper
 */
class MinimalRequest implements FastRequest {
  private _searchParams: URLSearchParams | null = null

  constructor(
    private readonly _request: Request,
    private readonly _params: Record<string, string>,
    private readonly _path: string,
    private readonly _routePattern?: string
  ) {}

  get url(): string {
    return this._request.url
  }

  get method(): string {
    return this._request.method
  }

  get path(): string {
    return this._path
  }

  get routePattern(): string | undefined {
    return this._routePattern
  }

  param(name: string): string | undefined {
    return this._params[name]
  }

  params(): Record<string, string> {
    return { ...this._params }
  }

  /**
   * Lazy-initialize searchParams, only parse once
   */
  private getSearchParams(): URLSearchParams {
    if (this._searchParams === null) {
      const url = this._request.url
      const queryStart = url.indexOf('?')
      if (queryStart === -1) {
        this._searchParams = new URLSearchParams()
      } else {
        const hashStart = url.indexOf('#', queryStart)
        const queryString =
          hashStart === -1 ? url.slice(queryStart + 1) : url.slice(queryStart + 1, hashStart)
        this._searchParams = new URLSearchParams(queryString)
      }
    }
    return this._searchParams
  }

  query(name: string): string | undefined {
    return this.getSearchParams().get(name) ?? undefined
  }

  queries(): Record<string, string | string[]> {
    const params = this.getSearchParams()
    const result: Record<string, string | string[]> = {}
    for (const [key, value] of params.entries()) {
      const existing = result[key]
      if (existing === undefined) {
        result[key] = value
      } else if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        result[key] = [existing, value]
      }
    }
    return result
  }

  header(name: string): string | undefined {
    return this._request.headers.get(name) ?? undefined
  }

  headers(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, value] of this._request.headers.entries()) {
      result[key] = value
    }
    return result
  }

  async json<T = unknown>(): Promise<T> {
    return this._request.json()
  }

  async text(): Promise<string> {
    return this._request.text()
  }

  async formData(): Promise<FormData> {
    return this._request.formData()
  }

  get raw(): Request {
    return this._request
  }
}

/**
 * MinimalContext - Optimized for simple, fast responses
 *
 * Use when:
 * - No middleware
 * - Static routes
 * - Simple JSON/text responses
 * - No custom headers needed
 */
export class MinimalContext implements IFastContext {
  public readonly req: MinimalRequest
  private _resHeaders: Record<string, string> = {}

  constructor(
    request: Request,
    params: Record<string, string>,
    path: string,
    routePattern?: string
  ) {
    this.req = new MinimalRequest(request, params, path, routePattern)
  }

  // get req(): FastRequest {
  //   return this._req
  // }

  // Response helpers - merge custom headers with defaults
  private getHeaders(contentType: string): Record<string, string> {
    return {
      ...this._resHeaders,
      'Content-Type': contentType,
    }
  }

  json<T>(data: T, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: this.getHeaders('application/json; charset=utf-8'),
    })
  }

  text(text: string, status = 200): Response {
    return new Response(text, {
      status,
      headers: this.getHeaders('text/plain; charset=utf-8'),
    })
  }

  html(html: string, status = 200): Response {
    return new Response(html, {
      status,
      headers: this.getHeaders('text/html; charset=utf-8'),
    })
  }

  redirect(url: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
    return new Response(null, {
      status,
      headers: { ...this._resHeaders, Location: url },
    })
  }

  body(data: BodyInit | null, status = 200): Response {
    return new Response(data, {
      status,
      headers: this._resHeaders,
    })
  }

  header(name: string): string | undefined
  header(name: string, value: string): void
  header(name: string, value?: string): string | undefined | undefined {
    if (value !== undefined) {
      this._resHeaders[name] = value
      return
    }
    return this.req.header(name)
  }

  status(_code: number): void {
    // Status is set per response helper call, not stored on context
  }

  stream(stream: ReadableStream, status = 200): Response {
    return new Response(stream, {
      status,
      headers: this.getHeaders('application/octet-stream'),
    })
  }

  notFound(message = 'Not Found'): Response {
    return this.text(message, 404)
  }

  forbidden(message = 'Forbidden'): Response {
    return this.text(message, 403)
  }

  unauthorized(message = 'Unauthorized'): Response {
    return this.text(message, 401)
  }

  badRequest(message = 'Bad Request'): Response {
    return this.text(message, 400)
  }

  async forward(target: string, _options: any = {}): Promise<Response> {
    const url = new URL(this.req.url)
    const targetUrl = new URL(
      target.startsWith('http') ? target : `${url.protocol}//${target}${this.req.path}`
    )
    return fetch(targetUrl.toString(), {
      method: this.req.method,
      headers: this.req.raw.headers,
    })
  }

  get<T>(_key: string): T {
    return undefined as any
  }

  set(_key: string, _value: any): void {}

  public route: (name: string, params?: any, query?: any) => string = () => ''

  get native(): this {
    return this
  }

  // Required for interface compatibility
  init(_request: Request, _params?: Record<string, string>, _path?: string): this {
    throw new Error('MinimalContext does not support init. Create a new instance instead.')
  }

  // Required for interface compatibility
  reset(): void {
    // MinimalContext is not pooled, so no-op
  }
}
