import type { GravitoHandler, GravitoMiddleware, HttpMethod, ProxyOptions } from './http/types'
import type { PlanetCore } from './PlanetCore'
import { Route } from './Route'
/**
 * Type for Controller Class Constructor
 * @public
 */
export type ControllerClass = new (core: PlanetCore) => any
/**
 * Handler can be a function or [Class, 'methodName']
 * @public
 */
export type RouteHandler = GravitoHandler | [ControllerClass, string]
/**
 * Interface for FormRequest classes (from @gravito/impulse).
 * Used for duck-typing detection without hard dependency.
 */
export interface FormRequestLike {
  schema: unknown
  source?: string
  /**
   * Validate the request context.
   * @param ctx - The request context
   */
  validate?(ctx: unknown): Promise<{
    success: boolean
    data?: unknown
    error?: unknown
  }>
}
/**
 * Type for FormRequest class constructor
 * @public
 */
export type FormRequestClass = new () => FormRequestLike
/**
 * Symbol to mark FormRequest classes for fast identification.
 * FormRequest classes from @gravito/impulse should set this symbol.
 */
/**
 * Symbol to mark FormRequest classes for fast identification.
 * FormRequest classes from @gravito/impulse should set this symbol.
 * @public
 */
export declare const FORM_REQUEST_SYMBOL: unique symbol
/**
 * Options for route definitions
 * @public
 */
export interface RouteOptions {
  /** Route prefix path */
  prefix?: string
  /** Domain/Hostname constraint */
  domain?: string
  /** Middleware stack for the route */
  middleware?: GravitoMiddleware[]
}
/**
 * Common routing handler argument definition
 * @public
 */
export type RouteDefinitionArg =
  | FormRequestClass
  | RouteHandler
  | GravitoMiddleware
  | GravitoMiddleware[]
/**
 * Interface merging for HTTP routing methods to establish overloads
 * without duplicate bodies.
 * @public
 */
