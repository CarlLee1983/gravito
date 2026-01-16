import { ModelNotFoundException } from './exceptions/ModelNotFoundException'
import type { GravitoHandler, GravitoMiddleware, HttpMethod, ProxyOptions } from './http/types'
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
 * Symbol to mark FormRequest classes for fast identification.
 * FormRequest classes from @gravito/impulse should set this symbol.
 */
export const FORM_REQUEST_SYMBOL = Symbol.for('gravito.formRequest')

/**
 * WeakMap cache for FormRequest class detection results.
 * Avoids re-instantiating classes on repeated checks.
 */
// biome-ignore lint/complexity/noBannedTypes: generic Function type needed here
const formRequestCache = new WeakMap<Function, boolean>()

/**
 * WeakMap cache for FormRequest instances.
 * Stores singleton instances to avoid re-instantiation on every request.
 * Using WeakMap allows garbage collection when the class is no longer referenced.
 */
const formRequestInstances = new WeakMap<FormRequestClass, FormRequestLike>()

/**
 * Check if a value is a FormRequest class.
 * Optimized with Symbol check, prototype check, and caching.
 */
function isFormRequestClass(value: unknown): value is FormRequestClass {
  if (typeof value !== 'function') {
    return false
  }

  // Fast path 1: Check for Symbol marker (set by @gravito/impulse)
  if ((value as { [FORM_REQUEST_SYMBOL]?: boolean })[FORM_REQUEST_SYMBOL] === true) {
    return true
  }

  // Fast path 2: Filter out arrow functions (middleware)
  // Arrow functions do not have a prototype property
  if (!value.prototype) {
    return false
  }

  // Check cache to avoid re-computation
  const cached = formRequestCache.get(value)
  if (cached !== undefined) {
    return cached
  }

  // Slow path: Duck-type check with instantiation
  try {
    // Check prototype first to avoid instantiation if possible
    if ('validate' in value.prototype && typeof value.prototype.validate === 'function') {
      formRequestCache.set(value, true)
      return true
    }

    const instance = new (value as new () => unknown)()
    const isFormRequest =
      instance !== null &&
      typeof instance === 'object' &&
      'schema' in instance &&
      'validate' in instance &&
      typeof (instance as FormRequestLike).validate === 'function'

    // Cache the result
    formRequestCache.set(value, isFormRequest)
    return isFormRequest
  } catch (error) {
    // Handle different error types for better diagnostics
    if (error instanceof TypeError) {
      // Constructor doesn't exist or has wrong signature
      // This is expected for non-constructable values
    } else if (error instanceof ReferenceError) {
      // Missing dependencies - unlikely but possible
      console.warn('[Router] FormRequest detection failed: Missing dependencies', error)
    } else {
      // Unexpected error - log for debugging
      console.warn('[Router] Unexpected error during FormRequest detection:', error)
    }
    formRequestCache.set(value, false)
    return false
  }
}

/**
 * Convert a FormRequest class to middleware.
 * Uses instance caching to avoid re-instantiation on every request.
 */
