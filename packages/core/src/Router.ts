import { ModelNotFoundException } from './exceptions/ModelNotFoundException'
import type { GravitoHandler, GravitoMiddleware, HttpMethod, ProxyOptions } from './http/types'
import type { PlanetCore } from './PlanetCore'
import { Route } from './Route'
import { ControllerDispatcher } from './router/ControllerDispatcher'
import { RequestValidator } from './router/RequestValidator'

/**
 * Type for Controller Class Constructor
 * @public
 */
export type ControllerClass = new (core: PlanetCore) => unknown

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
  validate?(ctx: unknown): Promise<{ success: boolean; data?: unknown; error?: unknown }>
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
export const FORM_REQUEST_SYMBOL = Symbol.for('gravito.formRequest')

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
  /**
   * Zod schemas for request validation and response documentation.
   * Used for OpenAPI generation.
   * @since 2.2.0
   */
  schema?: {
    body?: unknown
    params?: unknown
    query?: unknown
    response?: unknown
  }
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
// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: intentionally merged for dynamic mixins
export interface RouteGroup extends RoutingMethods {}
// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: intentionally merged for dynamic mixins
export class RouteGroup {
  constructor(
    private router: Router,
    private options: RouteOptions
  ) {}

  /**
   * Add a prefix to the current group
   */
  prefix(path: string): RouteGroup {
    return new RouteGroup(this.router, {
      ...this.options,
      prefix: (this.options.prefix || '') + path,
    })
  }

  /**
   * Add middleware to the current group.
   * Accepts individual handlers or arrays of handlers.
   */
  middleware(...handlers: (GravitoMiddleware | GravitoMiddleware[])[]): RouteGroup {
    const flattened = handlers.flat()
    return new RouteGroup(this.router, {
      ...this.options,
      middleware: [...(this.options.middleware || []), ...flattened],
    })
  }

  /**
   * Define routes within this group
   */
  group(callback: (router: Router | RouteGroup) => void): void {
    callback(this)
  }

  // Proxy HTTP methods to the main router with options merged
  // (Method implementations dynamically attached below)

  resource(name: string, controller: ControllerClass, options: ResourceOptions = {}): void {
    const actions: ResourceAction[] = [
      'index',
      'create',
      'store',
      'show',
      'edit',
      'update',
      'destroy',
    ]
    const map: Record<ResourceAction, { method: HttpMethod; path: string }> = {
      index: { method: 'get', path: `/${name}` },
      create: { method: 'get', path: `/${name}/create` },
      store: { method: 'post', path: `/${name}` },
      show: { method: 'get', path: `/${name}/:id` },
      edit: { method: 'get', path: `/${name}/:id/edit` },
      update: { method: 'put', path: `/${name}/:id` },
      destroy: { method: 'delete', path: `/${name}/:id` },
    }

    const allowed = actions.filter((action) => {
      if (options.only) {
        return options.only.includes(action)
      }
      if (options.except) {
        return !options.except.includes(action)
      }
      return true
    })

    for (const action of allowed) {
      const { method, path } = map[action]

      if (action === 'update') {
        this.router
          .req('put', path, [controller, action], undefined, this.options)
          .name(`${name}.${action}`)
        this.router.req('patch', path, [controller, action], undefined, this.options)
      } else {
        this.router
          .req(method, path, [controller, action], undefined, this.options)
          .name(`${name}.${action}`)
      }
    }
  }

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
  ): void {
    const handler: GravitoHandler = (ctx) => ctx.forward(target, options)
    const methods =
      method === 'all'
        ? (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as HttpMethod[])
        : Array.isArray(method)
          ? method
          : [method]

    for (const m of methods) {
      this.router.req(m, path, handler, undefined, this.options)
    }
  }
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
// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: intentionally merged for dynamic mixins
export interface Router extends RoutingMethods {}
// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: intentionally merged for dynamic mixins
export class Router {
  // Internal list of all registered routes (for scanning and debugging)
  public routes: Array<{ method: string; path: string; domain?: string; options?: RouteOptions }> =
    []

  private dispatcher: ControllerDispatcher

  private namedRoutes = new Map<
    string,
    { method: string; path: string; domain?: string | undefined; options?: RouteOptions }
  >()
  private bindings = new Map<string, (id: string) => Promise<unknown>>()

