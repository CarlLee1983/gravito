import type { RouteScanner, ScannedRoute } from '../types'
import { extractParams, isDynamicRoute, matchesPatterns, normalizePath } from '../utils'

export interface FastifyScannerOptions {
  /** Exclude certain route patterns from scanning */
  excludePatterns?: (string | RegExp)[]

  /** Only include routes matching these patterns */
  includePatterns?: (string | RegExp)[]
}

/**
 * FastifyScanner
 *
 * Collects routes from a Fastify application via the 'onRoute' hook.
 * Because Fastify does not expose a simple route list structure, this scanner
 * acts as a collector that must be hooked into the Fastify instance.
 *
 * @example
 * ```typescript
 * import fastify from 'fastify'
 * import { FastifyScanner, SitemapBuilder } from '@gravito/luminosity'
 *
 * const app = fastify()
 * const scanner = new FastifyScanner()
 *
 * // Register the hook BEFORE defining routes
 * app.addHook('onRoute', scanner.collect)
 *
 * app.get('/hello', ...)
 *
 * // Later
 * const builder = new SitemapBuilder({ scanner, hostname: '...' })
 * const entries = await builder.build()
 * ```
 */
export class FastifyScanner implements RouteScanner {
  readonly framework = 'fastify'
  private routes: ScannedRoute[] = []

  constructor(private options: FastifyScannerOptions = {}) {}

  /**
   * Fastify 'onRoute' hook handler.
   * Bind this to the hook: `app.addHook('onRoute', scanner.collect)`
   */
  public collect = (routeOptions: any): void => {
    // Fastify routeOptions has { method, url, path, prefix, ... }
    // Usually 'url' is the full path.
    const rawPath = routeOptions.url || routeOptions.path
    if (!rawPath) {
      return
    }

    // Skip internal routes or if method is HEAD/OPTIONS (unless we want them, but usually sitemap is GET)
    // We store all, let SitemapBuilder filter by GET.

    // Normalize path
    // Fastify uses :param syntax which is compatible.
    const path = normalizePath(rawPath)

    // Check filters
    if (this.shouldExclude(path)) {
      return
    }

    const methods = Array.isArray(routeOptions.method) ? routeOptions.method : [routeOptions.method]

    for (const method of methods) {
      this.routes.push({
        path,
        method: method.toUpperCase(),
        isDynamic: isDynamicRoute(path),
        params: extractParams(path),
      })
    }
  }

  async scan(): Promise<ScannedRoute[]> {
    return this.routes
  }

  private shouldExclude(path: string): boolean {
    if (this.options.excludePatterns?.length) {
      if (matchesPatterns(path, this.options.excludePatterns)) {
        return true
      }
    }
    if (this.options.includePatterns?.length) {
      return !matchesPatterns(path, this.options.includePatterns)
    }
    return false
  }
}
