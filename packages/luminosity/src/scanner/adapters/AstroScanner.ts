import { readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { RouteScanner, ScannedRoute } from '../types'
import { extractParams, isDynamicRoute, matchesPatterns, normalizePath } from '../utils'

/**
 * Options for configuring the `AstroScanner`.
 *
 * @public
 * @since 3.0.0
 */
export interface AstroScannerOptions {
  /** Path to the Astro pages directory. @default './src/pages' */
  pagesDir?: string

  /** An array of patterns (strings or RegExps) to exclude from the sitemap. */
  excludePatterns?: (string | RegExp)[]

  /** If provided, only routes matching these patterns will be included. */
  includePatterns?: (string | RegExp)[]

  /** The current working directory for resolving relative paths. @default process.cwd() */
  cwd?: string
}

/**
 * AstroScanner automatically discovers routes from an Astro project's filesystem.
 *
 * It scans the `src/pages` directory and handles `.astro`, `.md`, `.mdx`, `.ts`,
 * and `.js` files, converting Astro's dynamic segment syntax (e.g., `[slug].astro`)
 * into standard route parameters.
 *
 * @example
 * ```typescript
 * import { AstroScanner } from '@gravito/luminosity/scanner';
 *
 * const scanner = new AstroScanner({
 *   excludePatterns: ['/admin/**']
 * });
 * const routes = await scanner.scan();
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class AstroScanner implements RouteScanner {
  readonly framework = 'astro'

  constructor(private options: AstroScannerOptions = {}) {}

  /**
   * Scans the Astro pages directory for routes.
   *
   * @returns A promise resolving to the list of scanned routes.
   */
  async scan(): Promise<ScannedRoute[]> {
    const routes: ScannedRoute[] = []
    const cwd = this.options.cwd ?? process.cwd()
    const pagesDir = this.options.pagesDir
      ? this.options.pagesDir.startsWith('/')
        ? this.options.pagesDir
        : join(cwd, this.options.pagesDir)
      : join(cwd, 'src', 'pages')

    if (this.dirExists(pagesDir)) {
      routes.push(...this.scanDir(pagesDir))
    }

    return routes.filter((route) => !this.shouldExclude(route.path))
  }

  private scanDir(dir: string, basePath = ''): ScannedRoute[] {
    const routes: ScannedRoute[] = []

    try {
      const entries = readdirSync(dir)

      for (const entry of entries) {
        // Skip hidden files and common ignored patterns
        if (entry.startsWith('.') || entry === 'node_modules') {
          continue
        }

        const fullPath = join(dir, entry)
        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          // Astro directories contribute to path
          // Note: Astro doesn't have "groups" like (group) by default,
          // but we'll follow standard directory logic.
          routes.push(...this.scanDir(fullPath, `${basePath}/${entry}`))
        } else if (this.isRouteFile(entry)) {
          const name = entry.replace(/\.(astro|md|mdx|ts|js)$/, '')
          let path: string

          if (name === 'index') {
            path = basePath || '/'
          } else {
            // Handle dynamic segments: [slug] -> :slug, [...slug] -> :slug*
            let segment = name
            if (segment.startsWith('[...') && segment.endsWith(']')) {
              segment = `:${segment.slice(4, -1)}*`
            } else if (segment.startsWith('[') && segment.endsWith(']')) {
              segment = `:${segment.slice(1, -1)}`
            }
            path = `${basePath}/${segment}`
          }

          const normalized = normalizePath(path)

          routes.push({
            path: normalized,
            method: 'GET',
            isDynamic: isDynamicRoute(normalized),
            params: extractParams(normalized),
          })
        }
      }
    } catch {
      // Directory error
    }

    return routes
  }

  private isRouteFile(filename: string): boolean {
    const ext = extname(filename)
    return ['.astro', '.md', '.mdx', '.ts', '.js'].includes(ext) && !filename.startsWith('_')
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
