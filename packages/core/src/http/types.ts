/**
 * @fileoverview Core HTTP Types for Gravito Framework
 *
 * These types provide a unified abstraction layer that decouples the framework
 * from any specific HTTP engine (Hono, Express, custom, etc.).
 *
 * @module @gravito/core/http
 * @since 2.0.0
 */

// Global type for ExecutionContext (Cloudflare Workers compatibility)
// This may be provided by the runtime environment
declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void
    passThroughOnException(): void
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Method Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard HTTP methods supported by Gravito
 */
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'

/**
 * HTTP status codes
 */
export type StatusCode = number

/**
 * Content-bearing HTTP status codes (excludes 1xx, 204, 304)
 */
export type ContentfulStatusCode = Exclude<StatusCode, 100 | 101 | 102 | 103 | 204 | 304>

// ─────────────────────────────────────────────────────────────────────────────
// Context Variable Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base context variables available in every request
 * Orbits can extend this interface via module augmentation
 *
 * @example
 * ```typescript
 * // Extending variables in your orbit:
 * declare module 'gravito-core' {
 *   interface GravitoVariables {
 *     myService: MyService
 *   }
 * }
 * ```
 */
export interface GravitoVariables {
  // Core services (always available when using PlanetCore)
  // These are populated by PlanetCore middleware

  /**
   * The PlanetCore instance
   * @remarks Always available in PlanetCore-managed contexts
   */
  core?: unknown // PlanetCore (avoid circular ref)

  /**
   * Logger instance
   */
  logger?: unknown // Logger

  /**
   * Configuration manager
   */
  config?: unknown // ConfigManager

  /**
   * Cookie jar for managing response cookies
   */
  cookieJar?: unknown // CookieJar

  /**
   * URL generator helper
   */
  route?: (
    name: string,
    params?: Record<string, unknown>,
    query?: Record<string, unknown>
  ) => string

  // Optional orbit-injected services
  // Each orbit extends this interface via module augmentation:
  //
  // declare module 'gravito-core' {
  //   interface GravitoVariables {
  //     myService: MyService
  //   }
  // }

  // Allow any additional properties for extensibility
  [key: string]: unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Abstraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validated request data targets
 */
export type ValidationTarget = 'json' | 'query' | 'param' | 'header' | 'form' | 'cookie'

/**
 * GravitoRequest - Unified request interface
 *
 * Provides a consistent API for accessing request data regardless of
 * the underlying HTTP engine.
 *
 * @example
 * ```typescript
 * const userId = ctx.req.param('id')
 * const search = ctx.req.query('q')
 * const body = await ctx.req.json<CreateUserDto>()
 * ```
 */
export interface GravitoRequest {
  // ─────────────────────────────────────────────
  // URL & Method
  // ─────────────────────────────────────────────

  /** Full request URL */
  readonly url: string

  /** HTTP method (uppercase) */
  readonly method: string

  /** Request path without query string */
  readonly path: string

  // ─────────────────────────────────────────────
  // Parameter Access
  // ─────────────────────────────────────────────

  /**
   * Get a route parameter value
   * @param name - Parameter name (e.g., 'id' for route '/users/:id')
   */
  param(name: string): string | undefined

  /**
   * Get all route parameters
   */
  params(): Record<string, string>

  /**
   * Get a query string parameter
   * @param name - Query parameter name
   */
  query(name: string): string | undefined

  /**
   * Get all query parameters
   */
  queries(): Record<string, string | string[]>

  /**
   * Get a request header value
   * @param name - Header name (case-insensitive)
   */
  header(name: string): string | undefined

  /**
   * Get all request headers
   */
  header(): Record<string, string>

  // ─────────────────────────────────────────────
  // Body Parsing
  // ─────────────────────────────────────────────

  /**
   * Parse request body as JSON
   * @throws {Error} If body is not valid JSON
   */
  json<T = unknown>(): Promise<T>

  /**
   * Parse request body as text
   */
  text(): Promise<string>

  /**
   * Parse request body as FormData
   */
  formData(): Promise<FormData>

  /**
   * Parse request body as ArrayBuffer
   */
  arrayBuffer(): Promise<ArrayBuffer>

  /**
   * Parse form data (urlencoded or multipart)
   */
  parseBody<T = unknown>(): Promise<T>

  /**
   * Get the raw Request object
   */
  readonly raw: Request

  // ─────────────────────────────────────────────
  // Validated Data (from FormRequest/Validator)
  // ─────────────────────────────────────────────

  /**
   * Get validated data from a specific source
   * @param target - The validation target
   * @throws {Error} If validation was not performed for this target
   */
  valid<T = unknown>(target: ValidationTarget): T
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Abstraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GravitoContext - Unified request context
 *
 * This interface encapsulates all HTTP request/response operations,
 * enabling seamless replacement of the underlying HTTP engine.
 *
 * @typeParam V - Context variables type
 *
 * @example
 * ```typescript
 * // In a controller
 * async show(ctx: GravitoContext) {
 *   const id = ctx.req.param('id')
 *   const user = await User.find(id)
 *   return ctx.json({ user })
 * }
 * ```
 */
export interface GravitoContext<V extends GravitoVariables = GravitoVariables> {
  // ─────────────────────────────────────────────
  // Request
  // ─────────────────────────────────────────────

