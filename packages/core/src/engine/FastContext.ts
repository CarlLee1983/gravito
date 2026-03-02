/**
 * @fileoverview FastContext - Pooled Request Context
 *
 * Minimal, high-performance context implementation designed for object pooling.
 * Lazy parsing strategy: only parse what's actually accessed.
 *
 * @module @gravito/core/engine
 */

import { RequestScopeManager } from '../Container/RequestScopeManager'
import type { FastRequest, FastContext as IFastContext } from './types'

// Bun runtime optimization: cache frequently used functions
const bunEscapeHTML = require('bun').escapeHTML

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
  private _routePattern?: string
  private _url: URL | null = null
  private _query: URLSearchParams | null = null
  private _headers: Record<string, string> | null = null
  private _cachedJson: unknown = undefined
  private _jsonParsed = false
  private _cachedText: string | undefined = undefined
  private _textParsed = false
  private _cachedFormData: FormData | undefined = undefined
  private _formDataParsed = false
  private _cachedQueries: Record<string, string | string[]> | null = null
  private _cachedCookies: Record<string, string> | null = null
  // Back-reference for release check optimization
  private _ctx: FastContext

  constructor(ctx: FastContext) {
    this._ctx = ctx
  }

  /**
   * Initialize for new request
   */
  init(
    request: Request,
    params: Record<string, string> = {},
    path = '',
    routePattern?: string
  ): this {
    this._request = request
    this._params = params
    this._path = path
    this._routePattern = routePattern
    this._url = null
    this._query = null
    this._headers = null
    this._cachedJson = undefined
    this._jsonParsed = false
    this._cachedText = undefined
    this._textParsed = false
    this._cachedFormData = undefined
    this._formDataParsed = false
    this._cachedQueries = null
    this._cachedCookies = null
    return this
  }

  /**
   * Reset for pooling
   */
  reset(): void {
    // Release references to allow GC
    this._request = undefined as any
    this._params = undefined as any
    this._url = null
    this._query = null
    this._headers = null
    this._cachedJson = undefined
    this._jsonParsed = false
    this._cachedText = undefined
    this._textParsed = false
    this._cachedFormData = undefined
    this._formDataParsed = false
    this._cachedQueries = null
    this._cachedCookies = null
  }

  private checkReleased(): void {
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

  get routePattern(): string | undefined {
    this.checkReleased()
    return this._routePattern
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
    // Return cached queries object if available
    if (this._cachedQueries !== null) {
      return this._cachedQueries
    }

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
    this._cachedQueries = result
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

  get cookies(): Record<string, string> {
    this.checkReleased()
    // Return cached cookies if available
    if (this._cachedCookies !== null) {
      return this._cachedCookies
    }

    // 1. Try Bun Native CookieMap (Injected in Bun.serve routes API)
    const nativeCookies = (this._request as any).cookies
    if (nativeCookies) {
      this._cachedCookies = nativeCookies
      return nativeCookies
    }

    // 2. Fallback: Parse from Header manually (Lazy Parsed)
    const cookieHeader = this._request.headers.get('cookie')
    if (!cookieHeader) {
      this._cachedCookies = {}
      return {}
    }

    // Manual parse implementation (optimized for speed)
    // Handles URL-encoded values and flexible separators ('; ' or ';')
    const cookies: Record<string, string> = {}
    const pairs = cookieHeader.split(/;\s*/)
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i]!
      const idx = pair.indexOf('=')
      if (idx > 0) {
        const name = pair.substring(0, idx)
        const value = pair.substring(idx + 1)
        // Decode value if URL-encoded, fallback to raw value on decode error
        try {
          cookies[name] = decodeURIComponent(value)
        } catch {
          cookies[name] = value
        }
      }
    }
    this._cachedCookies = cookies
    return cookies
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
    if (!this._textParsed) {
      this._cachedText = await this._request.text()
      this._textParsed = true
    }
    return this._cachedText!
  }

  async formData(): Promise<FormData> {
    this.checkReleased()
    if (!this._formDataParsed) {
      this._cachedFormData = await this._request.formData()
      this._formDataParsed = true
    }
    return this._cachedFormData!
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
  private _requestScope: RequestScopeManager | null = null // Request-scoped services

  /**
   * Initialize context for a new request
   *
   * This is called when acquiring from the pool.
   */
  init(
    request: Request,
    params: Record<string, string> = {},
    path = '',
    routePattern?: string
  ): this {
    this._isReleased = false
    this.req.init(request, params, path, routePattern)
    // Optimization: Creating new Headers is faster than iterating to delete in Bun
    // But for strict object pooling, we might want to reconsider.
    // For now, new Headers() is safe and fast enough.
    this._headers = new Headers()
    this._requestScope = new RequestScopeManager() // Initialize request scope
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
    this._store.clear()
    this._requestScope = null // Release reference for GC
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
    // Merge custom headers with Content-Type
    const headers = new Headers(this._headers)
    headers.set('Content-Type', 'application/json; charset=utf-8')
    return Response.json(data, { status, headers })
  }

  text(text: string, status = 200): Response {
    this.checkReleased()
    // Merge custom headers with Content-Type
    const headers = new Headers(this._headers)
    headers.set('Content-Type', 'text/plain; charset=utf-8')
    return new Response(text, { status, headers })
  }

  html(html: string, status = 200): Response {
    this.checkReleased()
    // Merge custom headers with Content-Type
    const headers = new Headers(this._headers)
    headers.set('Content-Type', 'text/html; charset=utf-8')
    return new Response(html, { status, headers })
  }

  /**
   * Escape HTML using Bun's SIMD-accelerated native implementation
   */
  escape(html: string): string {
    return bunEscapeHTML(html)
  }

  redirect(url: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
    this.checkReleased()
    return new Response(null, {
      status,
      headers: { Location: url },
    })
  }

  body(data: BodyInit | null, status = 200): Response {
    this.checkReleased()
    return new Response(data, {
      status,
      headers: this._headers,
    })
  }

  /**
   * Send high-performance binary response (e.g. CBOR, Protobuf)
   * Utilizing Bun's native ArrayBufferSink for zero-allocation construction.
   */
  binary(data: Uint8Array | ArrayBuffer, status = 200): Response {
    this.checkReleased()
    return new Response(data, {
      status,
      headers: { 'Content-Type': 'application/octet-stream' },
    })
  }

  stream(stream: any, status = 200): Response {
    this.checkReleased()
    // Direct streaming for zero-copy socket transfers
    return new Response(stream, {
      status,
      headers: { 'Content-Type': 'application/octet-stream' },
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
    this.checkReleased()
    // Minimal implementation of forwarding
    const url = new URL(this.req.url)
    const targetUrl = new URL(
      target.startsWith('http') ? target : `${url.protocol}//${target}${this.req.path}`
    )

    // Copy query params
    const searchParams = new URLSearchParams(url.search)
    searchParams.forEach((v, k) => {
      targetUrl.searchParams.set(k, v)
    })

    return fetch(targetUrl.toString(), {
      method: this.req.method,
      headers: this.req.raw.headers,
      body: this.req.method !== 'GET' && this.req.method !== 'HEAD' ? this.req.raw.body : null,
      // @ts-expect-error - Bun/Fetch specific
      duplex: 'half',
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Header Management
  // ─────────────────────────────────────────────────────────────────────────

  header(name: string): string | undefined
  header(name: string, value: string): void
  header(name: string, value?: string): string | undefined | undefined {
    this.checkReleased()
    if (value !== undefined) {
      this._headers.set(name, value)
      return
    }
    return this.req.header(name)
  }

  /**
   * Status code setter (no-op)
   *
   * Note: Since all response helpers accept a `status` parameter,
   * this method is not actively used. Status should be set directly
   * in the response helper call (e.g., `ctx.json({}, 201)`).
   */
  status(_code: number): void {
    this.checkReleased()
    // Status is set per-response, not stored on context
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Context Variables
  // ─────────────────────────────────────────────────────────────────────────

  private _store = new Map<string, any>()

  get<T>(key: string): T {
    return this._store.get(key)
  }

  set(key: string, value: any): void {
    this._store.set(key, value)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Request Scope Management
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the request-scoped service manager for this request.
   *
   * @returns The RequestScopeManager for this request.
   * @throws Error if called before init() or after reset().
   */
  requestScope(): RequestScopeManager {
    if (!this._requestScope) {
      throw new Error('RequestScope not initialized. Call init() first.')
    }
    return this._requestScope
  }

  /**
   * Resolve a request-scoped service (convenience method).
   *
   * @template T - The service type.
   * @param key - The service key for caching.
   * @param factory - Factory function to create the service.
   * @returns The cached or newly created service instance.
   */
  scoped<T>(key: string | symbol, factory: () => T): T {
    return this.requestScope().resolve(key, factory)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle helpers
  // ─────────────────────────────────────────────────────────────────────────

  public route: (name: string, params?: any, query?: any) => string = () => ''

  get native(): this {
    return this
  }
}
