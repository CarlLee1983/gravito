import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { RouteScanner, ScannedRoute } from '../types'
import { extractParams, isDynamicRoute, normalizePath } from '../utils'

/**
 * Options for NuxtScanner
 */
export interface NuxtScannerOptions {
  /** Pages directory path (default: ./pages) */
  pagesDir?: string

  /** Source directory (default: ./) */
  srcDir?: string

  /** Exclude certain route patterns from scanning */
  excludePatterns?: (string | RegExp)[]

  /** Only include routes matching these patterns */
  includePatterns?: (string | RegExp)[]

  /** Current working directory (default: process.cwd()) */
  cwd?: string
}

/**
 * NuxtScanner
 *
 * Scans routes from Nuxt.js pages directory.
 * Supports both Nuxt 2 (_param) and Nuxt 3 ([param]) dynamic route syntax.
 *
 * @example
 * ```typescript
 * import { NuxtScanner, SitemapBuilder } from '@gravito/luminosity'
 *
 * const builder = new SitemapBuilder({
 *   scanner: new NuxtScanner({ pagesDir: './pages' }),
 *   hostname: 'https://example.com'
 * })
 *
 * const entries = await builder.build()
 * ```
 */
export class NuxtScanner implements RouteScanner {
  readonly framework = 'nuxt'

  constructor(private options: NuxtScannerOptions = {}) {}

  /**
   * Scans the Nuxt.js pages directory for routes.
   *
   * Handles both Nuxt 2 and Nuxt 3 routing conventions.
   *
   * @returns A promise resolving to the list of scanned routes.
   */
  async scan(): Promise<ScannedRoute[]> {
    const cwd = this.options.cwd ?? process.cwd()
    const srcDir = join(cwd, this.options.srcDir ?? '')
    const pagesDir = join(srcDir, this.options.pagesDir ?? 'pages')

    if (!this.dirExists(pagesDir)) {
      return []
    }

    const routes = this.scanDir(pagesDir)

    // Apply filters
    return routes.filter((route) => !this.shouldExclude(route.path))
  }

  /**
   * Recursively scan Nuxt pages directory
   */
  private scanDir(dir: string, basePath = ''): ScannedRoute[] {
    const routes: ScannedRoute[] = []

    try {
      const entries = readdirSync(dir)

      for (const entry of entries) {
        // Skip hidden files and node_modules
        if (entry.startsWith('.') || entry === 'node_modules') {
          continue
        }

        const fullPath = join(dir, entry)
        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          // Convert directory name to route segment
          const segment = this.convertToSegment(entry)
          routes.push(...this.scanDir(fullPath, `${basePath}/${segment}`))
        } else if (entry.endsWith('.vue')) {
          const name = entry.replace('.vue', '')
          const path = this.buildRoutePath(basePath, name)

          routes.push({
            path,
            method: 'GET',
            isDynamic: isDynamicRoute(path),
            params: extractParams(path),
          })
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return routes
  }

  /**
   * Convert file/directory name to route segment
   *
   * Nuxt 3: [slug] -> :slug, [[slug]] -> :slug?
   * Nuxt 2: _slug -> :slug
   */
  private convertToSegment(name: string): string {
    // Nuxt 3 optional catch-all: [[...slug]]
    if (name.startsWith('[[...') && name.endsWith(']]')) {
      return `:${name.slice(5, -2)}*`
    }

    // Nuxt 3 catch-all: [...slug]
    if (name.startsWith('[...') && name.endsWith(']')) {
      return `:${name.slice(4, -1)}*`
    }

    // Nuxt 3 dynamic: [slug]
    if (name.startsWith('[') && name.endsWith(']')) {
      return `:${name.slice(1, -1)}`
    }

    // Nuxt 2 dynamic: _slug
    if (name.startsWith('_')) {
      return `:${name.slice(1)}`
    }

    return name
  }

  /**
   * Build the final route path from base path and file name
   */
  private buildRoutePath(basePath: string, name: string): string {
    let path: string

    if (name === 'index') {
      path = basePath || '/'
    } else {
      const segment = this.convertToSegment(name)
      path = `${basePath}/${segment}`
    }

    return normalizePath(path)
  }

  private dirExists(path: string): boolean {
    try {
      return statSync(path).isDirectory()
    } catch {
      return false
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
