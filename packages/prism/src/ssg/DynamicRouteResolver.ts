/**
 * DynamicRouteResolver - Utilities for resolving dynamic route patterns.
 *
 * Facilitates Static Site Generation (SSG) for dynamic paths by expanding
 * patterns like `/blog/[slug]` into concrete URLs based on data.
 *
 * @public
 * @since 3.1.0
 */

/**
 * Definition of a dynamic route to be resolved.
 */
export interface DynamicRoute {
  /** The route pattern (e.g., `/blog/[slug]`). */
  pattern: string
  /** Function to fetch all possible parameters for this route. */
  getPaths: () => Promise<Array<{ params: Record<string, string> }>>
  /** Function to fetch data for a specific set of parameters. */
  getData?: (params: Record<string, string>) => Promise<any>
}

/**
 * A resolved route ready for export.
 */
export interface ResolvedRoute {
  /** The concrete path (e.g., `/blog/hello-world`). */
  path: string
  /** Function to fetch data for this specific path. */
  getData?: () => Promise<any>
}

/**
 * Helper class to resolve dynamic routes into static paths.
 */
export class DynamicRouteResolver {
  /**
   * Resolve a list of dynamic routes into concrete paths.
   *
   * Iterates through each dynamic route, fetches its paths, and interpolates the parameters.
   *
   * @param routes - List of dynamic routes.
   * @returns Array of resolved routes with concrete paths and data loaders.
   *
   * @example
   * ```typescript
   * const resolved = await DynamicRouteResolver.resolve([
   *   {
   *     pattern: '/users/[id]',
   *     getPaths: async () => [{ params: { id: '1' } }]
   *   }
   * ]);
   * // resolved[0].path === '/users/1'
   * ```
   */
  static async resolve(routes: DynamicRoute[]): Promise<ResolvedRoute[]> {
    const resolved: ResolvedRoute[] = []

    for (const route of routes) {
      const paths = await route.getPaths()

      for (const { params } of paths) {
        const path = this.interpolate(route.pattern, params)

        resolved.push({
          path,
          getData: route.getData ? () => route.getData?.(params) : undefined,
        })
      }
    }

    return resolved
  }

  /**
   * Interpolate parameters into a route pattern.
   *
   * Replaces `[param]` and `[...param]` placeholders with actual values.
   *
   * @param pattern - Route pattern.
   * @param params - Dictionary of parameter values.
   * @returns The interpolated path string.
   * @throws {Error} If a required parameter is missing.
   */
  private static interpolate(pattern: string, params: Record<string, string>): string {
    let result = pattern

    result = result.replace(/\[\.\.\.([^\]]+)\]/g, (_, key) => {
      if (!params[key]) {
        throw new Error(`Missing catch-all param: ${key} for pattern ${pattern}`)
      }
      return params[key]
    })

    result = result.replace(/\[([^\]]+)\]/g, (_, key) => {
      if (!params[key]) {
        throw new Error(`Missing param: ${key} for pattern ${pattern}`)
      }
      return params[key]
    })

    return result
  }

  /**
   * Extract parameter names from a route pattern.
   *
   * @param pattern - Route pattern.
   * @returns List of parameter names.
   *
   * @example
   * ```typescript
   * const params = DynamicRouteResolver.extractParams('/blog/[category]/[slug]');
   * // => ['category', 'slug']
   * ```
   */
  static extractParams(pattern: string): string[] {
    const params: string[] = []
    const regex = /\[([^\]]+)\]/g
    let match: RegExpExecArray | null

    while ((match = regex.exec(pattern)) !== null) {
      params.push(match[1].replace('...', ''))
    }

    return params
  }
}
