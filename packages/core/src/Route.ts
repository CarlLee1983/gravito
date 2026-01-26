import { router } from './helpers'
import type { GravitoMiddleware } from './http/types'
import type {
  ControllerClass,
  FormRequestClass,
  ResourceOptions,
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
  static get(path: string, requestOrHandlerOrMiddleware: any, handler?: any): Route {
    return router().get(path, requestOrHandlerOrMiddleware as any, handler as any)
  }

  static post(path: string, handler: RouteHandler): Route
  static post(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static post(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static post(path: string, requestOrHandlerOrMiddleware: any, handler?: any): Route {
    return router().post(path, requestOrHandlerOrMiddleware as any, handler as any)
  }

  static put(path: string, handler: RouteHandler): Route
  static put(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static put(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static put(path: string, requestOrHandlerOrMiddleware: any, handler?: any): Route {
    return router().put(path, requestOrHandlerOrMiddleware as any, handler as any)
  }

  static delete(path: string, handler: RouteHandler): Route
  static delete(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static delete(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static delete(path: string, requestOrHandlerOrMiddleware: any, handler?: any): Route {
    return router().delete(path, requestOrHandlerOrMiddleware as any, handler as any)
  }

  static patch(path: string, handler: RouteHandler): Route
  static patch(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static patch(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static patch(path: string, requestOrHandlerOrMiddleware: any, handler?: any): Route {
    return router().patch(path, requestOrHandlerOrMiddleware as any, handler as any)
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