function formRequestToMiddleware(RequestClass: FormRequestClass): GravitoMiddleware {
  // Get or create cached instance
  let request = formRequestInstances.get(RequestClass)
  if (!request) {
    request = new RequestClass()
    if (typeof request.validate !== 'function') {
      throw new Error('Invalid FormRequest: validate() is missing.')
    }
    formRequestInstances.set(RequestClass, request)
  }

  return async (ctx, next) => {
    const result = await request!.validate!(ctx)

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
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  get(
    path: string,
    requestOrHandlerOrMiddleware:
      | FormRequestClass
      | RouteHandler
      | GravitoMiddleware
      | GravitoMiddleware[],
    handler?: RouteHandler
  ): Route {
    return this.router.req('get', path, requestOrHandlerOrMiddleware, handler, this.options)
  }

  post(path: string, handler: RouteHandler): Route
  post(path: string, request: FormRequestClass, handler: RouteHandler): Route
  post(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  post(
    path: string,
    requestOrHandlerOrMiddleware:
      | FormRequestClass
      | RouteHandler
      | GravitoMiddleware
      | GravitoMiddleware[],
    handler?: RouteHandler
  ): Route {
    return this.router.req('post', path, requestOrHandlerOrMiddleware, handler, this.options)
  }

  put(path: string, handler: RouteHandler): Route
  put(path: string, request: FormRequestClass, handler: RouteHandler): Route
  put(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  put(
    path: string,
    requestOrHandlerOrMiddleware:
      | FormRequestClass
      | RouteHandler
      | GravitoMiddleware
      | GravitoMiddleware[],
    handler?: RouteHandler
  ): Route {
    return this.router.req('put', path, requestOrHandlerOrMiddleware, handler, this.options)
  }

  delete(path: string, handler: RouteHandler): Route
  delete(path: string, request: FormRequestClass, handler: RouteHandler): Route
  delete(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  delete(
    path: string,
    requestOrHandlerOrMiddleware:
      | FormRequestClass
      | RouteHandler
      | GravitoMiddleware
      | GravitoMiddleware[],
    handler?: RouteHandler
  ): Route {
    return this.router.req('delete', path, requestOrHandlerOrMiddleware, handler, this.options)
  }

  patch(path: string, handler: RouteHandler): Route
  patch(path: string, request: FormRequestClass, handler: RouteHandler): Route
  patch(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  patch(
    path: string,
    requestOrHandlerOrMiddleware:
      | FormRequestClass
      | RouteHandler
      | GravitoMiddleware
      | GravitoMiddleware[],
    handler?: RouteHandler
  ): Route {
    return this.router.req('patch', path, requestOrHandlerOrMiddleware, handler, this.options)
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
   * Optimized: O(n) complexity using Set for lookups instead of O(n²) with Array.some()
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

    // Use Set to track compiled routes for O(1) lookup
    const compiledKeys = new Set<string>()

    // First pass: compile registered routes
    for (const route of this.routes) {
      const method = route.method.toUpperCase()
      const key = `${method}:${route.path}`

      compiledKeys.add(key)
      compiled.push({
        method,
        path: route.path,
        domain: route.domain,
        name: nameMap.get(key),
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
    // Optimized: Only resolve bindings for params that exist in the current route
    this.core.adapter.useGlobal(async (c, next) => {
      // Early exit if no bindings registered
      if (this.bindings.size === 0) {
        await next()
        return undefined
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

        try {
          const resolved = await resolver(value)
          routeModels[param] = resolved
          hasResolvedModels = true
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : undefined
          if (message === 'ModelNotFound') {
            throw new ModelNotFoundException(param, value)
          }
          throw err
        }
      }

      // Only set routeModels if we actually resolved something
      if (hasResolvedModels) {
        c.set('routeModels', routeModels)
      }

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
   */
  get(path: string, handler: RouteHandler): Route
  get(path: string, request: FormRequestClass, handler: RouteHandler): Route
  get(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  get(
    path: string,
    requestOrHandlerOrMiddleware:
      | FormRequestClass
      | RouteHandler
      | GravitoMiddleware
      | GravitoMiddleware[],
    handler?: RouteHandler
  ): Route {
    return this.req('get', path, requestOrHandlerOrMiddleware, handler)
  }

  /**
   * Register a POST route.
   */
  post(path: string, handler: RouteHandler): Route
  post(path: string, request: FormRequestClass, handler: RouteHandler): Route
  post(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  post(
    path: string,
    requestOrHandlerOrMiddleware:
      | FormRequestClass
      | RouteHandler
      | GravitoMiddleware
      | GravitoMiddleware[],
    handler?: RouteHandler
  ): Route {
    return this.req('post', path, requestOrHandlerOrMiddleware, handler)
  }

  /**
   * Register a PUT route.
   */
  put(path: string, handler: RouteHandler): Route
  put(path: string, request: FormRequestClass, handler: RouteHandler): Route
  put(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  put(
    path: string,
    requestOrHandlerOrMiddleware:
      | FormRequestClass
      | RouteHandler
      | GravitoMiddleware
      | GravitoMiddleware[],
    handler?: RouteHandler
  ): Route {
    return this.req('put', path, requestOrHandlerOrMiddleware, handler)
  }

  /**
   * Register a DELETE route.
   */
  delete(path: string, handler: RouteHandler): Route
  delete(path: string, request: FormRequestClass, handler: RouteHandler): Route
  delete(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  delete(
    path: string,
    requestOrHandlerOrMiddleware:
      | FormRequestClass
      | RouteHandler
      | GravitoMiddleware
      | GravitoMiddleware[],
    handler?: RouteHandler
  ): Route {
    return this.req('delete', path, requestOrHandlerOrMiddleware, handler)
  }

  /**
   * Register a PATCH route.
   */
  patch(path: string, handler: RouteHandler): Route
  patch(path: string, request: FormRequestClass, handler: RouteHandler): Route
  patch(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  patch(
    path: string,
    requestOrHandlerOrMiddleware:
      | FormRequestClass
      | RouteHandler
      | GravitoMiddleware
      | GravitoMiddleware[],
    handler?: RouteHandler
  ): Route {
    return this.req('patch', path, requestOrHandlerOrMiddleware, handler)
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
      this.req(m, path, handler)
    }
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
    requestOrHandlerOrMiddleware:
      | FormRequestClass
      | RouteHandler
      | GravitoMiddleware
      | GravitoMiddleware[],
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
      if (isFormRequestClass(requestOrHandlerOrMiddleware)) {
        formRequestMiddleware = formRequestToMiddleware(requestOrHandlerOrMiddleware)
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
      resolvedHandler = this.resolveControllerHandler(CtrlClass, methodName)
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
