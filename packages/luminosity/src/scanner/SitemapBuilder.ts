import type { SitemapEntry } from '../interfaces'
import type {
  DynamicRouteResolver,
  RouteScanner,
  ScannedRoute,
  SitemapBuilderOptions,
} from './types'
import { matchesPatterns, replaceParams } from './utils'

/**
 * SitemapBuilder
 *
 * A unified builder that takes a RouteScanner and generates SitemapEntry[]
 * by scanning routes and resolving dynamic parameters.
 *
 * @example
 * ```typescript
 * const builder = new SitemapBuilder({
 *   scanner: new GravitoScanner(core),
 *   hostname: 'https://example.com',
 *   dynamicResolvers: [
 *     {
 *       pattern: '/blog/:slug',
 *       resolve: async () => {
 *         const posts = await Post.all()
 *         return posts.map(p => ({ slug: p.slug }))
 *       }
 *     }
 *   ]
 * })
 *
 * const entries = await builder.build()
 * ```
 */
export class SitemapBuilder {
  private scanner: RouteScanner
  private dynamicResolvers: Map<string, DynamicRouteResolver> = new Map()
  private options: SitemapBuilderOptions

  constructor(options: SitemapBuilderOptions) {
    this.scanner = options.scanner
    this.options = options

    // Index dynamic resolvers by pattern
    for (const resolver of options.dynamicResolvers ?? []) {
      this.dynamicResolvers.set(resolver.pattern, resolver)
    }
  }

  /**
   * Register a dynamic route resolver.
   *
   * @param resolver - The resolver configuration.
   * @returns The builder instance for chaining.
   */
  addResolver(resolver: DynamicRouteResolver): this {
    this.dynamicResolvers.set(resolver.pattern, resolver)
    return this
  }

  /**
   * Build sitemap entries from scanned routes.
   *
   * Scans all routes, filters them based on patterns and exclusions,
   * resolves dynamic parameters, and generates final sitemap entries.
   *
   * @param hostname - Optional override for the base URL.
   * @returns A promise that resolves to an array of sitemap entries.
   * @throws {Error} If scanning fails.
   */
  async build(hostname?: string): Promise<SitemapEntry[]> {
    const baseUrl = hostname ?? this.options.hostname ?? ''
    const routes = await this.scanner.scan()
    const entries: SitemapEntry[] = []

    for (const route of routes) {
      // Only process GET routes for sitemap
      if (route.method !== 'GET' && route.method !== 'ALL') {
        continue
      }

      // Check exclusion patterns
      if (route.meta?.exclude) {
        continue
      }

      if (
        this.options.excludePatterns?.length &&
        matchesPatterns(route.path, this.options.excludePatterns)
      ) {
        continue
      }

      // Check inclusion patterns
      if (
        this.options.includePatterns?.length &&
        !matchesPatterns(route.path, this.options.includePatterns)
      ) {
        continue
      }

      // Process route
      const routeEntries = await this.processRoute(route, baseUrl)
      entries.push(...routeEntries)
    }

    return entries
  }

  /**
   * Process a single route and return sitemap entries.
   *
   * Handles both static and dynamic routes. For dynamic routes, it looks up
   * the corresponding resolver to generate all possible URL variations.
   *
   * @param route - The scanned route.
   * @param baseUrl - The base URL of the site.
   * @returns A promise resolving to an array of entries.
   */
  private async processRoute(route: ScannedRoute, baseUrl: string): Promise<SitemapEntry[]> {
    const entries: SitemapEntry[] = []

    if (route.isDynamic) {
      // Dynamic route - needs resolver
      const resolver = this.dynamicResolvers.get(route.path)

      if (resolver) {
        const paramSets = await resolver.resolve()

        for (const params of paramSets) {
          const url = replaceParams(route.path, params)
          entries.push(this.createEntry(url, baseUrl, route, resolver.meta))
        }
      } else {
        // No resolver for this dynamic route - skip with warning
        console.warn(
          `[Luminosity] No resolver for dynamic route: ${route.path}. ` +
            `Add a DynamicRouteResolver for this pattern to include it in the sitemap.`
        )
      }
    } else {
      // Static route - add directly
      entries.push(this.createEntry(route.path, baseUrl, route))
    }

    return entries
  }

  /**
   * Create a SitemapEntry from route information.
   *
   * @param path - The URL path.
   * @param baseUrl - The base URL.
   * @param route - The original scanned route info.
   * @param resolverMeta - Optional metadata from the dynamic resolver.
   * @returns The fully constructed sitemap entry.
   */
  private createEntry(
    path: string,
    baseUrl: string,
    route: ScannedRoute,
    resolverMeta?: DynamicRouteResolver['meta']
  ): SitemapEntry {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    // Merge priorities: resolver meta > route meta > defaults
    const priority = resolverMeta?.priority ?? route.meta?.priority ?? this.options.defaultPriority

    const changefreq =
      resolverMeta?.changefreq ?? route.meta?.changefreq ?? this.options.defaultChangefreq

    const lastmod = resolverMeta?.lastmod ?? route.meta?.lastmod

    const entry: SitemapEntry = {
      url: `${baseUrl.replace(/\/$/, '')}${normalizedPath}`,
    }

    if (priority !== undefined) {
      entry.priority = priority
    }

    if (changefreq !== undefined) {
      entry.changefreq = changefreq
    }

    if (lastmod !== undefined) {
      entry.lastmod = lastmod
    }

    return entry
  }

  /**
   * Get framework name from scanner.
   *
   * @returns The framework identifier.
   */
  get framework(): string {
    return this.scanner.framework
  }

  /**
   * Get all registered dynamic resolvers.
   *
   * @returns An array of registered resolvers.
   */
  get resolvers(): DynamicRouteResolver[] {
    return Array.from(this.dynamicResolvers.values())
  }
}
