import { ModelNotFoundException } from './exceptions/ModelNotFoundException'
import type { GravitoHandler, GravitoMiddleware, HttpMethod } from './http/types'
import type { PlanetCore } from './PlanetCore'
import { Route } from './Route'

// Type for Controller Class Constructor
export type ControllerClass = new (core: PlanetCore) => Record<string, unknown>

// Handler can be a function or [Class, 'methodName']
export type RouteHandler = GravitoHandler | [ControllerClass, string]

/**
 * Interface for FormRequest classes (from @gravito/impulse).
 * Used for duck-typing detection without hard dependency.
 */
export interface FormRequestLike {
  schema: unknown
  source?: string
  validate?(ctx: unknown): Promise<{ success: boolean; data?: unknown; error?: unknown }>
}

/**
 * Type for FormRequest class constructor
 */
export type FormRequestClass = new () => FormRequestLike

/**
 * Check if a value is a FormRequest class
 */
function isFormRequestClass(value: unknown): value is FormRequestClass {
  if (typeof value !== 'function') {
    return false
  }
  try {
    const instance = new (value as new () => unknown)()
    return (
      instance !== null &&
      typeof instance === 'object' &&
      'schema' in instance &&
      'validate' in instance &&
      typeof (instance as FormRequestLike).validate === 'function'
    )
  } catch {
    return false
  }
}

/**
 * Convert a FormRequest class to middleware
 */
function formRequestToMiddleware(RequestClass: FormRequestClass): GravitoMiddleware {
  return async (ctx, next) => {
    const request = new RequestClass()
    if (typeof request.validate !== 'function') {
      throw new Error('Invalid FormRequest: validate() is missing.')
    }
    const result = await request.validate(ctx)

    if (!result.success) {
      // Determine status code based on error type
      const errorCode = (result.error as { error?: { code?: string } })?.error?.code
      const status = errorCode === 'AUTHORIZATION_ERROR' ? 403 : 422
      return ctx.json(result.error, status)
    }

    // Store validated data in context
    ctx.set('validated', result.data)
    await next()
    return undefined
  }
}

export interface RouteOptions {
  prefix?: string
  domain?: string
  middleware?: GravitoMiddleware[]
}

/**
 * RouteGroup
 * Helper class for chained route configuration (prefix, domain, etc.)
 */
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
  get(path: string, handler: RouteHandler): Route
  get(path: string, request: FormRequestClass, handler: RouteHandler): Route
  get(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.router.req('get', path, requestOrHandler, handler, this.options)
  }

  post(path: string, handler: RouteHandler): Route
  post(path: string, request: FormRequestClass, handler: RouteHandler): Route
  post(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.router.req('post', path, requestOrHandler, handler, this.options)
  }

  put(path: string, handler: RouteHandler): Route
  put(path: string, request: FormRequestClass, handler: RouteHandler): Route
  put(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.router.req('put', path, requestOrHandler, handler, this.options)
  }

  delete(path: string, handler: RouteHandler): Route
  delete(path: string, request: FormRequestClass, handler: RouteHandler): Route
  delete(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.router.req('delete', path, requestOrHandler, handler, this.options)
  }

  patch(path: string, handler: RouteHandler): Route
  patch(path: string, request: FormRequestClass, handler: RouteHandler): Route
  patch(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.router.req('patch', path, requestOrHandler, handler, this.options)
  }

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
export class Router {
  // Internal list of all registered routes (for scanning and debugging)
  public routes: Array<{ method: string; path: string; domain?: string }> = []

  // Singleton cache for controllers
  private controllers = new Map<ControllerClass, Record<string, unknown>>()

  private namedRoutes = new Map<
    string,
    { method: string; path: string; domain?: string | undefined }
  >()
  private bindings = new Map<string, (id: string) => Promise<unknown>>()

