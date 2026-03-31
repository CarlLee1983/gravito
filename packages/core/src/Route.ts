import { router } from './helpers'
import type { GravitoMiddleware } from './http/types'
import type {
  ControllerClass,
  FormRequestClass,
  ResourceOptions,
  RouteDefinitionArg,
  RouteHandler,
  RouteOptions,
  Router,
} from './Router'

/**
 * Route definition helper.
 * Represents a registered route and allows method chaining for middleware/names.
 * @public
 */
export class Route {
  constructor(
    private router: Router,
    private method: string,
    private path: string,
    private options: RouteOptions
  ) {}

  /**
   * Name the route
   */
  name(name: string): this {
    this.router.registerName(name, this.method, this.path, this.options)
    return this
  }

  /**
   * Attach Zod schemas to the route for validation and OpenAPI generation.
   * @since 2.2.0
   */
  schema(schemas: NonNullable<RouteOptions['schema']>): this {
    this.options.schema = {
      ...(this.options.schema || {}),
      ...schemas,
    }
    return this
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Static Facade Methods
  // ─────────────────────────────────────────────────────────────────────────────

  static get(path: string, handler: RouteHandler): Route
  static get(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static get(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static get(
    path: string,
    requestOrHandlerOrMiddleware: RouteDefinitionArg,
    handler?: RouteHandler
  ): Route {
    return router().req('get', path, requestOrHandlerOrMiddleware, handler)
  }

  static post(path: string, handler: RouteHandler): Route
  static post(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static post(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static post(
    path: string,
    requestOrHandlerOrMiddleware: RouteDefinitionArg,
    handler?: RouteHandler
  ): Route {
    return router().req('post', path, requestOrHandlerOrMiddleware, handler)
  }

  static put(path: string, handler: RouteHandler): Route
  static put(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static put(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static put(
    path: string,
    requestOrHandlerOrMiddleware: RouteDefinitionArg,
    handler?: RouteHandler
  ): Route {
    return router().req('put', path, requestOrHandlerOrMiddleware, handler)
  }

  static delete(path: string, handler: RouteHandler): Route
  static delete(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static delete(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static delete(
    path: string,
    requestOrHandlerOrMiddleware: RouteDefinitionArg,
    handler?: RouteHandler
  ): Route {
    return router().req('delete', path, requestOrHandlerOrMiddleware, handler)
  }

  static patch(path: string, handler: RouteHandler): Route
  static patch(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static patch(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static patch(
    path: string,
    requestOrHandlerOrMiddleware: RouteDefinitionArg,
    handler?: RouteHandler
  ): Route {
    return router().req('patch', path, requestOrHandlerOrMiddleware, handler)
  }

  static resource(name: string, controller: ControllerClass, options: ResourceOptions = {}): void {
    router().resource(name, controller, options)
  }

  static prefix(path: string) {
    return router().prefix(path)
  }

  static middleware(...handlers: (GravitoMiddleware | GravitoMiddleware[])[]) {
    return router().middleware(...handlers)
  }
}
