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

export interface RouteScannerOptions {
  include?: string[] | undefined
  exclude?: string[] | undefined
  defaultChangefreq?: ChangeFreq | undefined
  defaultPriority?: number | undefined
}

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

  getEntries(): SitemapEntry[] {
    const entries: SitemapEntry[] = []

    // Accsess internal routes structure of Hono router
    // This is Hono/Gravito specific implementation assumption
    const routes = this.extractRoutes(this.router)

    for (const route of routes) {
      // Skip non-GET routes
      if (route.method !== 'GET') continue

      // Skip routes with parameters for now (unless explicitly handled later)
      if (route.path.includes(':') || route.path.includes('*')) continue

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

    // If it's a Gravito Router, it exposes the underlying Hono routes via routes property
    if (router.routes) {
      return router.routes
    }

    // Attempt to access Hono v4 router routes
    // Note: Hono's internal router structure might vary.
    // For now we assume a standard route list is available or we scan registration history if available.
    // In Gravito Core Router, we might need to expose registered routes more publicly.

    // Fallback: If passed object has a 'routes' array (Gravito Core Router usually tracks these)
    return routes
  }

  private shouldInclude(path: string): boolean {
    // Exclude check first
    if (this.options.exclude) {
      for (const pattern of this.options.exclude) {
        if (matchGlob(path, pattern)) return false
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

export function routeScanner(router: any, options?: RouteScannerOptions): RouteScanner {
  return new RouteScanner(router, options)
}
