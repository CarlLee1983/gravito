import type { ChangeFreq } from '../types'

/**
 * Scanned route information from a framework.
 *
 * Represents a route discovered by a scanner, including its path, method,
 * parameters, and optional metadata.
 *
 * @public
 * @since 3.0.0
 */
export interface ScannedRoute {
  /** Route path (may contain params like /blog/:slug) */
  path: string

  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL'

  /** Whether this is a dynamic route with parameters */
  isDynamic: boolean

  /** List of parameter names extracted from the path */
  params?: string[]

  /** Additional metadata for sitemap generation */
  meta?: {
    priority?: number
    changefreq?: ChangeFreq
    exclude?: boolean
    lastmod?: Date | string
  }
}

/**
 * Route Scanner Interface - Framework Agnostic.
 *
 * Implementations scan registered routes from various frameworks
 * and return a standardized list of ScannedRoute objects.
 *
 * @public
 * @since 3.0.0
 */
export interface RouteScanner {
  /**
   * Scan and return all indexable routes.
   *
   * @returns A promise resolving to an array of ScannedRoute objects.
   */
  scan(): Promise<ScannedRoute[]>

  /** Framework name (e.g., 'gravito', 'hono', 'express', 'next.js', 'nuxt') */
  readonly framework: string
}

/**
 * Dynamic Route Resolver.
 *
 * Used to expand dynamic routes (e.g., /blog/:slug) into actual URLs
 * by providing all possible parameter combinations.
 *
 * @public
 * @since 3.0.0
 */
export interface DynamicRouteResolver {
  /** Route pattern (e.g., /blog/:slug, /products/:category/:id) */
  pattern: string

  /**
   * Resolve function - returns all possible parameter combinations.
   *
   * @returns A promise resolving to an array of parameter objects.
   */
  resolve: () => Promise<Record<string, string | number>[]> | Record<string, string | number>[]

  /** Optional metadata to apply to all resolved URLs */
  meta?: {
    priority?: number
    changefreq?: ChangeFreq
    lastmod?: Date | string
  }
}

/**
 * Options for SitemapBuilder.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapBuilderOptions {
  /** Route scanner instance */
  scanner: RouteScanner

  /** Dynamic route resolvers for parametric routes */
  dynamicResolvers?: DynamicRouteResolver[]

  /** Base URL for sitemap (e.g., 'https://example.com') */
  hostname?: string

  /** Default priority for routes without explicit priority */
  defaultPriority?: number

  /** Default change frequency for routes */
  defaultChangefreq?: ChangeFreq

  /** Patterns to exclude from sitemap (glob or regex) */
  excludePatterns?: (string | RegExp)[]

  /** Only include routes matching these patterns */
  includePatterns?: (string | RegExp)[]
}