  /**
   * Compile all registered routes into a flat array for caching or manifest generation.
   */
  compile() {
    const compiled: Array<{
      method: string
      path: string
      name?: string
      domain?: string | undefined
    }> = []

    // Create a map of path+method to name for quick lookup
    const nameMap = new Map<string, string>()
    for (const [name, info] of this.namedRoutes) {
      nameMap.set(`${info.method.toUpperCase()}:${info.path}`, name)
    }

    for (const route of this.routes) {
      const method = route.method.toUpperCase()
      compiled.push({
        method,
        path: route.path,
        domain: route.domain,
        name: nameMap.get(`${method}:${route.path}`),
      })
    }

    // Also include named routes that might not be in this.routes (e.g. from loaded manifest)
    // but only if they are not already there
    for (const [name, info] of this.namedRoutes) {
      const exists = compiled.some(
        (r) => r.method === info.method.toUpperCase() && r.path === info.path
      )
      if (!exists) {
        compiled.push({
          name,
          method: info.method.toUpperCase(),
          path: info.path,
          domain: info.domain,
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
    })
  }

  /**
   * Generate a URL from a named route.
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
          throw new Error('ModelNotFound') // Will be caught by 404 handler if we handle it
        }
        return instance
      }
      throw new Error(`Invalid model class for binding '${param}'`)
    })
  }

  constructor(private core: PlanetCore) {
    // Register global middleware for bindings
    this.core.adapter.useGlobal(async (c, next) => {
      const routeModels = (c.get('routeModels') ?? {}) as Record<string, unknown>

      // Iterate over registered bindings
      // TODO: Optimize by checking which params are actually in the current route match
      for (const [param, resolver] of this.bindings) {
        const value = c.req.param(param)
        if (value) {
          try {
            const resolved = await resolver(value)
            routeModels[param] = resolved
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : undefined
            if (message === 'ModelNotFound') {
              throw new ModelNotFoundException(param, value)
            }
            throw err
          }
        }
      }

      c.set('routeModels', routeModels)
      await next()
      return undefined
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

  /**
   * Register a GET route.
   *
   * @param path - The URL path for the route.
   * @param handler - The handler function or controller method.
   * @returns The registered Route instance for chaining.
   *
   * @example
   * ```typescript
   * router.get('/users', [UserController, 'index']);
   * ```
   */
  get(path: string, handler: RouteHandler): Route
  /**
   * Register a GET route with a FormRequest for validation.
   *
   * @param path - The URL path.
   * @param request - The FormRequest class for validation.
   * @param handler - The handler function or controller method.
   *
   * @example
   * ```typescript
   * router.get('/search', SearchRequest, [Controller, 'search']);
   * ```
   */
  get(path: string, request: FormRequestClass, handler: RouteHandler): Route
  get(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.req('get', path, requestOrHandler, handler)
  }

  /**
   * Register a POST route.
   *
   * @param path - The URL path.
   * @param handler - The handler function or controller method.
   * @returns The registered Route instance.
   *
   * @example
   * ```typescript
   * router.post('/users', [UserController, 'store']);
   * ```
   */
  post(path: string, handler: RouteHandler): Route
  /**
   * Register a POST route with validation.
   *
   * @param path - The URL path.
   * @param request - The FormRequest class.
   * @param handler - The handler.
   *
   * @example
   * ```typescript
   * router.post('/users', StoreUserRequest, [UserController, 'store']);
   * ```
   */
  post(path: string, request: FormRequestClass, handler: RouteHandler): Route
  post(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.req('post', path, requestOrHandler, handler)
  }

  /**
   * Register a PUT route.
   *
   * @param path - The URL path.
   * @param handler - The handler function.
   * @returns The registered Route instance.
   */
  put(path: string, handler: RouteHandler): Route
  put(path: string, request: FormRequestClass, handler: RouteHandler): Route
  put(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.req('put', path, requestOrHandler, handler)
  }

  /**
   * Register a DELETE route.
   *
   * @param path - The URL path.
   * @param handler - The handler function.
   * @returns The registered Route instance.
   */
  delete(path: string, handler: RouteHandler): Route
  delete(path: string, request: FormRequestClass, handler: RouteHandler): Route
  delete(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.req('delete', path, requestOrHandler, handler)
  }

  /**
   * Register a PATCH route.
   *
   * @param path - The URL path.
   * @param handler - The handler function.
   * @returns The registered Route instance.
   */
  patch(path: string, handler: RouteHandler): Route
  patch(path: string, request: FormRequestClass, handler: RouteHandler): Route
  patch(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.req('patch', path, requestOrHandler, handler)
  }

  /**
   * Register a resource route (Laravel-style).
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
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler,
    options: RouteOptions = {}
  ): Route {
    // 1. Resolve Path
    const fullPath = (options.prefix || '') + path

    // 2. Determine if FormRequest is provided
    let formRequestMiddleware: GravitoMiddleware | null = null
    let finalRouteHandler: RouteHandler

    if (handler !== undefined) {
      // FormRequest + Handler pattern
      if (isFormRequestClass(requestOrHandler)) {
        formRequestMiddleware = formRequestToMiddleware(requestOrHandler)
      }
      finalRouteHandler = handler
    } else {
      // Traditional pattern
      finalRouteHandler = requestOrHandler as RouteHandler
    }

    // 3. Resolve Handler (Controller vs Function)
    let resolvedHandler: GravitoHandler

    if (Array.isArray(finalRouteHandler)) {
      const [CtrlClass, methodName] = finalRouteHandler
      resolvedHandler = this.resolveControllerHandler(CtrlClass, methodName)
    } else {
      resolvedHandler = finalRouteHandler
    }

    // 4. Prepare Handlers Stack
    const handlers: (GravitoHandler | GravitoMiddleware)[] = []

    if (options.middleware) {
      handlers.push(...options.middleware)
    }
    if (formRequestMiddleware) {
      handlers.push(formRequestMiddleware)
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
          return c.text('Not Found', 404) as any
        }
        await next()
      }

      // Prepend domain check
      handlers.unshift(domainCheck)
    }

    this.routes.push({ method: method.toUpperCase(), path: fullPath, domain: options.domain })
    this.core.adapter.route(method, fullPath, ...(handlers as any[]))

    return new Route(this, method, fullPath, options)
  }

  /**
   * Resolve Controller Instance and Method
   */
  private resolveControllerHandler(CtrlClass: ControllerClass, methodName: string): GravitoHandler {
    let instance = this.controllers.get(CtrlClass)
    if (!instance) {
      instance = new CtrlClass(this.core)
      this.controllers.set(CtrlClass, instance)
    }

    const handler = instance[methodName]
    if (typeof handler !== 'function') {
      throw new Error(`Method '${methodName}' not found in controller '${CtrlClass.name}'`)
    }

    // The handler in the controller should match GravitoHandler signature (ctx) => Response
    // If it expects (ctx, next), it's middleware.
    // Usually controllers are final endpoints.
    return handler.bind(instance) as GravitoHandler
  }
}

export type ResourceAction = 'index' | 'create' | 'store' | 'show' | 'edit' | 'update' | 'destroy'

export interface ResourceOptions {
  only?: ResourceAction[]
  except?: ResourceAction[]
}
