import type { Handler, MiddlewareHandler } from 'hono';
import type { PlanetCore } from './PlanetCore';

// Type for Controller Class Constructor
// biome-ignore lint/suspicious/noExplicitAny: Controllers can have any shape
export type ControllerClass = new (core: PlanetCore) => any;

// Handler can be a function or [Class, 'methodName']
export type RouteHandler = Handler | [ControllerClass, string];

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
    // We pass 'this' as the router to the callback
    // So when they call .get(), it uses our scoped methods
    callback(this);
  }

  // Proxy HTTP methods to the main router with options merged
  get(path: string, handler: RouteHandler) {
    this.router.req('get', path, handler, this.options);
  }
  post(path: string, handler: RouteHandler) {
    this.router.req('post', path, handler, this.options);
  }
  put(path: string, handler: RouteHandler) {
    this.router.req('put', path, handler, this.options);
  }
  delete(path: string, handler: RouteHandler) {
    this.router.req('delete', path, handler, this.options);
  }
  patch(path: string, handler: RouteHandler) {
    this.router.req('patch', path, handler, this.options);
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

  // Standard HTTP Methods
  get(path: string, handler: RouteHandler) {
    this.req('get', path, handler);
  }
  post(path: string, handler: RouteHandler) {
    this.req('post', path, handler);
  }
  put(path: string, handler: RouteHandler) {
    this.req('put', path, handler);
  }
  delete(path: string, handler: RouteHandler) {
    this.req('delete', path, handler);
  }
  patch(path: string, handler: RouteHandler) {
    this.req('patch', path, handler);
  }

  /**
   * Internal Request Registration
   */
  req(method: string, path: string, handler: RouteHandler, options: RouteOptions = {}) {
    // 1. Resolve Path
    const fullPath = (options.prefix || '') + path;

    // 2. Resolve Handler (Controller vs Function)
    let finalHandler: Handler;

    if (Array.isArray(handler)) {
      const [CtrlClass, methodName] = handler;
      finalHandler = this.resolveControllerHandler(CtrlClass, methodName);
    } else {
      finalHandler = handler;
    }

    // 3. Prepare Handlers Stack
    const handlers: Handler[] = [];

    if (options.middleware) {
      handlers.push(...options.middleware);
    }
    handlers.push(finalHandler);

    // 4. Register with Hono
    if (options.domain) {
      // If domain is specified, we must compose handlers into a single one
      // so we can wrap them behind a domain check.
      const wrappedHandler: Handler = async (c, next) => {
        // 1. Check Domain
        if (c.req.header('host') !== options.domain) {
          // Skip this entire route definition, look for next match
          return next();
        }

        // 2. Execute Internal Pipeline
        // We replicate Hono's execution model for this isolated stack
        let index = -1;
        const dispatch = async (i: number): Promise<any> => {
          if (i <= index) throw new Error('next() called multiple times');
          index = i;
          const fn = handlers[i];
          if (!fn) {
            // End of stack?
            // If we are here, it means the last handler called next()
            // Usually finalHandler returns response, so this might not be reached.
            // But if it is, we fall through to next route (unlikely for controller)
            return next();
          }
          return fn(c, () => dispatch(i + 1));
        };
        return dispatch(0);
      };

      (this.core.app as any)[method](fullPath, wrappedHandler);
    } else {
      // Standard registration
      (this.core.app as any)[method](fullPath, ...handlers);
    }
  }

  /**
   * Resolve Controller Instance and Method
   */
  private resolveControllerHandler(CtrlClass: ControllerClass, methodName: string): Handler {
    // 1. Get or Create Controller Instance
    let instance = this.controllers.get(CtrlClass);
    if (!instance) {
      instance = new CtrlClass(this.core);
      this.controllers.set(CtrlClass, instance);
    }

    // 2. Check method existence
    if (typeof instance[methodName] !== 'function') {
      throw new Error(`Method '${methodName}' not found in controller '${CtrlClass.name}'`);
    }

    // 3. Bind context
    return instance[methodName].bind(instance);
  }
}
