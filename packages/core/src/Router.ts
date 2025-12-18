import type { Handler, MiddlewareHandler } from 'hono'
import { ModelNotFoundException } from './exceptions/ModelNotFoundException'
import type { PlanetCore } from './PlanetCore'
import { Route } from './Route'

// Type for Controller Class Constructor
// biome-ignore lint/suspicious/noExplicitAny: Controllers can have any shape
export type ControllerClass = new (core: PlanetCore) => any

// Handler can be a function or [Class, 'methodName']
export type RouteHandler = Handler | [ControllerClass, string]

/**
 * Interface for FormRequest classes (from @gravito/orbit-request).
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
function formRequestToMiddleware(RequestClass: FormRequestClass): MiddlewareHandler {
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
    return next()
  }
}

export interface RouteOptions {
  prefix?: string
  domain?: string
  middleware?: MiddlewareHandler[]
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
  middleware(...handlers: (MiddlewareHandler | MiddlewareHandler[])[]): RouteGroup {
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
    // We need to pass group options to the resource registration.
    // The Router.resource method registers raw routes.
    // To support groups, we need to manually prefix inside Router.resource OR use a temporary instance?
    // Actually, Router.resource calls `this.req`.
    // `this.req` handles prefixes if we were calling it on `Router`.
    // But `Router` doesn't know about *this* group's options unless we tell it.
    // `Router.req` takes `options`.

    // So we should delegate to Router, but Router.resource needs to accept options merged with group options.
    // Current Router.resource implementation uses `this.req`.
    // We can't easily injection options into `Router.resource`.

    // Better strategy: Re-implement logic here calling `this.router.req` WITH `this.options`.

    const actions: ResourceAction[] = [
      'index',
      'create',
      'store',
      'show',
      'edit',
      'update',
      'destroy',
    ]
    const map: Record<ResourceAction, { method: string; path: string }> = {
      index: { method: 'get', path: `/${name}` },
      create: { method: 'get', path: `/${name}/create` },
      store: { method: 'post', path: `/${name}` },
      show: { method: 'get', path: `/${name}/:id` },
      edit: { method: 'get', path: `/${name}/:id/edit` },
      update: { method: 'put', path: `/${name}/:id` },
      destroy: { method: 'delete', path: `/${name}/:id` },
    }

    const allowed = actions.filter((action) => {
      if (options.only) return options.only.includes(action)
      if (options.except) return !options.except.includes(action)
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
  // Singleton cache for controllers
  // biome-ignore lint/suspicious/noExplicitAny: Cache stores instances of any controller
  private controllers = new Map<ControllerClass, any>()

  private namedRoutes = new Map<
    string,
    { method: string; path: string; domain?: string | undefined }
  >()
  private bindings = new Map<string, (id: string) => Promise<any>>()

  /**
   * Register a named route.
   *
   * This is called by `Route.name(...)`.
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
   *
   * @example
   * router.url('users.show', { id: 1 })
   * router.url('users.show', { id: 1 }, { tab: 'profile' })
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
      if (v === undefined || v === null) continue
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
   *
   * This is intentionally scoped to URL generation and introspection only.
   * It does not affect the HTTP router matcher (Hono still needs route registrations).
   */
  loadNamedRoutes(
    manifest: Record<string, { method: string; path: string; domain?: string }>
  ): void {
    this.namedRoutes = new Map(Object.entries(manifest))
  }

  /**
   * Register a route model binding.
   */
  bind(param: string, resolver: (id: string) => Promise<any>) {
    this.bindings.set(param, resolver)
  }

  /**
   * Register a route model binding for a Model class.
   */
  // biome-ignore lint/suspicious/noExplicitAny: generic model class
  model(param: string, modelClass: any) {
    this.bind(param, async (id) => {
      // Assuming modelClass has a `find` method (Active Record pattern)
      if (typeof modelClass.find === 'function') {
        const instance = await modelClass.find(id)
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
    // Note: Hono's c.req.param() is available in middleware if the router matched.
    // We attach this to '*' so it checks every request.
    // Optimization: we could only check if the current route has the param,
    // but Hono doesn't easily expose "current route params" names without checking values.

    // We need to wait for app initialization to attach middleware?
    // Or just attach it now.

    // However, `this.core.app` is initialized in PlanetCore constructor.
    // We are called FROM PlanetCore constructor.
    // So `this.core.app` exists.

    // We delay attachment slightly or just attach.
    // BUT `bind` might be called later. The middleware needs to read `this.bindings` dynamically.

    this.core.app.use('*', async (c, next) => {
      const routeModels = (c.get('routeModels') ?? {}) as Record<string, unknown>

      // Iterate over registered bindings
      for (const [param, resolver] of this.bindings) {
        const value = c.req.param(param)
        if (value) {
          try {
            const resolved = await resolver(value)
            routeModels[param] = resolved
          } catch (e: any) {
            if (e?.message === 'ModelNotFound') {
              throw new ModelNotFoundException(param, value)
            }
            throw e
          }
        }
      }

      c.set('routeModels', routeModels)
      await next()
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
  middleware(...handlers: (MiddlewareHandler | MiddlewareHandler[])[]): RouteGroup {
    return new RouteGroup(this, { middleware: handlers.flat() })
  }

  // Standard HTTP Methods with FormRequest support
  get(path: string, handler: RouteHandler): Route
  get(path: string, request: FormRequestClass, handler: RouteHandler): Route
  get(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.req('get', path, requestOrHandler, handler)
  }

  post(path: string, handler: RouteHandler): Route
  post(path: string, request: FormRequestClass, handler: RouteHandler): Route
  post(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.req('post', path, requestOrHandler, handler)
  }

  put(path: string, handler: RouteHandler): Route
  put(path: string, request: FormRequestClass, handler: RouteHandler): Route
  put(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.req('put', path, requestOrHandler, handler)
  }

  delete(path: string, handler: RouteHandler): Route
  delete(path: string, request: FormRequestClass, handler: RouteHandler): Route
  delete(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): Route {
    return this.req('delete', path, requestOrHandler, handler)
  }

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
   * Creates index, create, store, show, edit, update, destroy routes.
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
    const map: Record<ResourceAction, { method: string; path: string }> = {
      index: { method: 'get', path: `/${name}` },
      create: { method: 'get', path: `/${name}/create` },
      store: { method: 'post', path: `/${name}` },
      show: { method: 'get', path: `/${name}/:id` },
      edit: { method: 'get', path: `/${name}/:id/edit` },
      update: { method: 'put', path: `/${name}/:id` }, // Also register patch? Laravel usually does PUT/PATCH.
      destroy: { method: 'delete', path: `/${name}/:id` },
    }

    const allowed = actions.filter((action) => {
      if (options.only) return options.only.includes(action)
      if (options.except) return !options.except.includes(action)
      return true
    })

    for (const action of allowed) {
      const { method, path } = map[action]
      // Check if controller has the method
      // We can't easily check at runtime here without instantiating, but we trust the user or fail at runtime.

      // Register route
      // Support PATCH for update
      if (action === 'update') {
        this.req('put', path, [controller, action]).name(`${name}.${action}`)
        this.req('patch', path, [controller, action]) // Same name? Usually only one name.
      } else {
        this.req(method, path, [controller, action]).name(`${name}.${action}`)
      }
    }
  }

  /**
   * Internal Request Registration
   */
  req(
    method: string,
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler,
    options: RouteOptions = {}
  ): Route {
    // 1. Resolve Path
    const fullPath = (options.prefix || '') + path

    // 2. Determine if FormRequest is provided
    let formRequestMiddleware: MiddlewareHandler | null = null
    let finalRouteHandler: RouteHandler

    if (handler !== undefined) {
      // FormRequest + Handler pattern: post('/users', StoreUserRequest, [Controller, 'method'])
      if (isFormRequestClass(requestOrHandler)) {
        formRequestMiddleware = formRequestToMiddleware(requestOrHandler)
      }
      finalRouteHandler = handler
    } else {
      // Traditional pattern: post('/users', [Controller, 'method'])
      finalRouteHandler = requestOrHandler as RouteHandler
    }

    // 3. Resolve Handler (Controller vs Function)
    let resolvedHandler: Handler

    if (Array.isArray(finalRouteHandler)) {
      const [CtrlClass, methodName] = finalRouteHandler
      resolvedHandler = this.resolveControllerHandler(CtrlClass, methodName)
    } else {
      resolvedHandler = finalRouteHandler
    }

    // 4. Prepare Handlers Stack
    const handlers: Handler[] = []

    if (options.middleware) {
      handlers.push(...options.middleware)
    }
    if (formRequestMiddleware) {
      handlers.push(formRequestMiddleware)
    }
    handlers.push(resolvedHandler)

    // 5. Register with Hono
    if (options.domain) {
      const wrappedHandler: Handler = async (c, next) => {
        if (c.req.header('host') !== options.domain) {
          await next()
          return
        }

        let index = -1
        const dispatch = async (i: number): Promise<Response | undefined> => {
          if (i <= index) {
            throw new Error('next() called multiple times')
          }
          index = i
          const fn = handlers[i]
          if (!fn) {
            await next()
            return
          }
          return fn(c, async () => {
            await dispatch(i + 1)
          })
        }
        return dispatch(0)
      }

      const app = this.core.app as unknown as Record<string, unknown>
      const route = app[method]
      if (typeof route !== 'function') {
        throw new Error(`Unsupported HTTP method: ${method}`)
      }
      ;(route as (path: string, ...handlers: Handler[]) => unknown)(fullPath, wrappedHandler)
    } else {
      const app = this.core.app as unknown as Record<string, unknown>
      const route = app[method]
      if (typeof route !== 'function') {
        throw new Error(`Unsupported HTTP method: ${method}`)
      }
      ;(route as (path: string, ...handlers: Handler[]) => unknown)(fullPath, ...handlers)
    }

    return new Route(this, method, path, options)
  }

  /**
   * Resolve Controller Instance and Method
   */
  private resolveControllerHandler(CtrlClass: ControllerClass, methodName: string): Handler {
    let instance = this.controllers.get(CtrlClass)
    if (!instance) {
      instance = new CtrlClass(this.core)
      this.controllers.set(CtrlClass, instance)
    }

    if (typeof instance[methodName] !== 'function') {
      throw new Error(`Method '${methodName}' not found in controller '${CtrlClass.name}'`)
    }

    return instance[methodName].bind(instance)
  }
}

export type ResourceAction = 'index' | 'create' | 'store' | 'show' | 'edit' | 'update' | 'destroy'

export interface ResourceOptions {
  only?: ResourceAction[]
  except?: ResourceAction[]
}
