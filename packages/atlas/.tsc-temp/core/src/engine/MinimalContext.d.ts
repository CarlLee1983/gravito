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
import { RequestScopeManager } from '../Container/RequestScopeManager'
import type { FastRequest, FastContext as IFastContext } from './types'
/**
 * Minimal request wrapper
 */
declare class MinimalRequest implements FastRequest {
  private readonly _request
  private readonly _params
  private readonly _path
  private readonly _routePattern?
  private _searchParams
  private _cachedQueries
  private _cachedJsonPromise
  private _cachedTextPromise
  private _cachedFormDataPromise
  constructor(
    _request: Request,
    _params: Record<string, string>,
    _path: string,
    _routePattern?: string
  )
  get url(): string
  get method(): string
  get path(): string
  get routePattern(): string | undefined
  param(name: string): string | undefined
  params(): Record<string, string>
  /**
   * Lazy-initialize searchParams, only parse once
   */
  private getSearchParams
  query(name: string): string | undefined
  queries(): Record<string, string | string[]>
  header(name: string): string | undefined
  headers(): Record<string, string>
  json<T = unknown>(): Promise<T>
  text(): Promise<string>
  formData(): Promise<FormData>
  get cookies(): Record<string, string>
  get raw(): Request
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
export declare class MinimalContext implements IFastContext {
  readonly req: MinimalRequest
  private _resHeaders
  private _requestScope
  constructor(request: Request, params: Record<string, string>, path: string, routePattern?: string)
  private getHeaders
  json<T>(data: T, status?: number): Response
  text(text: string, status?: number): Response
  html(html: string, status?: number): Response
  redirect(url: string, status?: 301 | 302 | 303 | 307 | 308): Response
  body(data: BodyInit | null, status?: number): Response
  header(name: string): string | undefined
  header(name: string, value: string): void
  status(_code: number): void
  stream(stream: ReadableStream, status?: number): Response
  notFound(message?: string): Response
  forbidden(message?: string): Response
  unauthorized(message?: string): Response
  badRequest(message?: string): Response
  forward(target: string, _options?: any): Promise<Response>
  escape(html: string): string
  get<T>(_key: string): T
  set(_key: string, _value: any): void
  /**
   * Get the request-scoped service manager for this request.
   *
   * @returns The RequestScopeManager for this request.
   */
  requestScope(): RequestScopeManager
  /**
   * Resolve a request-scoped service (convenience method).
   *
   * @template T - The service type.
   * @param key - The service key for caching.
   * @param factory - Factory function to create the service.
   * @returns The cached or newly created service instance.
   */
  scoped<T>(key: string | symbol, factory: () => T): T
  route: (name: string, params?: any, query?: any) => string
  get native(): this
  init(_request: Request, _params?: Record<string, string>, _path?: string): this
  reset(): void
}
