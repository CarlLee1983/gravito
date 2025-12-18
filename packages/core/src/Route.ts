import type { RouteOptions, Router } from './Router'

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
}