  /**
   * Compile all registered routes into a flat array for caching or manifest generation.
   * Optimized: O(n) complexity using Set for lookups instead of O(n²) with Array.some()
   */
  compile() {
    const compiled: Array<{
      method: string
      path: string
      name?: string
      domain?: string | undefined
      schema?: RouteOptions['schema']
    }> = []

    // Create a map of path+method to name for quick lookup
    const nameMap = new Map<string, { name: string; options?: RouteOptions }>()
    for (const [name, info] of this.namedRoutes) {
      nameMap.set(`${info.method.toUpperCase()}:${info.path}`, { name, options: info.options })
    }

    // Use Set to track compiled routes for O(1) lookup
    const compiledKeys = new Set<string>()

    // First pass: compile registered routes
    for (const route of this.routes) {
      const method = route.method.toUpperCase()
      const key = `${method}:${route.path}`

      compiledKeys.add(key)
      const namedInfo = nameMap.get(key)
      compiled.push({
        method,
        path: route.path,
        domain: route.domain,
        name: namedInfo?.name,
        schema: route.options?.schema || namedInfo?.options?.schema,
      })
    }

    // Second pass: include named routes that might not be in this.routes (e.g. from loaded manifest)
    // Now using O(1) Set lookup instead of O(n) Array.some()
    for (const [name, info] of this.namedRoutes) {
      const key = `${info.method.toUpperCase()}:${info.path}`

      if (!compiledKeys.has(key)) {
        compiled.push({
          name,
          method: info.method.toUpperCase(),
          path: info.path,
          domain: info.domain,
          schema: info.options?.schema,
        })
      }
    }

    return compiled
  }

