import { router } from './helpers'
import type {
  ControllerClass,
  FormRequestClass,
  ResourceOptions,
  RouteHandler,
  RouteOptions,
  Router,
} from './Router'

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
  static get(path: string, requestOrHandler: any, handler?: any): Route {
    return router().get(path, requestOrHandler, handler)
  }

  static post(path: string, handler: RouteHandler): Route
  static post(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static post(path: string, requestOrHandler: any, handler?: any): Route {
    return router().post(path, requestOrHandler, handler)
  }

  static put(path: string, handler: RouteHandler): Route
  static put(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static put(path: string, requestOrHandler: any, handler?: any): Route {
    return router().put(path, requestOrHandler, handler)
  }

  static delete(path: string, handler: RouteHandler): Route
  static delete(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static delete(path: string, requestOrHandler: any, handler?: any): Route {
    return router().delete(path, requestOrHandler, handler)
  }

  static patch(path: string, handler: RouteHandler): Route
  static patch(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static patch(path: string, requestOrHandler: any, handler?: any): Route {
    return router().patch(path, requestOrHandler, handler)
  }

  static resource(name: string, controller: ControllerClass, options: ResourceOptions = {}): void {
    router().resource(name, controller, options)
  }

  static prefix(path: string) {
    return router().prefix(path)
  }

  static middleware(...handlers: any[]) {
    return router().middleware(...handlers)
  }
}
