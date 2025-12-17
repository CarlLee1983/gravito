import type { Handler, MiddlewareHandler } from 'hono';
import type { PlanetCore } from './PlanetCore';

// Type for Controller Class Constructor
// biome-ignore lint/suspicious/noExplicitAny: Controllers can have any shape
export type ControllerClass = new (core: PlanetCore) => any;

// Handler can be a function or [Class, 'methodName']
export type RouteHandler = Handler | [ControllerClass, string];

/**
 * Interface for FormRequest classes (from @gravito/orbit-request).
 * Used for duck-typing detection without hard dependency.
 */
export interface FormRequestLike {
  schema: unknown;
  source?: string;
  validate?(ctx: unknown): Promise<{ success: boolean; data?: unknown; error?: unknown }>;
}

/**
 * Type for FormRequest class constructor
 */
// biome-ignore lint/suspicious/noExplicitAny: FormRequest can have any schema
export type FormRequestClass = new () => FormRequestLike;

/**
 * Check if a value is a FormRequest class
 */
function isFormRequestClass(value: unknown): value is FormRequestClass {
  if (typeof value !== 'function') return false;
  try {
    const instance = new (value as new () => unknown)();
    return (
      instance !== null &&
      typeof instance === 'object' &&
      'schema' in instance &&
      'validate' in instance &&
      typeof (instance as FormRequestLike).validate === 'function'
    );
  } catch {
    return false;
  }
}

/**
 * Convert a FormRequest class to middleware
 */
function formRequestToMiddleware(RequestClass: FormRequestClass): MiddlewareHandler {
  return async (ctx, next) => {
    const request = new RequestClass();
    const result = await request.validate!(ctx);

    if (!result.success) {
      // Determine status code based on error type
      const errorCode = (result.error as { error?: { code?: string } })?.error?.code;
      const status = errorCode === 'AUTHORIZATION_ERROR' ? 403 : 422;
      return ctx.json(result.error, status);
    }

    // Store validated data in context
    ctx.set('validated', result.data);
    return next();
  };
}

