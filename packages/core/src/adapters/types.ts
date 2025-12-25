/**
 * @fileoverview HTTP Adapter Interface for Gravito Framework
 *
 * This module defines the contract that all HTTP adapters must implement.
 * By programming to this interface, Gravito can swap out the underlying
 * HTTP engine without changing application code.
 *
 * @module @gravito/core/adapters
 * @since 2.0.0
 */

import type {
  GravitoContext,
  GravitoErrorHandler,
  GravitoHandler,
  GravitoMiddleware,
  GravitoNotFoundHandler,
  GravitoVariables,
  HttpMethod,
} from '../http/types'

// ─────────────────────────────────────────────────────────────────────────────
// Adapter Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration options for HTTP adapters
 */
export interface AdapterConfig {
  /**
   * Base path prefix for all routes
   * @default ''
   */
  basePath?: string

  /**
   * Whether to enable strict routing (trailing slashes matter)
   * @default false
   */
  strictRouting?: boolean

  /**
   * Custom options passed to the underlying HTTP engine
   */
  engineOptions?: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Definition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Route definition structure
 */
export interface RouteDefinition {
  method: HttpMethod
  path: string
  handlers: (GravitoHandler | GravitoMiddleware)[]
  name?: string
  middleware?: GravitoMiddleware[]
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Adapter Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HttpAdapter - The core interface for HTTP engine abstraction
 *
 * Any HTTP engine (Photon, Express, Fastify, custom Bun implementation)
 * must implement this interface to be usable with Gravito.
 *
 * @typeParam V - Context variables type
 *
 * @example
 * ```typescript
 * // Using the default Photon adapter
 * import { PhotonAdapter } from '@gravito/core/adapters'
 *
 * const core = new PlanetCore({
 *   adapter: new PhotonAdapter()
 * })
 *
 * // Using a custom adapter
 * import { BunNativeAdapter } from '@gravito/adapter-bun'
 *
 * const core = new PlanetCore({
 *   adapter: new BunNativeAdapter()
 * })
 * ```
 */
export interface HttpAdapter<V extends GravitoVariables = GravitoVariables> {
  // ─────────────────────────────────────────────
  // Identity
  // ─────────────────────────────────────────────

  /**
   * Adapter name for identification
   * @example 'hono', 'bun-native', 'express'
   */
  readonly name: string

  /**
   * Adapter version
   */
  readonly version: string

  // ─────────────────────────────────────────────
  // Native Access
  // ─────────────────────────────────────────────

  /**
   * Access the underlying native HTTP engine instance.
   *
   * ⚠️ WARNING: Using this ties your code to a specific adapter.
   *
   * @example
   * ```typescript
   * // For Photon adapter
   * const photonApp = adapter.native as Photon
   *
   * // For custom Bun adapter
   * const bunApp = adapter.native as BunApp
   * ```
   */
  readonly native: unknown

  // ─────────────────────────────────────────────
  // Routing
  // ─────────────────────────────────────────────

  /**
   * Register a route with the adapter
   *
   * @param method - HTTP method
   * @param path - Route path (may include parameters like ':id')
   * @param handlers - One or more handlers for this route (handlers or middleware)
   */
  route(
    method: HttpMethod,
    path: string,
    ...handlers: (GravitoHandler<V> | GravitoMiddleware<V>)[]
  ): void

  /**
   * Register multiple routes at once
   *
   * @param routes - Array of route definitions
   */
  routes(routes: RouteDefinition[]): void

  /**
   * Register a middleware for a path
   *
   * @param path - Path pattern to match
   * @param middleware - One or more middleware functions
   */
  use(path: string, ...middleware: GravitoMiddleware<V>[]): void

  /**
   * Register a global middleware (applied to all routes)
   *
   * @param middleware - Middleware function
   */
  useGlobal(...middleware: GravitoMiddleware<V>[]): void

  /**
   * Mount a sub-adapter at a path
   *
   * @param path - Mount path
   * @param subAdapter - The adapter to mount
   */
  mount(path: string, subAdapter: HttpAdapter<V>): void

  // ─────────────────────────────────────────────
  // Error Handling
  // ─────────────────────────────────────────────

  /**
   * Set the error handler
   *
   * @param handler - Error handler function
   */
  onError(handler: GravitoErrorHandler<V>): void

  /**
   * Set the not-found handler
   *
   * @param handler - Not-found handler function
   */
  onNotFound(handler: GravitoNotFoundHandler<V>): void

  // ─────────────────────────────────────────────
  // Request Handling
  // ─────────────────────────────────────────────

  /**
   * The main fetch handler for serving requests.
   *
   * This is compatible with `Bun.serve()`, Cloudflare Workers,
   * and other fetch-based runtimes.
   *
   * @param request - Incoming HTTP request
   * @param server - Optional server context (Bun.Server, etc.)
   * @returns HTTP response
   *
   * @example
   * ```typescript
   * // With Bun.serve
   * Bun.serve({
   *   port: 3000,
   *   fetch: adapter.fetch
   * })
   * ```
   */
  fetch(request: Request, server?: unknown): Response | Promise<Response>

  // ─────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────

  /**
   * Initialize the adapter
   *
   * Called during PlanetCore.boot()
   */
  init?(): void | Promise<void>

  /**
   * Cleanup resources
   *
   * Called during graceful shutdown
   */
  shutdown?(): void | Promise<void>

  // ─────────────────────────────────────────────
  // Context Factory
  // ─────────────────────────────────────────────

  /**
   * Create a GravitoContext from a raw request.
   *
   * This is used internally for testing and advanced scenarios.
   *
   * @param request - Raw HTTP request
   * @returns Gravito context
   */
  createContext(request: Request): GravitoContext<V>
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Factory function type for creating adapters
 */
export type AdapterFactory<V extends GravitoVariables = GravitoVariables> = (
  config?: AdapterConfig
) => HttpAdapter<V>

// ─────────────────────────────────────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a value is an HttpAdapter
 */
export function isHttpAdapter(value: unknown): value is HttpAdapter {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'fetch' in value &&
    typeof (value as HttpAdapter).fetch === 'function' &&
    'route' in value &&
    typeof (value as HttpAdapter).route === 'function'
  )
}
