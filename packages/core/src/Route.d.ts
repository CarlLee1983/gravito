import type { RouteOptions, Router } from './Router'
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
}
//# sourceMappingURL=Route.d.ts.map
