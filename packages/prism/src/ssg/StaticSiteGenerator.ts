import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { PlanetCore } from '@gravito/core'
import { archiveFromDirectory } from '@gravito/core'
import { type DynamicRoute, DynamicRouteResolver } from './DynamicRouteResolver'
import { IncrementalBuilder } from './IncrementalBuilder'

/**
 * Interface representing a route structure for SSG.
 */
interface SSGRoute {
  path: string
  method: string
}

/**
 * Interface for a Router that exposes its routes.
 * Compatibility layer for different router implementations.
 */
interface RouterWithRoutes {
  routes?: SSGRoute[]
  getRoutes?: () => SSGRoute[]
}

/**
 * Configuration options for the export process.
 */
export interface ExportOptions {
  /** Base URL for the site (used in sitemap.xml). */
  baseUrl?: string
  /** Number of concurrent requests during export. @default 10 */
  concurrency?: number
  /** Timeout per page request in milliseconds. @default 30000 */
  timeout?: number
  /** Enable incremental builds (skip unchanged pages). @default false */
  incremental?: boolean
  /** Force rebuild even if incremental is enabled. @default false */
  force?: boolean
  /** Path to the build manifest file. */
  manifestPath?: string
  /** Additional paths to export that aren't in the router. */
  extraPaths?: string[]
  /** Batch size for processing routes (memory optimization). @default 100 */
  batchSize?: number
  /** Enable memory usage logging. @default false */
  logMemoryUsage?: boolean
  /** 是否在 export 完成後生成歸檔（.tar.gz） */
  archive?: boolean
  /** 歸檔輸出路徑（預設為 outputDir + '.tar.gz'） */
  archivePath?: string
  /** gzip 壓縮等級（1-12，預設 6） */
  compressLevel?: number
}

/**
 * Static Site Generator (SSG) for Gravito Prism.
 *
 * Crawls the application's registered routes and renders them to static HTML files.
 * Supports incremental builds, dynamic routes, sitemap generation, and robots.txt creation.
 *
 * @example
 * ```typescript
 * const ssg = new StaticSiteGenerator(core);
 * await ssg.export('./dist');
 * ```
 *
 * @public
 */
export class StaticSiteGenerator {
  /**
   * Create a new SSG instance.
   *
   * @param core - The PlanetCore instance to crawl routes from.
   */
  constructor(
    private core: PlanetCore,
    private readonly defaultOptions: ExportOptions = {}
  ) {}

  private resolveOptions(options: ExportOptions = {}): ExportOptions {
    return { ...this.defaultOptions, ...options }
  }

  private logMemory(label: string): void {
    const usage = process.memoryUsage()
    this.core.logger.debug(
      `[SSG Memory] ${label}: RSS=${(usage.rss / 1024 / 1024).toFixed(2)}MB, Heap=${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`
    )
  }

  private async *generateRouteBatches(
    routes: Array<{ path: string; getData?: () => Promise<any> }>,
    batchSize: number
  ): AsyncGenerator<Array<{ path: string; getData?: () => Promise<any> }>> {
    for (let i = 0; i < routes.length; i += batchSize) {
      yield routes.slice(i, i + batchSize)
    }
  }

  /**
   * Export dynamic routes to static HTML.
   *
   * Resolves dynamic patterns (e.g., `/blog/[slug]`) into concrete paths before exporting.
   *
   * @param dynamicRoutes - Array of dynamic route definitions.
   * @param outputDir - Directory to write static files to.
   * @param options - Export configuration options.
   *
   * @example
   * ```typescript
   * await ssg.exportDynamic([
   *   { pattern: '/posts/[id]', getPaths: async () => ... }
   * ], './dist');
   * ```
   */
  async exportDynamic(
    dynamicRoutes: DynamicRoute[],
    outputDir: string,
    options: ExportOptions = {}
  ): Promise<void> {
    const resolvedOptions = this.resolveOptions(options)
    const baseUrl = resolvedOptions.baseUrl ?? 'https://gravito.dev'

    this.core.logger.info('[SSG] Resolving dynamic routes...')
    const resolved = await DynamicRouteResolver.resolve(dynamicRoutes)
    this.core.logger.info(`[SSG] Resolved ${resolved.length} static paths from dynamic routes`)

    if (resolvedOptions.incremental) {
      const builder = new IncrementalBuilder(this.core, outputDir, resolvedOptions)
      await builder.export(resolved, baseUrl, resolvedOptions)
    } else {
      await this.exportRoutes(resolved, outputDir, baseUrl, resolvedOptions)
    }
  }

  /**
   * Run an incremental export for the entire site.
   *
   * Automatically detects static routes from the router and combines them with
   * any extra paths provided. Only rebuilds pages that have changed (if incremental is true).
   *
   * @param outputDir - Directory to write files to.
   * @param options - Export configuration.
   *
   * @example
   * ```typescript
   * await ssg.exportIncremental('./dist', { incremental: true });
   * ```
   */
  async exportIncremental(outputDir: string, options: ExportOptions = {}): Promise<void> {
    const resolvedOptions = this.resolveOptions(options)
    const baseUrl = resolvedOptions.baseUrl ?? 'https://gravito.dev'

    const routes = this.getStaticRoutes()
    const extraPaths = (resolvedOptions.extraPaths ?? []).map((p) => ({ path: p }))
    const resolved = [...routes.map((r) => ({ path: r.path })), ...extraPaths]

    const builder = new IncrementalBuilder(this.core, outputDir, resolvedOptions)
    await builder.export(resolved, baseUrl, resolvedOptions)

    await this.generateSitemap(outputDir, resolved, baseUrl)
    await this.generateRobotsTxt(outputDir, baseUrl)
  }

