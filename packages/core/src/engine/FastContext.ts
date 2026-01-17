/**
 * @fileoverview FastContext - Pooled Request Context
 *
 * Minimal, high-performance context implementation designed for object pooling.
 * Lazy parsing strategy: only parse what's actually accessed.
 *
 * @module @gravito/core/engine
 */

import type { FastRequest, FastContext as IFastContext } from './types'

/**
 * Lazy-parsed request wrapper
 *
 * Delays parsing of query params, headers, and body until accessed.
 * This is a key optimization for requests that don't need all data.
 */
class FastRequestImpl implements FastRequest {
  private _request!: Request
  private _params!: Record<string, string>
  private _path!: string
  private _url: URL | null = null
  private _query: URLSearchParams | null = null
  private _headers: Record<string, string> | null = null
  private _cachedJson: unknown = undefined
  private _jsonParsed = false
  // Back-reference for release check optimization
  private _ctx: FastContext

  constructor(ctx: FastContext) {
    this._ctx = ctx
  }

  /**
   * Initialize for new request
   */
  init(request: Request, params: Record<string, string> = {}, path = ''): this {
    this._request = request
    this._params = params
    this._path = path
    this._url = null
    this._query = null
    this._headers = null
    this._cachedJson = undefined
    this._jsonParsed = false
    return this
  }

  /**
   * Reset for pooling
   */
  reset(): void {
    // Release references to allow GC
    // @ts-expect-error - Breaking strict null check for GC
    this._request = undefined
    // @ts-expect-error
    this._params = undefined
    this._url = null
    this._query = null
    this._headers = null
    this._cachedJson = undefined
    this._jsonParsed = false
  }

  private checkReleased(): void {
    // @ts-expect-error - Accessing private property via back-ref
    if (this._ctx._isReleased) {
      throw new Error(
        'FastContext usage after release detected! (Object Pool Strict Lifecycle Guard)'
      )
    }
  }

  get url(): string {
    this.checkReleased()
    return this._request.url
  }

  get method(): string {
    this.checkReleased()
    return this._request.method
  }

  get path(): string {
    this.checkReleased()
    return this._path
  }

  param(name: string): string | undefined {
    this.checkReleased()
    return this._params[name]
  }

  params(): Record<string, string> {
    this.checkReleased()
    return { ...this._params }
  }

  private getUrl(): URL {
    if (!this._url) {
      this._url = new URL(this._request.url)
    }
    return this._url
  }

  query(name: string): string | undefined {
    this.checkReleased()
    if (!this._query) {
      this._query = this.getUrl().searchParams
    }
    return this._query.get(name) ?? undefined
  }

  queries(): Record<string, string | string[]> {
    this.checkReleased()
    if (!this._query) {
      this._query = this.getUrl().searchParams
    }

    const result: Record<string, string | string[]> = {}
    for (const [key, value] of this._query.entries()) {
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
    this.checkReleased()
    return this._request.headers.get(name) ?? undefined
  }

  headers(): Record<string, string> {
    this.checkReleased()
    if (!this._headers) {
      this._headers = {}
      for (const [key, value] of this._request.headers.entries()) {
        this._headers[key] = value
      }
    }
    return { ...this._headers }
  }

  async json<T = unknown>(): Promise<T> {
    this.checkReleased()
    if (!this._jsonParsed) {
      this._cachedJson = await this._request.json()
      this._jsonParsed = true
    }
    return this._cachedJson as T
  }

  async text(): Promise<string> {
    this.checkReleased()
    return this._request.text()
  }

  async formData(): Promise<FormData> {
    this.checkReleased()
    return this._request.formData()
  }

  get raw(): Request {
    this.checkReleased()
    return this._request
  }
}

/**
 * FastContext - Pooled request context
 *
 * Designed for minimal memory allocation and maximum reuse.
 * All response helpers create Response objects directly without intermediate wrappers.
 */
export class FastContext implements IFastContext {
  public readonly req: FastRequestImpl = new FastRequestImpl(this)
  // private _statusCode = 200
  private _headers = new Headers() // Reuse this object

  public _isReleased = false // Made public for internal check access

  /**
   * Initialize context for a new request
   *
   * This is called when acquiring from the pool.
   */
  init(request: Request, params: Record<string, string> = {}, path = ''): this {
    this._isReleased = false
    this.req.init(request, params, path)
    // Optimization: Creating new Headers is faster than iterating to delete in Bun
    // But for strict object pooling, we might want to reconsider.
    // For now, new Headers() is safe and fast enough.
    this._headers = new Headers()
    return this
  }

  /**
   * Reset context for pooling (Cleanup)
   *
   * This is called when releasing back to the pool.
   * Implements "Deep-Reset Protocol" and "Release Guard".
   */
  reset(): void {
    this._isReleased = true
    this.req.reset()
    // We don't clear _headers here because init() will create a new one.
    // If we wanted to reuse, we would clear it here.
  }

  /**
   * Check if context is released
   */
  private checkReleased(): void {
    if (this._isReleased) {
      throw new Error(
        'FastContext usage after release detected! (Object Pool Strict Lifecycle Guard)'
      )
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Response Helpers
  // ─────────────────────────────────────────────────────────────────────────

  json<T>(data: T, status = 200): Response {
    this.checkReleased()
    this._headers.set('Content-Type', 'application/json; charset=utf-8')
    return new Response(JSON.stringify(data), {
      status,
      headers: this._headers,
    })
  }

  text(text: string, status = 200): Response {
    this.checkReleased()
    this._headers.set('Content-Type', 'text/plain; charset=utf-8')
    return new Response(text, {
      status,
      headers: this._headers,
    })
  }

  html(html: string, status = 200): Response {
    this.checkReleased()
    this._headers.set('Content-Type', 'text/html; charset=utf-8')
    return new Response(html, {
      status,
      headers: this._headers,
    })
  }

  redirect(url: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
    this.checkReleased()
    this._headers.set('Location', url)
    return new Response(null, {
      status,
      headers: this._headers,
    })
  }

  body(data: BodyInit | null, status = 200): Response {
    this.checkReleased()
    return new Response(data, {
      status,
      headers: this._headers,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Header Management
  // ─────────────────────────────────────────────────────────────────────────

  header(name: string, value: string): void {
    this.checkReleased()
    this._headers.set(name, value)
  }

  status(_code: number): void {
    this.checkReleased()
    // this._statusCode = code
  }
}
