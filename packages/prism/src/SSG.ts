import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { PlanetCore } from '@gravito/core'

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

  /**
   * Export all static routes to a target directory.
   */
  async export(
    outputDir: string,
    baseUrl = 'https://gravito.dev',
    extraPaths: string[] = []
  ): Promise<void> {
    this.core.logger.info(`[SSG] Starting static export to: ${outputDir}`)

    // Get routes from either PlanetCore Router or Gravito AOTRouter
    let routes: any[] = []
    const router = this.core.router as any

    if (Array.isArray(router.routes)) {
      routes = router.routes
    } else if (typeof router.getRoutes === 'function') {
      routes = router.getRoutes()
    } else {
      this.core.logger.warn('[SSG] Could not detect routes specific format. SSG might fail.')
    }

    const staticRoutes = routes.filter(
      (r: any) => r.method.toLowerCase() === 'get' && !r.path.includes(':') && !r.path.includes('*')
    )

    // Append extra paths
    for (const path of extraPaths) {
      staticRoutes.push({ path, method: 'GET' })
    }

    this.core.logger.info(
      `[SSG] Found ${staticRoutes.length} static routes (including manual paths) for export.`
    )

    for (const route of staticRoutes) {
      try {
        const url = `http://localhost${route.path}`
        this.core.logger.info(`[SSG] Rendering ${route.path}...`)

        // Use adapter.fetch to get the response
        const request = new Request(url)
        const response = await this.core.adapter.fetch(request)

        if (!response.ok) {
          this.core.logger.warn(`[SSG] Skipping ${route.path}: Returned status ${response.status}`)
          continue
        }

        const html = await response.text()

        // Determine file path
        // / -> index.html
        // /about -> about/index.html or about.html
        // We use component/index.html pattern for better compatibility with static hosts
        let relativePath =
          route.path === '/' ? 'index.html' : `${route.path.replace(/^\//, '')}/index.html`

        // If path itself ends with .html, use it directly (rare)
        if (route.path.endsWith('.html')) {
          relativePath = route.path.replace(/^\//, '')
        }

        const absolutePath = join(outputDir, relativePath)

        // Ensure directory exists
        await mkdir(dirname(absolutePath), { recursive: true })

        // Write file
        await writeFile(absolutePath, html, 'utf-8')
      } catch (error) {
        this.core.logger.error(`[SSG] Failed to export ${route.path}:`, error)
      }
    }

    // Generate Sitemap
    await this.generateSitemap(outputDir, staticRoutes, baseUrl)

    // Generate Robots.txt
    await this.generateRobotsTxt(outputDir, baseUrl)

    this.core.logger.info('[SSG] Static export completed successfully! ✨')
  }

  private async generateSitemap(outputDir: string, routes: any[], baseUrl: string) {
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
