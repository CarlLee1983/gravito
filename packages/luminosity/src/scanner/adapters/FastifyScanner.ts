import type { RouteScanner, ScannedRoute } from '../types'
import { extractParams, isDynamicRoute, matchesPatterns, normalizePath } from '../utils'

/**
 * Options for configuring the `FastifyScanner`.
 *
 * @public
 * @since 3.0.0
 */
export interface FastifyScannerOptions {
  /** An array of patterns (strings or RegExps) to exclude from the sitemap. */
  excludePatterns?: (string | RegExp)[]

  /** If provided, only routes matching these patterns will be included. */
  includePatterns?: (string | RegExp)[]
}

/**
 * FastifyScanner collects routes from a Fastify application using the `onRoute` hook.
 *
 * Since Fastify does not provide a built-in way to list all routes after registration,
 * this scanner must be attached to the Fastify instance before routes are defined
 * so it can "listen" to and record each registered route.
 *
 * @example
 * ```typescript
 * import fastify from 'fastify';
 * import { FastifyScanner } from '@gravito/luminosity/scanner';
 *
 * const app = fastify();
 * const scanner = new FastifyScanner();
 *
 * // Attach the hook BEFORE adding routes
 * app.addHook('onRoute', scanner.collect);
 *
 * // Later, use the scanner to get the route list
 * const routes = await scanner.scan();
 * ```
 *
 * @public
 * @since 3.0.0
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
