import type { Handler, MiddlewareHandler } from 'hono'
import type { PlanetCore } from './PlanetCore'
import { Route } from './Route'
export type ControllerClass = new (core: PlanetCore) => any
export type RouteHandler = Handler | [ControllerClass, string]
/**
 * Interface for FormRequest classes (from @gravito/orbit-request).
 * Used for duck-typing detection without hard dependency.
 */
export interface FormRequestLike {
  schema: unknown
  source?: string
  validate?(ctx: unknown): Promise<{
    success: boolean
    data?: unknown
    error?: unknown
  }>
}
/**
 * Type for FormRequest class constructor
 */
export type FormRequestClass = new () => FormRequestLike
export interface RouteOptions {
  prefix?: string
  domain?: string
  middleware?: MiddlewareHandler[]
}
/**
 * RouteGroup
 * Helper class for chained route configuration (prefix, domain, etc.)
 */
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
  middleware(...handlers: (MiddlewareHandler | MiddlewareHandler[])[]): RouteGroup
  /**
   * Define routes within this group
   */
  group(callback: (router: Router | RouteGroup) => void): void
  get(path: string, handler: RouteHandler): Route
  get(path: string, request: FormRequestClass, handler: RouteHandler): Route
  post(path: string, handler: RouteHandler): Route
  post(path: string, request: FormRequestClass, handler: RouteHandler): Route
  put(path: string, handler: RouteHandler): Route
  put(path: string, request: FormRequestClass, handler: RouteHandler): Route
  delete(path: string, handler: RouteHandler): Route
  delete(path: string, request: FormRequestClass, handler: RouteHandler): Route
  patch(path: string, handler: RouteHandler): Route
  patch(path: string, request: FormRequestClass, handler: RouteHandler): Route
  resource(name: string, controller: ControllerClass, options?: ResourceOptions): void
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
 */
export declare class Router {
  private core
  private controllers
  private namedRoutes
  private bindings
  /**
   * Compile all registered routes into a flat array for caching or manifest generation.
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
   * @example
   * router.url('users.show', { id: 1 })
   * router.url('users.show', { id: 1 }, { tab: 'profile' })
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
   *
   * This is intentionally scoped to URL generation and introspection only.
   * It does not affect the HTTP router matcher (Hono still needs route registrations).
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
   */
  bind(param: string, resolver: (id: string) => Promise<any>): void
  /**
   * Register a route model binding for a Model class.
   */
  model(param: string, modelClass: any): void
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
  middleware(...handlers: (MiddlewareHandler | MiddlewareHandler[])[]): RouteGroup
  get(path: string, handler: RouteHandler): Route
  get(path: string, request: FormRequestClass, handler: RouteHandler): Route
  post(path: string, handler: RouteHandler): Route
  post(path: string, request: FormRequestClass, handler: RouteHandler): Route
  put(path: string, handler: RouteHandler): Route
  put(path: string, request: FormRequestClass, handler: RouteHandler): Route
  delete(path: string, handler: RouteHandler): Route
  delete(path: string, request: FormRequestClass, handler: RouteHandler): Route
  patch(path: string, handler: RouteHandler): Route
  patch(path: string, request: FormRequestClass, handler: RouteHandler): Route
  /**
   * Register a resource route (Laravel-style).
   * Creates index, create, store, show, edit, update, destroy routes.
   */
  resource(name: string, controller: ControllerClass, options?: ResourceOptions): void
  /**
   * Internal Request Registration
   */
  req(
    method: string,
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler,
    options?: RouteOptions
  ): Route
  /**
   * Resolve Controller Instance and Method
   */
  private resolveControllerHandler
}
export type ResourceAction = 'index' | 'create' | 'store' | 'show' | 'edit' | 'update' | 'destroy'
export interface ResourceOptions {
  only?: ResourceAction[]
  except?: ResourceAction[]
}
//# sourceMappingURL=Router.d.ts.map
