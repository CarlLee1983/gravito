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
export declare class Route {
  private router
  private method
  private path
  private options
  constructor(router: Router, method: string, path: string, options: RouteOptions)
  /**
   * Name the route
   */
  name(name: string): this
  static get(path: string, handler: RouteHandler): Route
  static get(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static get(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static post(path: string, handler: RouteHandler): Route
  static post(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static post(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static put(path: string, handler: RouteHandler): Route
  static put(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static put(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static delete(path: string, handler: RouteHandler): Route
  static delete(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static delete(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static patch(path: string, handler: RouteHandler): Route
  static patch(path: string, request: FormRequestClass, handler: RouteHandler): Route
  static patch(
    path: string,
    middleware: GravitoMiddleware | GravitoMiddleware[],
    handler: RouteHandler
  ): Route
  static resource(name: string, controller: ControllerClass, options?: ResourceOptions): void
  static prefix(path: string): import('./Router').RouteGroup
  static middleware(
    ...handlers: (GravitoMiddleware | GravitoMiddleware[])[]
  ): import('./Router').RouteGroup
}
