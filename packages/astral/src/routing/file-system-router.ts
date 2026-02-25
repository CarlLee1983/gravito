/**
 * Bun File System Router Integration for Astral
 *
 * Provides filesystem-based routing for static site generation and API
 * route discovery. Enables Next.js-style file-system routing patterns.
 *
 * Reference: https://bun.sh/docs/runtime/file-system-router
 */

import { readdir } from 'node:fs/promises'
import type { FileSystemRouter } from 'bun'

/**
 * Route match result from FileSystemRouter
 */
export interface RouteMatch {
  /**
   * The matched route pattern (e.g., "/blog/[slug]")
   */
  pathname: string

  /**
   * Dynamic parameters extracted from the path (e.g., { slug: "my-post" })
   */
  params: Record<string, string>

  /**
   * Query string parameters (e.g., { page: "1" })
   */
  query: Record<string, string | string[]>

  /**
   * Filesystem path to the matched file
   */
  src: string
}

/**
 * Configuration options for Astral File System Router
 */
export interface AstralRouterConfig {
  /**
   * Pages directory to scan for routes
   * @example "./pages", "./src/pages"
   */
  dir: string

  /**
   * Base URL or domain (for absolute path generation)
   * @example "https://example.com", "http://localhost:3000"
   */
  origin: string

  /**
   * Prefix for static assets (optional)
   * @default "/"
   * @example "/static", "/_next/static"
   */
  assetPrefix?: string

  /**
   * Custom file extensions to recognize as routes
   * @default [".ts", ".tsx", ".md"]
   */
  fileExtensions?: string[]

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean
}

/**
 * Route metadata for static site generation
 */
export interface StaticRouteMetadata {
  /**
   * Route pathname
   */
  pathname: string

  /**
   * Dynamic parameters if route is dynamic
   */
  params?: Record<string, string>

  /**
   * Source file path
   */
  src: string

  /**
   * Whether this is a dynamic route
   */
  isDynamic: boolean

  /**
   * Whether this is a catch-all route
   */
  isCatchAll: boolean

  /**
   * Absolute URL for this route
   */
  url: string
}

/**
 * Astral File System Router
 *
 * Manages filesystem-based routing for Astral static sites.
 * Supports Next.js-style routing patterns:
 * - `/page.tsx` → `/`
 * - `/about.tsx` → `/about`
 * - `/blog/[slug].tsx` → `/blog/:slug`
 * - `/[...catchall].tsx` → `/*`
 *
 * @example
 * ```typescript
 * const router = new AstralFileSystemRouter({
 *   dir: './pages',
 *   origin: 'https://example.com',
 * });
 *
 * const match = router.match('/blog/hello-world');
 * console.log(match.params.slug); // "hello-world"
 * ```
 */
export class AstralFileSystemRouter {
  private router: FileSystemRouter
  private config: AstralRouterConfig

  /**
   * Create a new Astral File System Router
   */
  constructor(config: AstralRouterConfig) {
    this.config = {
      assetPrefix: '/',
      fileExtensions: ['.ts', '.tsx', '.md'],
      debug: false,
      ...config,
    }

    if (this.config.debug) {
      console.log(`[Astral Router] Initializing with:`, {
        dir: this.config.dir,
        origin: this.config.origin,
        assetPrefix: this.config.assetPrefix,
        fileExtensions: this.config.fileExtensions,
      })
    }

    this.router = new Bun.FileSystemRouter({
      style: 'nextjs',
      dir: this.config.dir,
      origin: this.config.origin,
      assetPrefix: this.config.assetPrefix,
      fileExtensions: this.config.fileExtensions,
    })
  }

