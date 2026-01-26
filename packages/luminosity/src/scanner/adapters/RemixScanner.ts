import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { RouteScanner, ScannedRoute } from '../types'
import { extractParams, isDynamicRoute, matchesPatterns, normalizePath } from '../utils'

/**
 * Options for configuring the `RemixScanner`.
 *
 * @public
 * @since 3.0.0
 */
export interface RemixScannerOptions {
  /** Path to the Remix routes directory. @default './app/routes' */
  routesDir?: string

  /** An array of patterns (strings or RegExps) to exclude from the sitemap. */
  excludePatterns?: (string | RegExp)[]

  /** If provided, only routes matching these patterns will be included. */
  includePatterns?: (string | RegExp)[]

  /** The current working directory for resolving relative paths. @default process.cwd() */
  cwd?: string
}

/**
 * RemixScanner automatically discovers routes from a Remix (v2+) project using
 * the "Flat Routes" convention.
 *
 * It scans the `app/routes` directory and correctly parses Remix's filename
 * conventions, including index routes (`_index.tsx`), dynamic segments
 * (`$city.tsx`), and pathless layouts (`_auth.tsx`).
 *
 * @example
 * ```typescript
 * import { RemixScanner } from '@gravito/luminosity/scanner';
 *
 * const scanner = new RemixScanner({
 *   routesDir: './app/routes'
 * });
 * const routes = await scanner.scan();
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class RemixScanner implements RouteScanner {
  readonly framework = 'remix'

  constructor(private options: RemixScannerOptions = {}) {}

  /**
   * Scans the Remix routes directory.
   *
   * Uses Remix's file naming conventions (Flat Routes) to deduce route paths.
   *
   * @returns A promise resolving to the list of scanned routes.
   */
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
        if (clean.startsWith('$')) {
          clean = clean.slice(1)
        }
        pathSegments.push(`:${clean}`)
        continue
      }

      // 5. Normal segment
      pathSegments.push(segment)
    }

    if (pathSegments.length === 0) {
      return '/'
    }

    return `/${pathSegments.join('/')}`
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
