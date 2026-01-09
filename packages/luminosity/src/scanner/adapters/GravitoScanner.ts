import type { RouteScanner, ScannedRoute } from '../types'
import { extractParams, isDynamicRoute } from '../utils'

/**
 * Options for GravitoScanner
 */
export interface GravitoScannerOptions {
  /** Exclude certain route patterns from scanning */
  excludePatterns?: (string | RegExp)[]

  /** Only include routes matching these patterns */
  includePatterns?: (string | RegExp)[]
}

/**
 * Route information from Gravito's Router
 */
interface GravitoRouteInfo {
  method: string
  path: string
}

/**
 * PlanetCore-like interface for duck typing
 */
interface GravitoCoreLike {
  router: {
    routes: GravitoRouteInfo[]
  }
}

/**
 * GravitoScanner
 *
 * Scans routes registered in a Gravito PlanetCore application.
 *
 * @example
 * ```typescript
 * import { PlanetCore } from '@gravito/core'
 * import { GravitoScanner, SitemapBuilder } from '@gravito/luminosity'
 *
 * const core = await PlanetCore.boot({ ... })
 *
 * const builder = new SitemapBuilder({
 *   scanner: new GravitoScanner(core),
 *   hostname: 'https://example.com'
 * })
 *
 * const entries = await builder.build()
 * ```
 */
export class GravitoScanner implements RouteScanner {
  readonly framework = 'gravito'

  constructor(
    private core: GravitoCoreLike,
    private options: GravitoScannerOptions = {}
  ) {}

  async scan(): Promise<ScannedRoute[]> {
    const routes: ScannedRoute[] = []

    for (const route of this.core.router.routes) {
      const path = route.path

      // Apply include/exclude filters
      if (this.shouldExclude(path)) {
        continue
      }

      routes.push({
        path,
        method: this.normalizeMethod(route.method),
        isDynamic: isDynamicRoute(path),
        params: extractParams(path),
      })
    }

    return routes
  }

  private normalizeMethod(method: string): ScannedRoute['method'] {
    const upper = method.toUpperCase()
    switch (upper) {
      case 'GET':
      case 'POST':
      case 'PUT':
      case 'DELETE':
      case 'PATCH':
        return upper
      default:
        return 'ALL'
    }
  }

  private shouldExclude(path: string): boolean {
    // Check exclude patterns
    if (this.options.excludePatterns?.length) {
      for (const pattern of this.options.excludePatterns) {
        if (typeof pattern === 'string' && path.includes(pattern)) {
          return true
        }
        if (pattern instanceof RegExp && pattern.test(path)) {
          return true
        }
      }
    }

    // Check include patterns (if specified, must match at least one)
    if (this.options.includePatterns?.length) {
      let matched = false
      for (const pattern of this.options.includePatterns) {
        if (typeof pattern === 'string' && path.includes(pattern)) {
          matched = true
          break
        }
        if (pattern instanceof RegExp && pattern.test(path)) {
          matched = true
          break
        }
      }
      return !matched
    }

    return false
  }
}
