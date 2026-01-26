import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { RouteScanner, ScannedRoute } from '../types'
import { extractParams, isDynamicRoute, matchesPatterns, normalizePath } from '../utils'

/**
 * Options for configuring the `SvelteKitScanner`.
 *
 * @public
 * @since 3.0.0
 */
export interface SvelteKitScannerOptions {
  /** Path to the SvelteKit routes directory. @default './src/routes' */
  routesDir?: string

  /** An array of patterns (strings or RegExps) to exclude from the sitemap. */
  excludePatterns?: (string | RegExp)[]

  /** If provided, only routes matching these patterns will be included. */
  includePatterns?: (string | RegExp)[]

  /** The current working directory for resolving relative paths. @default process.cwd() */
  cwd?: string
}

/**
 * SvelteKitScanner automatically discovers routes from a SvelteKit project's filesystem.
 *
 * It scans the `src/routes` directory and identifies directories containing
 * `+page.svelte`, `+page.js`, or `+page.ts` files. It also correctly handles
 * SvelteKit's route groups (e.g., `(group)`) and dynamic segment syntax
 * (e.g., `[slug]` and `[...slug]`).
 *
 * @example
 * ```typescript
 * import { SvelteKitScanner } from '@gravito/luminosity/scanner';
 *
 * const scanner = new SvelteKitScanner({
 *   excludePatterns: ['/api/**']
 * });
 * const routes = await scanner.scan();
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class SvelteKitScanner implements RouteScanner {
  readonly framework = 'sveltekit'

  constructor(private options: SvelteKitScannerOptions = {}) {}

  /**
   * Scans the SvelteKit routes directory.
   *
   * Identifies page routes by looking for `+page.svelte` (or `.js`/.`ts`) files,
   * correctly handling route groups and dynamic parameters.
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
      : join(cwd, 'src', 'routes')

    if (this.dirExists(routesDir)) {
      routes.push(...this.scanDir(routesDir))
    }

    return routes.filter((route) => !this.shouldExclude(route.path))
  }

  private scanDir(dir: string, basePath = ''): ScannedRoute[] {
    const routes: ScannedRoute[] = []

    try {
      const entries = readdirSync(dir)

      // Check if this directory is a page
      const isPage = entries.some(
        (e) => e === '+page.svelte' || e === '+page.js' || e === '+page.ts'
      )

      if (isPage) {
        const path = normalizePath(basePath || '/')
        routes.push({
          path,
          method: 'GET',
          isDynamic: isDynamicRoute(path),
          params: extractParams(path),
        })
      }

      // Recurse into subdirectories
      for (const entry of entries) {
        // Skip hidden files/dirs and special SvelteKit files (+)
        if (entry.startsWith('.') || entry.startsWith('+') || entry === 'node_modules') {
          continue
        }

        const fullPath = join(dir, entry)
        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          // Handle Route Groups (group) -> skip name
          if (entry.startsWith('(') && entry.endsWith(')')) {
            routes.push(...this.scanDir(fullPath, basePath))
            continue
          }

          // Handle Dynamic Segments [slug] -> :slug
          let segment = entry
          if (entry.startsWith('[') && entry.endsWith(']')) {
            // Handle catch-all [...slug] or [[...slug]]
            if (entry.includes('...')) {
              const name = entry.replace(/\[|\]|\./g, '')
              segment = `:${name}*`
            } else {
              segment = `:${entry.slice(1, -1)}`
            }
          }

          routes.push(...this.scanDir(fullPath, `${basePath}/${segment}`))
        }
      }
    } catch {
      // Directory error
    }

    return routes
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