  /** The incoming request */
  readonly req: GravitoRequest

  // ─────────────────────────────────────────────
  // Response Builders
  // ─────────────────────────────────────────────

  /**
   * Send a JSON response
   * @param data - Data to serialize as JSON
   * @param status - HTTP status code (default: 200)
   */
  json<T>(data: T, status?: ContentfulStatusCode): Response

  /**
   * Send a plain text response
   * @param text - Text content
   * @param status - HTTP status code (default: 200)
   */
  text(text: string, status?: ContentfulStatusCode): Response

  /**
   * Send an HTML response
   * @param html - HTML content
   * @param status - HTTP status code (default: 200)
   */
  html(html: string, status?: ContentfulStatusCode): Response

  /**
   * Send a redirect response
   * @param url - Target URL
   * @param status - Redirect status code (default: 302)
   */
  redirect(url: string, status?: 301 | 302 | 303 | 307 | 308): Response

  /**
   * Create a Response with no body
   * @param status - HTTP status code
   */
  body(data: BodyInit | null, status?: StatusCode): Response

  /**
   * Stream a response
   * @param stream - ReadableStream to send
   * @param status - HTTP status code (default: 200)
   */
  stream(stream: ReadableStream, status?: ContentfulStatusCode): Response

  // ─────────────────────────────────────────────
  // Headers
  // ─────────────────────────────────────────────

  /**
   * Set a response header
   * @param name - Header name
   * @param value - Header value
   * @param options - Options (append: true to add multiple values)
   */
  header(name: string, value: string, options?: { append?: boolean }): void

  /**
   * Get a request header
   * @param name - Header name (case-insensitive)
   */
  header(name: string): string | undefined

  /**
   * Set the response status code
   * @param code - HTTP status code
   */
  status(code: StatusCode): void

  // ─────────────────────────────────────────────
  // Context Variables (Dependency Injection)
  // ─────────────────────────────────────────────

  /**
   * Get a context variable
   * @param key - Variable key
   */
  get<K extends keyof V>(key: K): V[K]

  /**
   * Set a context variable
   * @param key - Variable key
   * @param value - Variable value
   */
  set<K extends keyof V>(key: K, value: V[K]): void

  // ─────────────────────────────────────────────
  // Execution Control
  // ─────────────────────────────────────────────

  /**
   * Get the execution context (for Cloudflare Workers, etc.)
   */
  readonly executionCtx?: ExecutionContext

  /**
   * Get environment bindings (for Cloudflare Workers, etc.)
   */
  readonly env?: Record<string, unknown>

  // ─────────────────────────────────────────────
  // Native Access (Escape Hatch)
  // ─────────────────────────────────────────────

  /**
   * Access the native context object from the underlying HTTP engine.
   *
   * ⚠️ WARNING: Using this ties your code to a specific adapter.
   * Prefer using the abstraction methods when possible.
   *
   * @example
   * ```typescript
   * // Only when absolutely necessary
   * const honoCtx = ctx.native as Context // Hono Context
   * ```
   */
  readonly native: unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler & Middleware Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Next function for middleware chain
 */
export type GravitoNext = () => Promise<void>

/**
 * GravitoHandler - Standard route handler type
 *
 * @typeParam V - Context variables type
 *
 * @example
 * ```typescript
 * const handler: GravitoHandler = async (ctx) => {
 *   return ctx.json({ message: 'Hello, World!' })
 * }
 * ```
 */
export type GravitoHandler<V extends GravitoVariables = GravitoVariables> = (
  ctx: GravitoContext<V>
) => Response | Promise<Response>

/**
 * GravitoMiddleware - Standard middleware type
 *
 * @typeParam V - Context variables type
 *
 * @example
 * ```typescript
 * const logger: GravitoMiddleware = async (ctx, next) => {
 *   console.log(`${ctx.req.method} ${ctx.req.path}`)
 *   await next()
 * }
 * ```
 */
export type GravitoMiddleware<V extends GravitoVariables = GravitoVariables> = (
  ctx: GravitoContext<V>,
  next: GravitoNext
) => Response | void | Promise<Response | void | undefined>

/**
 * Error handler type
 */
export type GravitoErrorHandler<V extends GravitoVariables = GravitoVariables> = (
  error: Error,
  ctx: GravitoContext<V>
) => Response | Promise<Response>

/**
 * Not found handler type
 */
export type GravitoNotFoundHandler<V extends GravitoVariables = GravitoVariables> = (
  ctx: GravitoContext<V>
) => Response | Promise<Response>
