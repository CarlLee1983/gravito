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
/**
 * Lazy-parsed request wrapper
 *
 * Delays parsing of query params, headers, and body until accessed.
 * This is a key optimization for requests that don't need all data.
 */
declare class FastRequestImpl implements FastRequest {
  private _request
  private _params
  private _path
  private _routePattern?
  private _url
  private _query
  private _headers
  private _cachedJson
  private _jsonParsed
  private _cachedText
  private _textParsed
  private _cachedFormData
  private _formDataParsed
  private _cachedQueries
  private _cachedCookies
  private _ctx
  constructor(ctx: FastContext)
  /**
   * Initialize for new request
   */
  init(
    request: Request,
    params?: Record<string, string>,
    path?: string,
    routePattern?: string
  ): this
  /**
   * Reset for pooling
   */
  reset(): void
  private checkReleased
  get url(): string
  get method(): string
  get path(): string
  get routePattern(): string | undefined
  param(name: string): string | undefined
  params(): Record<string, string>
  private getUrl
  query(name: string): string | undefined
  queries(): Record<string, string | string[]>
  header(name: string): string | undefined
  headers(): Record<string, string>
  get cookies(): Record<string, string>
  json<T = unknown>(): Promise<T>
  text(): Promise<string>
  formData(): Promise<FormData>
  get raw(): Request
}
/**
 * FastContext - Pooled request context
 *
 * Designed for minimal memory allocation and maximum reuse.
 * All response helpers create Response objects directly without intermediate wrappers.
 */
export declare class FastContext implements IFastContext {
  readonly req: FastRequestImpl
  private _headers
  _isReleased: boolean
  private _requestScope
  /**
   * Initialize context for a new request
   *
   * This is called when acquiring from the pool.
   */
  init(
    request: Request,
    params?: Record<string, string>,
    path?: string,
    routePattern?: string
  ): this
  /**
   * Reset context for pooling (Cleanup)
   *
   * This is called when releasing back to the pool.
   * Implements "Deep-Reset Protocol" and "Release Guard".
   */
  reset(): void
  /**
   * Check if context is released
   */
  private checkReleased
  json<T>(data: T, status?: number): Response
  text(text: string, status?: number): Response
  html(html: string, status?: number): Response
  /**
   * Escape HTML using Bun's SIMD-accelerated native implementation
   */
  escape(html: string): string
  redirect(url: string, status?: 301 | 302 | 303 | 307 | 308): Response
  body(data: BodyInit | null, status?: number): Response
  /**
   * Send high-performance binary response (e.g. CBOR, Protobuf)
   * Utilizing Bun's native ArrayBufferSink for zero-allocation construction.
   */
  binary(data: Uint8Array | ArrayBuffer, status?: number): Response
  stream(stream: any, status?: number): Response
  notFound(message?: string): Response
  forbidden(message?: string): Response
  unauthorized(message?: string): Response
  badRequest(message?: string): Response
  forward(target: string, _options?: any): Promise<Response>
  header(name: string): string | undefined
  header(name: string, value: string): void
  /**
   * Status code setter (no-op)
   *
   * Note: Since all response helpers accept a `status` parameter,
   * this method is not actively used. Status should be set directly
   * in the response helper call (e.g., `ctx.json({}, 201)`).
   */
  status(_code: number): void
  private _store
  get<T>(key: string): T
  set(key: string, value: any): void
  /**
   * Get the request-scoped service manager for this request.
   *
   * @returns The RequestScopeManager for this request.
   * @throws Error if called before init() or after reset().
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
}
