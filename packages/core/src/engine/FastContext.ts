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
  private _url: URL = new URL('http://localhost') // Reuse this object
  private _query: URLSearchParams | null = null
  private _headers: Record<string, string> | null = null

  /**
   * Reset for pooling
   */
  reset(request: Request, params: Record<string, string> = {}): void {
    this._request = request
    this._params = params
    // Reuse URL object instead of creating new one
    this._url.href = request.url
    this._query = null
    this._headers = null
  }

  get url(): string {
    return this._request.url
  }

  get method(): string {
    return this._request.method
  }

  get path(): string {
    return this._url.pathname
  }

  param(name: string): string | undefined {
    return this._params[name]
  }

  params(): Record<string, string> {
    return { ...this._params }
  }

  query(name: string): string | undefined {
    if (!this._query) {
      this._query = this._url.searchParams
    }
    return this._query.get(name) ?? undefined
  }

  queries(): Record<string, string | string[]> {
    if (!this._query) {
      this._query = this._url.searchParams
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
    return this._request.headers.get(name) ?? undefined
  }

  headers(): Record<string, string> {
    if (!this._headers) {
      this._headers = {}
      for (const [key, value] of this._request.headers.entries()) {
        this._headers[key] = value
      }
    }
    return { ...this._headers }
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
 * FastContext - Pooled request context
 *
 * Designed for minimal memory allocation and maximum reuse.
 * All response helpers create Response objects directly without intermediate wrappers.
 */
export class FastContext implements IFastContext {
  private _req: FastRequestImpl = new FastRequestImpl()
  // private _statusCode = 200
  private _headers = new Headers() // Reuse this object

  /**
   * Reset context for pooling
   *
   * This is called when acquiring from the pool.
   * Must clear all state from previous request.
   */
  reset(request: Request, params: Record<string, string> = {}): this {
    this._req.reset(request, params)
    // this._statusCode = 200
    // Optimization: Creating new Headers is faster than iterating to delete
    this._headers = new Headers()
    return this
  }

  get req(): FastRequest {
    return this._req
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Response Helpers
  // ─────────────────────────────────────────────────────────────────────────

  json<T>(data: T, status = 200): Response {
    this._headers.set('Content-Type', 'application/json; charset=utf-8')
    return new Response(JSON.stringify(data), {
      status,
      headers: this._headers,
    })
  }

  text(text: string, status = 200): Response {
    this._headers.set('Content-Type', 'text/plain; charset=utf-8')
    return new Response(text, {
      status,
      headers: this._headers,
    })
  }

  html(html: string, status = 200): Response {
    this._headers.set('Content-Type', 'text/html; charset=utf-8')
    return new Response(html, {
      status,
      headers: this._headers,
    })
  }

  redirect(url: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
    this._headers.set('Location', url)
    return new Response(null, {
      status,
      headers: this._headers,
    })
  }

  body(data: BodyInit | null, status = 200): Response {
    return new Response(data, {
      status,
      headers: this._headers,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Header Management
  // ─────────────────────────────────────────────────────────────────────────

  header(name: string, value: string): void {
    this._headers.set(name, value)
  }

  status(_code: number): void {
    // this._statusCode = code
  }
}
