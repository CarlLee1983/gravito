import type { RouteScanner, ScannedRoute } from '../types'
import { extractParams, isDynamicRoute } from '../utils'

/**
 * Options for ExpressScanner
 */
export interface ExpressScannerOptions {
  /** Exclude certain route patterns from scanning */
  excludePatterns?: (string | RegExp)[]

  /** Only include routes matching these patterns */
  includePatterns?: (string | RegExp)[]
}

/**
 * Express layer interface (internal Express structure)
 */
interface ExpressLayer {
  route?: {
    path: string
    methods: Record<string, boolean>
  }
  name?: string
  handle?: {
    stack?: ExpressLayer[]
  }
  regexp?: RegExp
  path?: string
}

/**
 * Express-like interface for duck typing
 */
interface ExpressLike {
  _router?: {
    stack: ExpressLayer[]
  }
}

/**
 * ExpressScanner
 *
 * Scans routes registered in an Express application.
 * Note: Uses internal _router.stack property which is undocumented.
 *
 * @example
 * ```typescript
 * import express from 'express'
 * import { ExpressScanner, SitemapBuilder } from '@gravito/luminosity'
 *
 * const app = express()
 * app.get('/hello', (req, res) => res.send('Hello'))
 * app.get('/blog/:slug', (req, res) => res.send('Blog'))
 *
 * const builder = new SitemapBuilder({
 *   scanner: new ExpressScanner(app),
 *   hostname: 'https://example.com'
 * })
 *
 * const entries = await builder.build()
 * ```
 */
export class ExpressScanner implements RouteScanner {
  readonly framework = 'express'

  constructor(
    private app: ExpressLike,
    private options: ExpressScannerOptions = {}
  ) {}

  async scan(): Promise<ScannedRoute[]> {
    const routes: ScannedRoute[] = []

    // Express uses internal _router.stack property
    const stack = this.app._router?.stack ?? []

    this.scanStack(stack, '', routes)

    return routes
  }

  /**
   * Recursively scan Express router stack
   */
  private scanStack(stack: ExpressLayer[], basePath: string, routes: ScannedRoute[]): void {
    for (const layer of stack) {
      if (layer.route) {
        // This is a route layer
        const path = this.normalizePath(basePath + layer.route.path)

        // Apply include/exclude filters
        if (this.shouldExclude(path)) {
          continue
        }

        const methods = Object.keys(layer.route.methods).filter((m) => layer.route?.methods[m])

        for (const method of methods) {
          routes.push({
            path,
            method: this.normalizeMethod(method),
            isDynamic: isDynamicRoute(path),
            params: extractParams(path),
          })
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        // This is a mounted router
        const routerPath = layer.regexp
          ? this.extractPathFromRegexp(layer.regexp)
          : (layer.path ?? '')

        this.scanStack(layer.handle.stack, basePath + routerPath, routes)
      }
    }
  }

  /**
   * Extract path prefix from Express router regexp
   */
  private extractPathFromRegexp(regexp: RegExp): string {
    const match = regexp.source.match(/^\^\\\/([^?\\]+)/)
    if (match?.[1]) {
      return `/${match[1].replace(/\\\//g, '/')}`
    }
    return ''
  }

  private normalizePath(path: string): string {
    // Remove duplicate slashes
    return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
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
