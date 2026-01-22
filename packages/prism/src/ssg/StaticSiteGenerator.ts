import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { PlanetCore } from '@gravito/core'
import { type DynamicRoute, DynamicRouteResolver } from './DynamicRouteResolver'
import { IncrementalBuilder } from './IncrementalBuilder'

/**
 * SSG Route interface
 */
interface SSGRoute {
  path: string
  method: string
}

/**
 * Router with route access methods
 */
interface RouterWithRoutes {
  routes?: SSGRoute[]
  getRoutes?: () => SSGRoute[]
}

export interface ExportOptions {
  baseUrl?: string
  concurrency?: number
  timeout?: number
  incremental?: boolean
  force?: boolean
  manifestPath?: string
  extraPaths?: string[]
}

/**
 * Static Site Generator for Gravito Prism.
 *
 * It crawls registered GET routes from the PlanetCore router and exports them
 * as static HTML files. It also automatically generates a `sitemap.xml` and `robots.txt`.
 *
 * @example
 * ```typescript
 * const ssg = new StaticSiteGenerator(core);
 * await ssg.export('./dist');
 * ```
 * @public
 */
export class StaticSiteGenerator {
  /**
   * Create a new SSG instance.
   * @param core - The PlanetCore instance to crawl routes from.
   */
  constructor(private core: PlanetCore) {}

  async exportDynamic(
    dynamicRoutes: DynamicRoute[],
    outputDir: string,
    options: ExportOptions = {}
  ): Promise<void> {
    const baseUrl = options.baseUrl ?? 'https://gravito.dev'

    this.core.logger.info('[SSG] Resolving dynamic routes...')
    const resolved = await DynamicRouteResolver.resolve(dynamicRoutes)
    this.core.logger.info(`[SSG] Resolved ${resolved.length} static paths from dynamic routes`)

    if (options.incremental) {
      const builder = new IncrementalBuilder(this.core, outputDir, options)
      await builder.export(resolved, baseUrl, options)
    } else {
      await this.exportRoutes(resolved, outputDir, baseUrl, options)
    }
  }

  async exportIncremental(outputDir: string, options: ExportOptions = {}): Promise<void> {
    const baseUrl = options.baseUrl ?? 'https://gravito.dev'

    const routes = this.getStaticRoutes()
    const extraPaths = (options.extraPaths ?? []).map((p) => ({ path: p }))
    const resolved = [...routes.map((r) => ({ path: r.path })), ...extraPaths]

    const builder = new IncrementalBuilder(this.core, outputDir, options)
    await builder.export(resolved, baseUrl, options)

    await this.generateSitemap(outputDir, resolved, baseUrl)
    await this.generateRobotsTxt(outputDir, baseUrl)
  }

