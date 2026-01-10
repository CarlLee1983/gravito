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

  /** Header management */
  header(name: string, value: string): void
  status(code: number): void

  /** Internal reset for pooling */
  reset(request: Request, params?: Record<string, string>): this
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
export type Middleware = (ctx: FastContext, next: () => Promise<void>) => void | Promise<void>

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
 * Route match result from router
 */
export interface RouteMatch {
  /** Matched handler */
  handler: Handler | null

  /** Extracted route parameters */
  params: Record<string, string>

  /** Middleware to execute */
  middleware: Middleware[]
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