  /**
   * Internal method to process a batch of routes.
   */
  private async exportRoutes(
    routes: Array<{ path: string; getData?: () => Promise<any> }>,
    outputDir: string,
    _baseUrl: string,
    options: ExportOptions = {}
  ): Promise<void> {
    const concurrency = options.concurrency ?? 10
    const timeout = options.timeout ?? 30000
    const batchSize = options.batchSize ?? 100
    const logMemory = options.logMemoryUsage ?? false

    const total = routes.length
    let success = 0
    let failed = 0
    let processedBatches = 0

    if (logMemory) {
      this.logMemory('Export Start')
    }

    for await (const batch of this.generateRouteBatches(routes, batchSize)) {
      processedBatches++

      const queue = [...batch]
      const batchNumber = processedBatches

      if (logMemory) {
        this.logMemory(`Batch ${batchNumber} Start (${queue.length} routes)`)
      }

      const worker = async () => {
        while (queue.length > 0) {
          const route = queue.shift()
          if (!route) {
            break
          }

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

      const workers = Array.from({ length: Math.min(concurrency, batch.length) }, () => worker())
      await Promise.all(workers)

      if (logMemory) {
        this.logMemory(`Batch ${batchNumber} Complete`)
      }

      if (global.gc && logMemory) {
        global.gc()
        this.logMemory(`After GC (Batch ${batchNumber})`)
      }
    }

    this.core.logger.info(`[SSG] Export complete! Success: ${success}, Failed: ${failed}`)
  }

  /**
   * Extract static routes from the router.
   * Filters out dynamic routes (with params) and non-GET routes.
   */
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

  /**
   * Run a full static export.
   *
   * Crawls all registered GET routes in the application router and renders them
   * to static HTML files in the specified output directory.
   *
   * This method performs a complete export, including:
   * 1. Route discovery and deduplication.
   * 2. Concurrent page rendering.
   * 3. Sitemap generation.
   * 4. robots.txt generation.
   *
   * @param outputDir - Absolute path to the directory where static files will be written.
   * @param baseUrl - The public URL where the site will be hosted (used for sitemap).
   * @param extraPaths - Additional relative paths to export that are not registered in the router.
   *
   * @throws {Error} If the output directory cannot be created or written to.
   * @throws {Error} If the application router cannot be accessed.
   *
   * @example
   * ```typescript
   * const ssg = new StaticSiteGenerator(core);
   * await ssg.export('./dist', 'https://example.com', ['/404', '/offline']);
   * ```
   *
   * @public
   * @since 3.0.0
   */
  async export(
    outputDir: string,
    baseUrl = 'https://gravito.dev',
    extraPaths: string[] = [],
    options: ExportOptions = {}
  ): Promise<void> {
    this.core.logger.info(`[SSG] Starting static export to: ${outputDir}`)

    const logMemory = options.logMemoryUsage ?? false

    if (logMemory) {
      this.logMemory('Discovery Start')
    }

    let routes: SSGRoute[] = []
    const router = this.core.router as RouterWithRoutes

    if (Array.isArray(router.routes)) {
      routes = router.routes
    } else if (typeof router.getRoutes === 'function') {
      routes = router.getRoutes()
    } else {
      this.core.logger.warn('[SSG] Could not detect routes specific format. SSG might fail.')
    }

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

    if (logMemory) {
      this.logMemory(`Discovery Complete (${total} routes)`)
    }

    await this.exportRoutes(
      uniqueRoutes.map((r) => ({ path: r.path })),
      outputDir,
      baseUrl,
      options
    )

    try {
      await this.generateSitemap(outputDir, uniqueRoutes, baseUrl)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      this.core.logger.error(`[SSG] Failed to generate sitemap: ${errorMessage}`)
    }

    try {
      await this.generateRobotsTxt(outputDir, baseUrl)
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      this.core.logger.error(`[SSG] Failed to generate robots.txt: ${errorMessage}`)
    }

    this.core.logger.info(`[SSG] Static export completed! ✨`)

    if (logMemory) {
      this.logMemory('Export Complete')
    }

    // 歸檔（選用）
    if (options.archive) {
      await this.generateArchive(outputDir, options)
    }
  }

  /**
   * 將輸出目錄打包為 .tar.gz 歸檔
   */
  private async generateArchive(outputDir: string, options: ExportOptions): Promise<void> {
    const archivePath = options.archivePath || `${outputDir}.tar.gz`

    try {
      const archiveData = await archiveFromDirectory(outputDir, archivePath, {
        compress: 'gzip',
        ...(options.compressLevel !== undefined ? { level: options.compressLevel } : {}),
      })

      this.core.logger.info(`[SSG] Archive generated: ${archivePath} (${archiveData.length} bytes)`)
    } catch (err) {
      this.core.logger.error(`[SSG] Archive generation failed: ${err}`)
      throw err
    }
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