  /**
   * Match a pathname against routes and return metadata
   *
   * @param pathname - URL pathname to match (e.g., "/blog/my-post")
   * @returns Route match information or null if no match found
   *
   * @example
   * ```typescript
   * const match = router.match('/blog/getting-started');
   * if (match) {
   *   console.log(match.pathname);  // "/blog/[slug]"
   *   console.log(match.params);    // { slug: "getting-started" }
   *   console.log(match.src);       // "/path/to/pages/blog/[slug].tsx"
   * }
   * ```
   */
  match(pathname: string): RouteMatch | null {
    try {
      const route = this.router.match(pathname)

      if (!route) {
        if (this.config.debug) {
          console.log(`[Astral Router] No match for: ${pathname}`)
        }
        return null
      }

      if (this.config.debug) {
        console.log(`[Astral Router] Matched: ${pathname} → ${route.pathname}`)
      }

      return {
        pathname: route.pathname,
        params: route.params || {},
        query: route.query || {},
        src: route.src || '',
      }
    } catch (error) {
      console.error(`[Astral Router] Match error for ${pathname}:`, error)
      return null
    }
  }

  /**
   * Get route metadata for static site generation
   *
   * Useful for generating static files or creating sitemaps.
   *
   * @param pathname - Route pathname
   * @returns Route metadata
   *
   * @example
   * ```typescript
   * const meta = router.getRouteMetadata('/blog/[slug]');
   * console.log(meta.isDynamic); // true
   * console.log(meta.url);       // "https://example.com/blog/[slug]"
   * ```
   */
  getRouteMetadata(pathname: string): StaticRouteMetadata | null {
    const match = this.match(pathname)
    if (!match) {
      return null
    }

    const isDynamic = pathname.includes('[') && pathname.includes(']')
    const isCatchAll = pathname.includes('[...') && pathname.includes(']')

    return {
      pathname: match.pathname,
      params: Object.keys(match.params).length > 0 ? match.params : undefined,
      src: match.src,
      isDynamic,
      isCatchAll,
      url: new URL(match.pathname, this.config.origin).toString(),
    }
  }

  /**
   * Get all static routes that can be pre-generated
   *
   * Returns non-catch-all routes suitable for static generation.
   *
   * @returns Array of static route pathnames
   *
   * @example
   * ```typescript
   * const staticRoutes = router.getStaticRoutes();
   * staticRoutes.forEach(route => {
   *   console.log(`Generating: ${route}`);
   * });
   * ```
   */
  async getStaticRoutes(): Promise<string[]> {
    const routes: string[] = []

    // Scan directory for .tsx/.ts/.md files
    try {
      const files = await this.scanDirectory(this.config.dir)

      files.forEach((file) => {
        // Convert file path to route pathname
        const route = this.filePathToRoute(file)
        if (route && !route.includes('[...')) {
          routes.push(route)
        }
      })
    } catch (error) {
      console.error(`[Astral Router] Error scanning directory:`, error)
    }

    return routes
  }

  /**
   * Get all dynamic routes (with parameters)
   *
   * Returns routes with dynamic segments for special handling.
   *
   * @returns Array of dynamic route pathnames
   *
   * @example
   * ```typescript
   * const dynamicRoutes = router.getDynamicRoutes();
   * // ["/blog/[slug]", "/docs/[...path]"]
   * ```
   */
  async getDynamicRoutes(): Promise<string[]> {
    const routes: string[] = []

    try {
      const files = await this.scanDirectory(this.config.dir)

      files.forEach((file) => {
        const route = this.filePathToRoute(file)
        if (route?.includes('[')) {
          routes.push(route)
        }
      })
    } catch (error) {
      console.error(`[Astral Router] Error scanning directory:`, error)
    }

    return routes
  }

  /**
   * Reload routes (useful for development watch mode)
   *
   * Rescans the pages directory for file changes.
   *
   * @example
   * ```typescript
   * // Watch for file changes and reload routes
   * const watcher = Bun.watch(pagesDir, () => {
   *   router.reload();
   *   console.log("Routes reloaded");
   * });
   * ```
   */
  reload(): void {
    try {
      this.router.reload()
      if (this.config.debug) {
        console.log(`[Astral Router] Routes reloaded`)
      }
    } catch (error) {
      console.error(`[Astral Router] Reload error:`, error)
    }
  }