export interface RoutingMethods {
  get(path: string, handler: RouteHandler): Route
  get(path: string, request: FormRequestClass, handler: RouteHandler): Route
  get(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  post(path: string, handler: RouteHandler): Route
  post(path: string, request: FormRequestClass, handler: RouteHandler): Route
  post(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  put(path: string, handler: RouteHandler): Route
  put(path: string, request: FormRequestClass, handler: RouteHandler): Route
  put(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  delete(path: string, handler: RouteHandler): Route
  delete(path: string, request: FormRequestClass, handler: RouteHandler): Route
  delete(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  patch(path: string, handler: RouteHandler): Route
  patch(path: string, request: FormRequestClass, handler: RouteHandler): Route
  patch(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
}
/**
 * RouteGroup
 * Helper class for chained route configuration (prefix, domain, etc.)
 */
/**
 * RouteGroup
 * Helper class for chained route configuration (prefix, domain, etc.)
 * @public
 */
export interface RouteGroup extends RoutingMethods {}
export declare class RouteGroup {
  private router
  private options
  constructor(router: Router, options: RouteOptions)
  /**
   * Add a prefix to the current group
   */
  prefix(path: string): RouteGroup
  /**
   * Add middleware to the current group.
   * Accepts individual handlers or arrays of handlers.
   */
  middleware(...handlers: (GravitoMiddleware | GravitoMiddleware[])[]): RouteGroup
  /**
   * Define routes within this group
   */
  group(callback: (router: Router | RouteGroup) => void): void
  resource(name: string, controller: ControllerClass, options?: ResourceOptions): void
  /**
   * Register a route that forwards requests to another URL (Gateway Proxy).
   * @param method - HTTP method or 'all'
   * @param path - Local route path
   * @param target - Remote URL or base URL to forward to
   * @param options - Optional proxy options
   */
  forward(
    method: HttpMethod | HttpMethod[] | 'all',
    path: string,
    target: string,
    options?: ProxyOptions
  ): void
}
/**
 * Gravito Router
 *
 * Provides a Laravel-like fluent API for defining routes.
 * Supports:
 * - Controller-based routing: router.get('/', [HomeController, 'index'])
 * - Route groups with prefixes: router.prefix('/api').group(...)
 * - Domain-based routing: router.domain('api.app').group(...)
 * - Middleware chaining: router.middleware(auth).group(...)
 * - FormRequest validation: router.post('/users', StoreUserRequest, [UserController, 'store'])
 * - Inline Middleware: router.get('/users', authMiddleware, [UserController, 'index'])
 */
export interface Router extends RoutingMethods {}
export declare class Router {
  private core
  routes: Array<{
    method: string
    path: string
    domain?: string
  }>
  private dispatcher
  private namedRoutes
  private bindings
  /**
   * Compile all registered routes into a flat array for caching or manifest generation.
   * Optimized: O(n) complexity using Set for lookups instead of O(n²) with Array.some()
   */
  compile(): {
    method: string
    path: string
    name?: string
    domain?: string | undefined
  }[]
  /**
   * Register a named route
   */
  registerName(name: string, method: string, path: string, options?: RouteOptions): void
  /**
   * Generate a URL from a named route.
   *
   * Replaces route parameters (e.g., `:id`) with provided values and appends
   * query parameters to the URL.
   *
   * @param name - The name of the route.
   * @param params - Key-value pairs for route parameters.
   * @param query - Key-value pairs for query string parameters.
   * @returns The generated URL string.
   * @throws Error if the named route is not found or if a required parameter is missing.
   *
   * @example
   * ```typescript
   * const url = router.url('users.show', { id: 1 }, { tab: 'profile' });
   * // Result: "/users/1?tab=profile"
   * ```
   */
  url(
    name: string,
    params?: Record<string, string | number>,
    query?: Record<string, string | number | boolean | null | undefined>
  ): string
  /**
   * Export named routes as a serializable manifest (for caching).
   */
  exportNamedRoutes(): Record<
    string,
    {
      method: string
      path: string
      domain?: string
    }
  >
  /**
   * Load named routes from a manifest (for caching).
   */
  loadNamedRoutes(
    manifest: Record<
      string,
      {
        method: string
        path: string
        domain?: string
      }
    >
  ): void
  /**
   * Register a route model binding.
   *
   * Automatically resolves a route parameter to an object using the provided
   * resolver function. The resolved object is then available in the request context.
   *
   * @param param - The name of the route parameter to bind.
   * @param resolver - An async function that resolves the parameter value to an object.
   *
   * @example
   * ```typescript
   * router.bind('user', async (id) => await User.find(id));
   * ```
   */
  bind(param: string, resolver: (id: string) => Promise<unknown>): void
  /**
   * Register a route model binding for a Model class.
   */
  model(param: string, modelClass: unknown): void
  constructor(core: PlanetCore)
  /**
   * Start a route group with a prefix
   */
  prefix(path: string): RouteGroup
  /**
   * Start a route group with a domain constraint
   */
  domain(host: string): RouteGroup
  /**
   * Start a route group with middleware.
   * Accepts individual handlers or arrays of handlers.
   */
  middleware(...handlers: (GravitoMiddleware | GravitoMiddleware[])[]): RouteGroup
  /**
   * Register a route that forwards requests to another URL (Gateway Proxy).
   * @param method - HTTP method or 'all'
   * @param path - Local route path
   * @param target - Remote URL or base URL to forward to
   * @param options - Optional proxy options
   */
  forward(
    method: HttpMethod | HttpMethod[] | 'all',
    path: string,
    target: string,
    options?: ProxyOptions
  ): void
  /**
   * Register a resource route (RESTful).
   *
   * Automatically creates multiple routes for a resource (index, create, store,
   * show, edit, update, destroy) mapping to specific controller methods.
   *
   * @param name - The resource name (e.g., 'users').
   * @param controller - The controller class handling the resource.
   * @param options - Optional constraints (only/except) for resource actions.
   *
   * @example
   * ```typescript
   * router.resource('photos', PhotoController);
   * ```
   */
  resource(name: string, controller: ControllerClass, options?: ResourceOptions): void
  /**
   * Internal Request Registration
   */
  req(
    method: HttpMethod,
    path: string,
    requestOrHandlerOrMiddleware: RouteDefinitionArg,
    handler?: RouteHandler,
    options?: RouteOptions
  ): Route
}
/**
 * Standard RESTful resource action names.
 * @public
 */
export type ResourceAction = 'index' | 'create' | 'store' | 'show' | 'edit' | 'update' | 'destroy'
/**
 * Options for resource route registration.
 * @public
 */
export interface ResourceOptions {
  only?: ResourceAction[]
  except?: ResourceAction[]
}