interface RouteOptions {
  prefix?: string;
  domain?: string;
  middleware?: MiddlewareHandler[];
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
    });
  }

  /**
   * Add middleware to the current group.
   * Accepts individual handlers or arrays of handlers.
   */
  middleware(...handlers: (MiddlewareHandler | MiddlewareHandler[])[]): RouteGroup {
    const flattened = handlers.flat();
    return new RouteGroup(this.router, {
      ...this.options,
      middleware: [...(this.options.middleware || []), ...flattened],
    });
  }

  /**
   * Define routes within this group
   */
  group(callback: (router: Router | RouteGroup) => void): void {
    callback(this);
  }

  // Proxy HTTP methods to the main router with options merged
  get(path: string, handler: RouteHandler): void;
  get(path: string, request: FormRequestClass, handler: RouteHandler): void;
  get(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): void {
    this.router.req('get', path, requestOrHandler, handler, this.options);
  }

  post(path: string, handler: RouteHandler): void;
  post(path: string, request: FormRequestClass, handler: RouteHandler): void;
  post(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): void {
    this.router.req('post', path, requestOrHandler, handler, this.options);
  }

  put(path: string, handler: RouteHandler): void;
  put(path: string, request: FormRequestClass, handler: RouteHandler): void;
  put(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): void {
    this.router.req('put', path, requestOrHandler, handler, this.options);
  }

  delete(path: string, handler: RouteHandler): void;
  delete(path: string, request: FormRequestClass, handler: RouteHandler): void;
  delete(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): void {
    this.router.req('delete', path, requestOrHandler, handler, this.options);
  }

  patch(path: string, handler: RouteHandler): void;
  patch(path: string, request: FormRequestClass, handler: RouteHandler): void;
  patch(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): void {
    this.router.req('patch', path, requestOrHandler, handler, this.options);
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
  private controllers = new Map<ControllerClass, any>();

  constructor(private core: PlanetCore) {}

  /**
   * Start a route group with a prefix
   */
  prefix(path: string): RouteGroup {
    return new RouteGroup(this, { prefix: path });
  }

  /**
   * Start a route group with a domain constraint
   */
  domain(host: string): RouteGroup {
    return new RouteGroup(this, { domain: host });
  }

  /**
   * Start a route group with middleware.
   * Accepts individual handlers or arrays of handlers.
   */
  middleware(...handlers: (MiddlewareHandler | MiddlewareHandler[])[]): RouteGroup {
    return new RouteGroup(this, { middleware: handlers.flat() });
  }

  // Standard HTTP Methods with FormRequest support
  get(path: string, handler: RouteHandler): void;
  get(path: string, request: FormRequestClass, handler: RouteHandler): void;
  get(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): void {
    this.req('get', path, requestOrHandler, handler);
  }

  post(path: string, handler: RouteHandler): void;
  post(path: string, request: FormRequestClass, handler: RouteHandler): void;
  post(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): void {
    this.req('post', path, requestOrHandler, handler);
  }

  put(path: string, handler: RouteHandler): void;
  put(path: string, request: FormRequestClass, handler: RouteHandler): void;
  put(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): void {
    this.req('put', path, requestOrHandler, handler);
  }

  delete(path: string, handler: RouteHandler): void;
  delete(path: string, request: FormRequestClass, handler: RouteHandler): void;
  delete(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): void {
    this.req('delete', path, requestOrHandler, handler);
  }

  patch(path: string, handler: RouteHandler): void;
  patch(path: string, request: FormRequestClass, handler: RouteHandler): void;
  patch(
    path: string,
    requestOrHandler: FormRequestClass | RouteHandler,
    handler?: RouteHandler
  ): void {
    this.req('patch', path, requestOrHandler, handler);
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
  ) {
    // 1. Resolve Path
    const fullPath = (options.prefix || '') + path;

    // 2. Determine if FormRequest is provided
    let formRequestMiddleware: MiddlewareHandler | null = null;
    let finalRouteHandler: RouteHandler;

    if (handler !== undefined) {
      // FormRequest + Handler pattern: post('/users', StoreUserRequest, [Controller, 'method'])
      if (isFormRequestClass(requestOrHandler)) {
        formRequestMiddleware = formRequestToMiddleware(requestOrHandler);
      }
      finalRouteHandler = handler;
    } else {
      // Traditional pattern: post('/users', [Controller, 'method'])
      finalRouteHandler = requestOrHandler as RouteHandler;
    }

    // 3. Resolve Handler (Controller vs Function)
    let resolvedHandler: Handler;

    if (Array.isArray(finalRouteHandler)) {
      const [CtrlClass, methodName] = finalRouteHandler;
      resolvedHandler = this.resolveControllerHandler(CtrlClass, methodName);
    } else {
      resolvedHandler = finalRouteHandler;
    }

    // 4. Prepare Handlers Stack
    const handlers: Handler[] = [];

    if (options.middleware) {
      handlers.push(...options.middleware);
    }
    if (formRequestMiddleware) {
      handlers.push(formRequestMiddleware);
    }
    handlers.push(resolvedHandler);

    // 5. Register with Hono
    if (options.domain) {
      const wrappedHandler: Handler = async (c, next) => {
        if (c.req.header('host') !== options.domain) {
          return next();
        }

        let index = -1;
        // biome-ignore lint/suspicious/noExplicitAny: Pipeline dispatch
        const dispatch = async (i: number): Promise<any> => {
          if (i <= index) throw new Error('next() called multiple times');
          index = i;
          const fn = handlers[i];
          if (!fn) {
            return next();
          }
          return fn(c, () => dispatch(i + 1));
        };
        return dispatch(0);
      };

      (this.core.app as any)[method](fullPath, wrappedHandler);
    } else {
      (this.core.app as any)[method](fullPath, ...handlers);
    }
  }

  /**
   * Resolve Controller Instance and Method
   */
  private resolveControllerHandler(CtrlClass: ControllerClass, methodName: string): Handler {
    let instance = this.controllers.get(CtrlClass);
    if (!instance) {
      instance = new CtrlClass(this.core);
      this.controllers.set(CtrlClass, instance);
    }

    if (typeof instance[methodName] !== 'function') {
      throw new Error(`Method '${methodName}' not found in controller '${CtrlClass.name}'`);
    }

    return instance[methodName].bind(instance);
  }
}