  /**
   * Register a named route
   */
  registerName(name: string, method: string, path: string, options: RouteOptions = {}): void {
    const fullPath = (options.prefix || '') + path
    this.namedRoutes.set(name, {
      method: method.toUpperCase(),
      path: fullPath,
      domain: options.domain,
      options,
    })
  }

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
    params: Record<string, string | number> = {},
    query: Record<string, string | number | boolean | null | undefined> = {}
  ): string {
    const route = this.namedRoutes.get(name)
    if (!route) {
      throw new Error(`Named route '${name}' not found`)
    }

    let path = route.path
    path = path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
      const value = params[key]
      if (value === undefined || value === null) {
        throw new Error(`Missing route param '${key}' for route '${name}'`)
      }
      return encodeURIComponent(String(value))
    })

    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) {
        continue
      }
      qs.set(k, String(v))
    }

    const suffix = qs.toString()
    return suffix ? `${path}?${suffix}` : path
  }

  /**
   * Export named routes as a serializable manifest (for caching).
   */
  exportNamedRoutes(): Record<string, { method: string; path: string; domain?: string }> {
    return Object.fromEntries(this.namedRoutes.entries()) as Record<
      string,
      { method: string; path: string; domain?: string }
    >
  }

  /**
   * Load named routes from a manifest (for caching).
   */
  loadNamedRoutes(
    manifest: Record<string, { method: string; path: string; domain?: string }>
  ): void {
    this.namedRoutes = new Map(Object.entries(manifest))
  }

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
  bind(param: string, resolver: (id: string) => Promise<unknown>) {
    this.bindings.set(param, resolver)
  }

  /**
   * Register a route model binding for a Model class.
   */
  model(param: string, modelClass: unknown) {
    this.bind(param, async (id) => {
      // Assuming modelClass has a `find` method (Active Record pattern)
      if (
        modelClass &&
        typeof modelClass === 'object' &&
        'find' in modelClass &&
        typeof (modelClass as { find?: (id: string) => Promise<unknown> }).find === 'function'
      ) {
        const instance = await (modelClass as { find: (id: string) => Promise<unknown> }).find(id)
        if (!instance) {
          throw new ModelNotFoundException(param, String(id))
        }
        return instance
      }
      throw new Error(`Invalid model class for binding '${param}'`)
    })
  }

  constructor(private core: PlanetCore) {
    this.dispatcher = new ControllerDispatcher(core)

    // Register global middleware for bindings
    // Optimized: Only resolve bindings for params that exist in the current route
    this.core.adapter.useGlobal(async (c, next) => {
      // Early exit if no bindings registered
      if (this.bindings.size === 0) {
        return await next()
      }

      const routeModels = (c.get('routeModels') ?? {}) as Record<string, unknown>
      let hasResolvedModels = false

      // Iterate over request params (O(P)) instead of bindings (O(B))
      // This is significantly faster when there are many bindings but few params in current route
      const params = c.req.params()

      for (const [param, value] of Object.entries(params)) {
        const resolver = this.bindings.get(param)

        if (!resolver) {
          continue
        }

        const resolved = await resolver(value)
        routeModels[param] = resolved
        hasResolvedModels = true
      }

      // Only set routeModels if we actually resolved something
      if (hasResolvedModels) {
        c.set('routeModels', routeModels)
      }

      return await next()
    })
  }

  /**
   * Start a route group with a prefix
   */
  prefix(path: string): RouteGroup {
    return new RouteGroup(this, { prefix: path })
  }

  /**
   * Start a route group with a domain constraint
   */
  domain(host: string): RouteGroup {
    return new RouteGroup(this, { domain: host })
  }

  /**
   * Start a route group with middleware.
   * Accepts individual handlers or arrays of handlers.
   */
  middleware(...handlers: (GravitoMiddleware | GravitoMiddleware[])[]): RouteGroup {
    return new RouteGroup(this, { middleware: handlers.flat() })
  }

  // Implementation of get, post, put, delete, patch are dynamically mixed-in below.

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
  ): void {
    const handler: GravitoHandler = (ctx) => ctx.forward(target, options)
    const methods =
      method === 'all'
        ? (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as HttpMethod[])
        : Array.isArray(method)
          ? method
          : [method]

    for (const m of methods) {
      this.req(m, path, handler)
    }
  }

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
  resource(name: string, controller: ControllerClass, options: ResourceOptions = {}): void {
    const actions: ResourceAction[] = [
      'index',
      'create',
      'store',
      'show',
      'edit',
      'update',
      'destroy',
    ]
    const map: Record<ResourceAction, { method: HttpMethod; path: string }> = {
      index: { method: 'get', path: `/${name}` },
      create: { method: 'get', path: `/${name}/create` },
      store: { method: 'post', path: `/${name}` },
      show: { method: 'get', path: `/${name}/:id` },
      edit: { method: 'get', path: `/${name}/:id/edit` },
      update: { method: 'put', path: `/${name}/:id` },
      destroy: { method: 'delete', path: `/${name}/:id` },
    }

    const allowed = actions.filter((action) => {
      if (options.only) {
        return options.only.includes(action)
      }
      if (options.except) {
        return !options.except.includes(action)
      }
      return true
    })

    for (const action of allowed) {
      const { method, path } = map[action]

      if (action === 'update') {
        this.req('put', path, [controller, action]).name(`${name}.${action}`)
        this.req('patch', path, [controller, action])
      } else {
        this.req(method, path, [controller, action]).name(`${name}.${action}`)
      }
    }
  }

  /**
   * Internal Request Registration
   */
  req(
    method: HttpMethod,
    path: string,
    requestOrHandlerOrMiddleware: RouteDefinitionArg,
    handler?: RouteHandler,
    options: RouteOptions = {}
  ): Route {
    // 1. Resolve Path
    const fullPath = (options.prefix || '') + path

    // 2. Determine if FormRequest or Middleware is provided
    let formRequestMiddleware: GravitoMiddleware | null = null
    let routeMiddleware: GravitoMiddleware[] = []
    let finalRouteHandler: RouteHandler

    if (handler !== undefined) {
      // Three arguments: (path, middleware/request, handler)
      if (RequestValidator.isFormRequestClass(requestOrHandlerOrMiddleware)) {
        formRequestMiddleware = RequestValidator.formRequestToMiddleware(
          requestOrHandlerOrMiddleware
        )
      } else {
        // Assume middleware (single or array)
        const middleware = requestOrHandlerOrMiddleware as GravitoMiddleware | GravitoMiddleware[]

        if (Array.isArray(middleware)) {
          routeMiddleware = middleware
        } else {
          routeMiddleware = [middleware]
        }
      }
      finalRouteHandler = handler
    } else {
      // Two arguments: (path, handler)
      finalRouteHandler = requestOrHandlerOrMiddleware as RouteHandler
    }

    // 3. Resolve Handler (Controller vs Function)
    let resolvedHandler: GravitoHandler

    if (Array.isArray(finalRouteHandler)) {
      const [CtrlClass, methodName] = finalRouteHandler
      resolvedHandler = this.dispatcher.resolve(CtrlClass, methodName)
    } else {
      resolvedHandler = finalRouteHandler as GravitoHandler
    }

    // 4. Prepare Handlers Stack
    const handlers: (GravitoHandler | GravitoMiddleware)[] = []

    if (options.middleware) {
      handlers.push(...options.middleware)
    }
    if (formRequestMiddleware) {
      handlers.push(formRequestMiddleware)
    }
    if (routeMiddleware.length > 0) {
      handlers.push(...routeMiddleware)
    }
    handlers.push(resolvedHandler)

    // 5. Register with Adapter
    // If domain constraint exists, we wrap everything in a check
    if (options.domain) {
      // Prepend domain check
      const domainCheck: GravitoMiddleware = async (c, next) => {
        if (c.req.header('host') !== options.domain) {
          // If domain mismatch, return 404 immediately.
          // In a more complex router, this would backtrack, but for now this is correct.
          return c.text('Not Found', 404) as Response
        }
        await next()
      }

      // Prepend domain check
      handlers.unshift(domainCheck)
    }

    this.routes.push({
      method: method.toUpperCase(),
      path: fullPath,
      domain: options.domain,
      options,
    })
    this.core.adapter.route(
      method,
      fullPath,
      ...(handlers as (GravitoHandler | GravitoMiddleware)[])
    )

    return new Route(this, method, fullPath, options)
  }
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

const METHODS: ('get' | 'post' | 'put' | 'delete' | 'patch')[] = [
  'get',
  'post',
  'put',
  'delete',
  'patch',
]

METHODS.forEach((method) => {
  RouteGroup.prototype[method] = function (
    this: RouteGroup,
    path: string,
    arg1: RouteDefinitionArg,
    handler?: RouteHandler
  ) {
    return (this as unknown as { router: Router; options: RouteOptions }).router.req(
      method,
      path,
      arg1,
      handler,
      (this as unknown as { options: RouteOptions }).options
    )
  }

  Router.prototype[method] = function (
    this: Router,
    path: string,
    arg1: RouteDefinitionArg,
    handler?: RouteHandler
  ) {
    return this.req(method, path, arg1, handler)
  }
})
