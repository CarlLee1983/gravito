import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { PlanetCore } from '@gravito/core'

/**
 * Static Site Generator for Gravito Prism
 *
 * Crawls registered GET routes and exports them as static HTML files.
 */
export class StaticSiteGenerator {
  constructor(private core: PlanetCore) {}

  /**
   * Export all static routes to a target directory.
   */
  async export(outputDir: string): Promise<void> {
    this.core.logger.info(`[SSG] Starting static export to: ${outputDir}`)

    // We use the router.compile() to get all routes
    const routes = this.core.router.routes
    const staticRoutes = routes.filter(
      (r) => r.method.toLowerCase() === 'get' && !r.path.includes(':') && !r.path.includes('*')
    )

    this.core.logger.info(`[SSG] Found ${staticRoutes.length} static routes for export.`)

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

    this.core.logger.info('[SSG] Static export completed successfully! ✨')
  }
}
