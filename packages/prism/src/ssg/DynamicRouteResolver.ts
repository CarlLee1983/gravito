/**
 * DynamicRouteResolver - Generate static paths from dynamic routes
 *
 * Supports patterns:
 * - /blog/[slug] → /blog/hello-world, /blog/getting-started
 * - /docs/[...path] → /docs/api/intro, /docs/guide/setup
 */

export interface DynamicRoute {
  pattern: string
  getPaths: () => Promise<Array<{ params: Record<string, string> }>>
  getData?: (params: Record<string, string>) => Promise<any>
}

export interface ResolvedRoute {
  path: string
  getData?: () => Promise<any>
}

export class DynamicRouteResolver {
  static async resolve(routes: DynamicRoute[]): Promise<ResolvedRoute[]> {
    const resolved: ResolvedRoute[] = []

    for (const route of routes) {
      const paths = await route.getPaths()

      for (const { params } of paths) {
        const path = this.interpolate(route.pattern, params)

        resolved.push({
          path,
          getData: route.getData ? () => route.getData!(params) : undefined,
        })
      }
    }

    return resolved
  }

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
