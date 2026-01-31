/**
 * @fileoverview Gravito Core Engine Types
 *
 * Minimal, high-performance types for the standalone engine.
 * These are intentionally simpler than the full framework types.
 *
 * @module @gravito/core/engine
 */

import type { HttpMethod } from '../http/types'

// ─────────────────────────────────────────────────────────────────────────────
// Core Handler Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FastContext - The pooled request context
 */
export interface FastContext {
  /** Request accessor */
  readonly req: FastRequest

  /** Response helpers */
  json<T>(data: T, status?: number): Response
  text(text: string, status?: number): Response
  html(html: string, status?: number): Response
  redirect(url: string, status?: 301 | 302 | 303 | 307 | 308): Response
  body(data: BodyInit | null, status?: number): Response
  stream(stream: ReadableStream, status?: number): Response
  notFound(message?: string): Response
  forbidden(message?: string): Response
  unauthorized(message?: string): Response
  badRequest(message?: string): Response
  forward(target: string, options?: any): Promise<Response>

  /** Header management */
  header(name: string): string | undefined
  header(name: string, value: string): void
  status(code: number): void

  /** Context Variables */
  get<T>(key: string): T
  set(key: string, value: any): void

  /** Lifecycle helpers */
  route: (name: string, params?: any, query?: any) => string
  readonly native: any

  /** Internal initialization for pooling */
  init(
    request: Request,
    params?: Record<string, string>,
    path?: string,
    routePattern?: string
  ): this

  /** Internal cleanup for pooling */
  reset(): void
}

/**
 * FastRequest - Minimal request interface
 */
export interface FastRequest {
  /** Full URL */
  readonly url: string

  /** HTTP method */
  readonly method: string

  /** Path without query */
  readonly path: string

  /**
   * Route pattern (e.g., /users/:id) for metrics labeling
   * Prevents high cardinality issues in monitoring systems
   */
  readonly routePattern?: string

  /** Get route parameter */
  param(name: string): string | undefined

  /** Get all route parameters */
  params(): Record<string, string>

  /** Get query parameter */
  query(name: string): string | undefined

  /** Get all query parameters */
  queries(): Record<string, string | string[]>

  /** Get header */
  header(name: string): string | undefined

  /** Get all headers */
  headers(): Record<string, string>

  /** Parse JSON body */
  json<T = unknown>(): Promise<T>

  /** Parse text body */
  text(): Promise<string>

  /** Parse form data */
  formData(): Promise<FormData>

  /** Raw Request object */
  readonly raw: Request
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler Function Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Route handler function
 */
export type Handler = (ctx: FastContext) => Response | Promise<Response>

/**
 * Middleware function
 */
export type Middleware = (
  ctx: FastContext,
  next: () => Promise<Response | undefined>
) => Response | undefined | Promise<Response | undefined>

/**
 * Error handler function
 */
export type ErrorHandler = (error: Error, ctx: FastContext) => Response | Promise<Response>

/**
 * Not found handler function
 */
export type NotFoundHandler = (ctx: FastContext) => Response | Promise<Response>

// ─────────────────────────────────────────────────────────────────────────────
// Router Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Route metadata for middleware management
 */
export interface RouteMetadata {
  handler: Handler
  middleware: Middleware[]
  compiled?: CompiledHandler
  useMinimal?: boolean
  compiledVersion?: number
}

/**
 * Compiled handler function
 */
export type CompiledHandler = (ctx: FastContext) => Promise<Response>

/**
 * Route match result from router
 */
export interface RouteMatch {
  /** Matched handler */
  handler: Handler | null

  /** Extracted route parameters */
  params: Record<string, string>

  /** Middleware to execute */
  middleware: Middleware[]

  /** Optional stable route pattern for caching */
  routePattern?: string
}

/**
 * Internal route node
 */
export interface RouteNode {
  method: HttpMethod
  path: string
  handler: Handler
  middleware: Middleware[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Engine configuration options
 */
export interface EngineOptions {
  /** Context pool size (default: 256) */
  poolSize?: number

  /** Enable route compilation optimization (default: true) */
  enableAOT?: boolean

  /** Custom error handler */
  onError?: ErrorHandler

  /** Custom 404 handler */
  onNotFound?: NotFoundHandler
}