  /**
   * Check if a pathname matches any route
   */
  hasRoute(pathname: string): boolean {
    return this.match(pathname) !== null
  }

  /**
   * Get route parameters without full match
   */
  getParams(pathname: string): Record<string, string> | null {
    const match = this.match(pathname)
    return match ? match.params : null
  }

  /**
   * Generate absolute URL for a route
   */
  getUrl(pathname: string): string | null {
    const match = this.match(pathname)
    if (!match) {
      return null
    }

    try {
      return new URL(match.pathname, this.config.origin).toString()
    } catch (error) {
      console.error(`[Astral Router] URL generation error:`, error)
      return null
    }
  }

  /**
   * Helper: Scan directory for route files
   */
  private async scanDirectory(dir: string): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = await readdir(dir)

      for (const entry of entries) {
        const fullPath = `${dir}/${entry}`

        // Check if it's a route file
        if (this.isRouteFile(entry) && !entry.startsWith('.')) {
          files.push(fullPath)
        }

        // Recursively scan subdirectories
        // Check if path is a directory by trying to read it
        try {
          await readdir(fullPath)
          files.push(...(await this.scanDirectory(fullPath)))
        } catch {
          // Not a directory, skip
        }
      }
    } catch (error) {
      if (this.config.debug) {
        console.error(`[Astral Router] Scan error for ${dir}:`, error)
      }
    }

    return files
  }

  /**
   * Helper: Check if file is a route file
   */
  private isRouteFile(filename: string): boolean {
    const extensions = this.config.fileExtensions || ['.ts', '.tsx', '.md']
    return extensions.some((ext) => filename.endsWith(ext))
  }

  /**
   * Helper: Convert file path to route pathname
   */
  private filePathToRoute(filePath: string): string | null {
    try {
      // Remove directory prefix and file extension
      let route = filePath.replace(this.config.dir, '').replace(/\.[^/.]+$/, '')

      // Convert index files to directory routes
      route = route.replace(/\/index$/, '') || '/'

      return route
    } catch (error) {
      console.error(`[Astral Router] Route conversion error:`, error)
      return null
    }
  }
}

/**
 * Create an Astral File System Router instance
 *
 * Shorthand function for quick router creation.
 *
 * @param config - Router configuration
 * @returns AstralFileSystemRouter instance
 *
 * @example
 * ```typescript
 * const router = createAstralRouter({
 *   dir: './pages',
 *   origin: 'https://example.com',
 * });
 * ```
 */
export function createAstralRouter(config: AstralRouterConfig): AstralFileSystemRouter {
  return new AstralFileSystemRouter(config)
}

/**
 * Create a development mode router with debugging
 *
 * @param pagesDir - Pages directory path
 * @param origin - Site origin URL
 * @returns Router configured for development
 *
 * @example
 * ```typescript
 * const router = createDevRouter('./pages', 'http://localhost:3000');
 * ```
 */
export function createDevRouter(pagesDir: string, origin: string): AstralFileSystemRouter {
  return new AstralFileSystemRouter({
    dir: pagesDir,
    origin,
    debug: true,
    assetPrefix: '/_astral/static',
  })
}

/**
 * Create a production mode router
 *
 * @param pagesDir - Pages directory path
 * @param origin - Site origin URL
 * @param assetPrefix - CDN asset prefix (optional)
 * @returns Router configured for production
 *
 * @example
 * ```typescript
 * const router = createProdRouter(
 *   './dist/pages',
 *   'https://example.com',
 *   'https://cdn.example.com/assets'
 * );
 * ```
 */
export function createProdRouter(
  pagesDir: string,
  origin: string,
  assetPrefix?: string
): AstralFileSystemRouter {
  return new AstralFileSystemRouter({
    dir: pagesDir,
    origin,
    debug: false,
    assetPrefix: assetPrefix || '/static',
  })
}
