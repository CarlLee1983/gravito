import type { ChangeFreq, SitemapEntry, SitemapProvider } from '../types'

// Simple implementation of glob matching for minimal dependency
function matchGlob(str: string, pattern: string): boolean {
  // Convert glob to regex
  // * -> .*
  // ? -> .
  const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.')

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(str)
}

/**
 * Options for configuring the `RouteScanner`.
 *
 * @public
 * @since 3.0.0
 */
export interface RouteScannerOptions {
  /** Glob patterns of routes to explicitly include. */
  include?: string[] | undefined
  /** Glob patterns of routes to exclude from the sitemap. */
  exclude?: string[] | undefined
  /** Default change frequency for scanned routes. @default 'weekly' */
  defaultChangefreq?: ChangeFreq | undefined
  /** Default priority for scanned routes (0.0 to 1.0). @default 0.5 */
  defaultPriority?: number | undefined
}

/**
 * RouteScanner automatically discovers static GET routes from the Gravito router.
 *
 * It filters out routes with parameters (e.g., /user/:id) and non-GET routes
 * by default, ensuring that only crawlable pages are included in the sitemap.
 *
 * @example
 * ```typescript
 * const scanner = new RouteScanner(app.router, {
 *   exclude: ['/admin/*', '/internal/*']
 * });
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class RouteScanner implements SitemapProvider {
  private router: any // Using any to key access internal routes
  private options: RouteScannerOptions

  constructor(router: any, options: RouteScannerOptions = {}) {
    this.router = router
    this.options = {
      defaultChangefreq: 'weekly',
      defaultPriority: 0.5,
      ...options,
    }
  }

  /**
   * Scans the router and returns discovered static GET routes as sitemap entries.
   *
   * This method iterates through all registered routes in the Gravito router,
   * applying inclusion/exclusion filters and defaulting metadata for matching routes.
   *
   * @returns An array of `SitemapEntry` objects.
   */
  getEntries(): SitemapEntry[] {
    const entries: SitemapEntry[] = []

    // Access internal routes structure of the Gravito router
    // This is Gravito router specific implementation assumption
    const routes = this.extractRoutes(this.router)

    for (const route of routes) {
      // Skip non-GET routes
      if (route.method !== 'GET') {
        continue
      }

      // Skip routes with parameters for now (unless explicitly handled later)
      if (route.path.includes(':') || route.path.includes('*')) {
        continue
      }

      if (this.shouldInclude(route.path)) {
        entries.push({
          url: route.path,
          changefreq: this.options.defaultChangefreq,
          priority: this.options.defaultPriority,
        })
      }
    }

    return entries
  }

  private extractRoutes(router: any): Array<{ method: string; path: string }> {
    const routes: Array<{ method: string; path: string }> = []

    // If it's a Gravito Router, it exposes the underlying routes via routes property
    if (router.routes) {
      return router.routes
    }

    // Attempt to access router routes for compatible adapters
    // Note: Internal router structure might vary.
    // For now we assume a standard route list is available or we scan registration history if available.
    // In Gravito Core Router, we might need to expose registered routes more publicly.

    // Fallback: If passed object has a 'routes' array (Gravito Core Router usually tracks these)
    return routes
  }

  private shouldInclude(path: string): boolean {
    // Exclude check first
    if (this.options.exclude) {
      for (const pattern of this.options.exclude) {
        if (matchGlob(path, pattern)) {
          return false
        }
      }
    }

    // Include check
    if (this.options.include) {
      let matched = false
      for (const pattern of this.options.include) {
        if (matchGlob(path, pattern)) {
          matched = true
          break
        }
      }
      return matched
    }

    // Default include if no include patterns specified
    return true
  }
}

/**
 * Functional factory for creating a `RouteScanner`.
 *
 * @param router - The Gravito router instance.
 * @param options - Optional scanner configuration.
 * @returns A new RouteScanner instance.
 *
 * @public
 * @since 3.0.0
 */
export function routeScanner(router: any, options?: RouteScannerOptions): RouteScanner {
  return new RouteScanner(router, options)
}
