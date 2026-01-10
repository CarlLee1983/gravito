import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { RouteScanner, ScannedRoute } from '../types'
import { extractParams, isDynamicRoute, matchesPatterns, normalizePath } from '../utils'

export interface RemixScannerOptions {
  /** Routes directory path (default: ./app/routes) */
  routesDir?: string

  /** Exclude certain route patterns from scanning */
  excludePatterns?: (string | RegExp)[]

  /** Only include routes matching these patterns */
  includePatterns?: (string | RegExp)[]

  /** Current working directory (default: process.cwd()) */
  cwd?: string
}

/**
 * RemixScanner
 *
 * Scans routes from Remix V2 "Flat Routes" convention.
 *
 * @example
 * ```typescript
 * import { RemixScanner, SitemapBuilder } from '@gravito/luminosity'
 *
 * const builder = new SitemapBuilder({
 *   scanner: new RemixScanner({ routesDir: './app/routes' }),
 *   hostname: 'https://example.com'
 * })
 * ```
 */
export class RemixScanner implements RouteScanner {
  readonly framework = 'remix'

  constructor(private options: RemixScannerOptions = {}) {}

  async scan(): Promise<ScannedRoute[]> {
    const routes: ScannedRoute[] = []
    const cwd = this.options.cwd ?? process.cwd()
    const routesDir = this.options.routesDir
      ? this.options.routesDir.startsWith('/')
        ? this.options.routesDir
        : join(cwd, this.options.routesDir)
      : join(cwd, 'app', 'routes')

    if (!this.dirExists(routesDir)) {
      return []
    }

    try {
      const files = readdirSync(routesDir)

      for (const file of files) {
        // Skip non-route files
        if (!this.isRouteFile(file)) {
          continue
        }

        const routePath = this.parseRoutePath(file)
        if (!routePath) {
          continue // Skip ignored routes (like resource routes without export default? - though we assume file existence = route)
        }

        const normalized = normalizePath(routePath)

        if (this.shouldExclude(normalized)) {
          continue
        }

        routes.push({
          path: normalized,
          method: 'GET', // Remix loaders are GET
          isDynamic: isDynamicRoute(normalized),
          params: extractParams(normalized),
        })
      }
    } catch (e) {
      console.error('[RemixScanner] Error scanning routes:', e)
    }

    return routes
  }

  private isRouteFile(filename: string): boolean {
    return /\.(tsx|ts|jsx|js)$/.test(filename) && !filename.startsWith('.')
  }

  /**
   * Parse Remix V2 Flat Route filename to URL path
   *
   * Rules:
   * - _index.tsx -> /
   * - about.tsx -> /about
   * - concerts.trending.tsx -> /concerts/trending
   * - concerts.$city.tsx -> /concerts/:city
   * - _auth.login.tsx -> /login (skip _auth)
   * - ($lang)._index.tsx -> /:lang? (optional segment - we'll treat as :lang for now or separate logic?)
   *   Actually, usually optional segments create multiple routes.
   *   For sitemap, we might just treat it as a dynamic param or skip complexity for V1.
   */
  private parseRoutePath(filename: string): string | null {
    // Remove extension
    const name = filename.replace(/\.(tsx|ts|jsx|js)$/, '')

    // Handle index routes first
    if (name === '_index') {
      return '/'
    }

    // Split by dot (Remix flat routes separator)
    const segments = name.split('.')
    const pathSegments: string[] = []

    for (const segment of segments) {
      // 1. Skip pathless layouts (start with _)
      if (segment.startsWith('_') && segment !== '_index') {
        continue
      }

      // 2. Handle index in nested path (e.g. concerts._index.tsx -> /concerts)
      if (segment === '_index') {
        continue
      }

      // 3. Handle dynamic segments ($city -> :city)
      if (segment.startsWith('$')) {
        pathSegments.push(`:${segment.slice(1)}`)
        continue
      }

      // 4. Handle optional segments (($lang) -> :lang?)
      // We will treat ($lang) as a dynamic param named "lang" for sitemap generation purposes,
      // but denote it somehow? Or just :lang.
      // Simplification: treat ($lang) as :lang
      if (segment.startsWith('(') && segment.endsWith(')')) {
        // strip parens and $ if present inside
        let clean = segment.slice(1, -1)
        if (clean.startsWith('$')) clean = clean.slice(1)
        pathSegments.push(`:${clean}`)
        continue
      }

      // 5. Normal segment
      pathSegments.push(segment)
    }

    if (pathSegments.length === 0) {
      return '/'
    }

    return '/' + pathSegments.join('/')
  }

  private dirExists(path: string): boolean {
    try {
      return statSync(path).isDirectory()
    } catch {
      return false
    }
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
