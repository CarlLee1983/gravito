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
  constructor(
    private readonly _request: Request,
    private readonly _params: Record<string, string>,
    private readonly _path: string
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

  param(name: string): string | undefined {
    return this._params[name]
  }

  params(): Record<string, string> {
    return { ...this._params }
  }

  query(name: string): string | undefined {
    // Lazy parse - only when accessed
    const url = new URL(this._request.url)
    return url.searchParams.get(name) ?? undefined
  }

  queries(): Record<string, string | string[]> {
    const url = new URL(this._request.url)
    const result: Record<string, string | string[]> = {}
    for (const [key, value] of url.searchParams.entries()) {
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
  private readonly _req: MinimalRequest
  private _resHeaders: Record<string, string> = {}

  constructor(request: Request, params: Record<string, string>, path: string) {
    this._req = new MinimalRequest(request, params, path)
  }

  get req(): FastRequest {
    return this._req
  }

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

  header(name: string, value: string): void {
    this._resHeaders[name] = value
  }

  status(_code: number): void {
    // Status is set per response helper call, not stored on context
  }

  // Required for interface compatibility
  reset(_request: Request, _params?: Record<string, string>): this {
    throw new Error('MinimalContext does not support reset. Create a new instance instead.')
  }
}
