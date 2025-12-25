import { RobotsBuilder } from '../robots/RobotsBuilder'
import type { SeoConfig } from '../types'
import type { SeoStrategy } from './interfaces'
import { SeoRenderer } from './SeoRenderer'
import { CachedStrategy } from './strategies/CachedStrategy'
import { DynamicStrategy } from './strategies/DynamicStrategy'
import { IncrementalStrategy } from './strategies/IncrementalStrategy'

export class SeoEngine {
  private strategy: SeoStrategy
  private renderer: SeoRenderer

  /**
   * Create a new SeoEngine instance.
   *
   * @param config - The SEO configuration object.
   * @throws {Error} If the mode specified in config is unknown.
   */
  constructor(private config: SeoConfig) {
    this.renderer = new SeoRenderer(this.config)
    switch (config.mode) {
      case 'dynamic':
        this.strategy = new DynamicStrategy(config)
        break
      case 'cached':
        this.strategy = new CachedStrategy(config)
        break
      case 'incremental':
        this.strategy = new IncrementalStrategy(config)
        break
      default:
        throw new Error(`[GravitoSeo] Unknown mode: ${config.mode}`)
    }
  }

  /**
   * Initialize the SEO engine.
   *
   * Initializes the underlying strategy.
   *
   * @returns A promise that resolves when initialization is complete.
   */
  async init(): Promise<void> {
    await this.strategy.init()
  }

  /**
   * Render the requested SEO path (robots.txt or sitemap.xml).
   *
   * @param path - The requested URL path.
   * @returns A promise that resolves to the rendered content, or null if not an SEO path.
   */
  async render(path: string): Promise<string | null> {
    // 1. Handle Robots.txt
    if (path.endsWith('/robots.txt')) {
      const robotsConfig = this.config.robots || { rules: [{ userAgent: '*', allow: ['/'] }] }
      const builder = new RobotsBuilder(robotsConfig, this.config.baseUrl)
      return builder.build()
    }

    // 2. Handle Sitemap.xml (including pagination)
    if (
      path.endsWith('/sitemap.xml') ||
      path.includes('sitemap_page_') ||
      (path.includes('sitemap') && path.endsWith('.xml'))
    ) {
      // Extract page number if present (e.g. ?page=2 or sitemap_page_1)
      const pageMatch = path.match(/page[=_](\d+)/)
      const page = pageMatch ? parseInt(pageMatch[1]!, 10) : undefined

      const entries = await this.strategy.getEntries()
      return this.renderer.render(entries, path, page)
    }

    return null
  }

  /**
   * Shutdown the SEO engine.
   *
   * Shuts down the underlying strategy if applicable.
   *
   * @returns A promise that resolves when shutdown is complete.
   */
  async shutdown(): Promise<void> {
    if (this.strategy.shutdown) {
      await this.strategy.shutdown()
    }
  }

  /**
   * Get the strategy instance (for direct manipulation like add/remove).
   *
   * @returns The active SeoStrategy instance.
   */
  getStrategy(): SeoStrategy {
    return this.strategy
  }
}