  private async exportRoutes(
    routes: Array<{ path: string; getData?: () => Promise<any> }>,
    outputDir: string,
    baseUrl: string,
    options: ExportOptions = {}
  ): Promise<void> {
    const concurrency = options.concurrency ?? 10
    const timeout = options.timeout ?? 30000

    const queue = [...routes]
    const total = routes.length
    let success = 0
    let failed = 0

    const worker = async () => {
      while (queue.length > 0) {
        const route = queue.shift()
        if (!route) break

        try {
          const url = `http://localhost${route.path}`
          const request = new Request(url, {
            signal: AbortSignal.timeout(timeout),
          })

          const response = await this.core.adapter.fetch(request)

          if (!response.ok) {
            this.core.logger.warn(`[SSG] ⚠️ Skipping ${route.path}: Status ${response.status}`)
            failed++
            continue
          }

          const html = await response.text()

          const pathWithoutQuery = route.path.split('?')[0]
          let relativePath =
            pathWithoutQuery === '/'
              ? 'index.html'
              : `${pathWithoutQuery.replace(/^\//, '')}/index.html`

          if (pathWithoutQuery.endsWith('.html')) {
            relativePath = pathWithoutQuery.replace(/^\//, '')
          }

          const absolutePath = join(outputDir, relativePath)
          await mkdir(dirname(absolutePath), { recursive: true })
          await writeFile(absolutePath, html, 'utf-8')

          success++
          this.core.logger.info(`[SSG] ✅ Rendered (${success + failed}/${total}): ${route.path}`)
        } catch (error: any) {
          failed++
          this.core.logger.error(`[SSG] ❌ Failed ${route.path}: ${error.message}`)
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker())
    await Promise.all(workers)

    this.core.logger.info(`[SSG] Export complete! Success: ${success}, Failed: ${failed}`)
  }

  private getStaticRoutes(): Array<{ path: string; method: string }> {
    const router = this.core.router as RouterWithRoutes
    let routes: SSGRoute[] = []

    if (Array.isArray(router.routes)) {
      routes = router.routes
    } else if (typeof router.getRoutes === 'function') {
      routes = router.getRoutes()
    }

    return routes.filter(
      (r: SSGRoute) =>
        r?.method?.toLowerCase() === 'get' &&
        r.path &&
        !r.path.includes(':') &&
        !r.path.includes('*') &&
        !r.path.includes('[')
    )
  }

  async export(
    outputDir: string,
    baseUrl = 'https://gravito.dev',
    extraPaths: string[] = []
  ): Promise<void> {
    this.core.logger.info(`[SSG] Starting static export to: ${outputDir}`)

    // Get routes from either PlanetCore Router or Gravito AOTRouter
    let routes: SSGRoute[] = []
    const router = this.core.router as RouterWithRoutes

    if (Array.isArray(router.routes)) {
      routes = router.routes
    } else if (typeof router.getRoutes === 'function') {
      routes = router.getRoutes()
    } else {
      this.core.logger.warn('[SSG] Could not detect routes specific format. SSG might fail.')
    }

    // Deduplicate routes based on path
    const uniquePaths = new Set<string>()
    const uniqueRoutes: SSGRoute[] = []

    const addRoute = (r: SSGRoute | { path: string; method?: string }) => {
      if (r?.path && !uniquePaths.has(r.path)) {
        uniquePaths.add(r.path)
        uniqueRoutes.push({
          path: r.path,
          method: r.method ?? 'GET',
        })
      }
    }

    // Process router routes
    if (Array.isArray(routes)) {
      routes
        .filter(
          (r) =>
            r?.method &&
            r.method.toLowerCase() === 'get' &&
            r.path &&
            !r.path.includes(':') &&
            !r.path.includes('*')
        )
        .forEach(addRoute)
    }

    // Process extra paths
    extraPaths.forEach((path) => {
      if (path) {
        addRoute({ path, method: 'GET' })
      }
    })

    const total = uniqueRoutes.length
    this.core.logger.info(`[SSG] Found ${total} unique static routes for export.`)

    if (total === 0) {
      this.core.logger.warn('[SSG] No static routes found to export.')
      return
    }

    // Concurrency control
    const CONCURRENCY = 10
    const queue = [...uniqueRoutes]
    let success = 0
    let failed = 0

    const worker = async () => {
      while (queue.length > 0) {
        const route = queue.shift()
        if (!route) {
          break
        }

        try {
          const url = `http://localhost${route.path}`

          // Use adapter.fetch with a timeout signal
          const request = new Request(url, {
            signal: AbortSignal.timeout(30000), // 30 second timeout per page
          })

          const response = await this.core.adapter.fetch(request)

          if (!response.ok) {
            this.core.logger.warn(
              `[SSG] ⚠️ Skipping ${route.path}: Returned status ${response.status}`
            )
            failed++
            continue
          }

          const html = await response.text()

          // Determine file path
          const pathWithoutQuery = route.path.split('?')[0]
          let relativePath =
            pathWithoutQuery === '/'
              ? 'index.html'
              : `${pathWithoutQuery.replace(/^\//, '')}/index.html`

          if (pathWithoutQuery.endsWith('.html')) {
            relativePath = pathWithoutQuery.replace(/^\//, '')
          }

          const absolutePath = join(outputDir, relativePath)
          await mkdir(dirname(absolutePath), { recursive: true })
          await writeFile(absolutePath, html, 'utf-8')

          success++
          this.core.logger.info(`[SSG] ✅ Rendered (${success + failed}/${total}): ${route.path}`)
        } catch (error) {
          failed++
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.core.logger.error(`[SSG] ❌ Failed to export ${route.path}: ${errorMessage}`)
        }
      }
    }

    // Start workers
    const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker())
    await Promise.all(workers)

    // Generate Sitemap
    try {
      await this.generateSitemap(outputDir, uniqueRoutes, baseUrl)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      this.core.logger.error(`[SSG] Failed to generate sitemap: ${errorMessage}`)
    }

    // Generate Robots.txt
    try {
      await this.generateRobotsTxt(outputDir, baseUrl)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      this.core.logger.error(`[SSG] Failed to generate robots.txt: ${errorMessage}`)
    }

    this.core.logger.info(
      `[SSG] Static export completed! ✨ Success: ${success}, Failed: ${failed}`
    )
  }

  private async generateSitemap(
    outputDir: string,
    routes: Array<{ path: string }>,
    baseUrl: string
  ) {
    this.core.logger.info('[SSG] Generating sitemap.xml...')
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map((route) => {
    return `  <url>
    <loc>${baseUrl}${route.path === '/' ? '' : route.path}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route.path === '/' ? '1.0' : '0.8'}</priority>
  </url>`
  })
  .join('\n')}
</urlset>`

    await writeFile(join(outputDir, 'sitemap.xml'), sitemap, 'utf-8')
  }

  private async generateRobotsTxt(outputDir: string, baseUrl: string) {
    this.core.logger.info('[SSG] Generating robots.txt...')
    const robots = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`

    await writeFile(join(outputDir, 'robots.txt'), robots, 'utf-8')
  }
}
