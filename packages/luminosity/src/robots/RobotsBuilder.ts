import type { RobotsConfig } from './types'

/**
 * RobotsBuilder generates robots.txt content based on configuration.
 *
 * It supports user-agent rules (Allow, Disallow, Crawl-delay), sitemap
 * declarations, and the Host directive.
 *
 * @public
 * @since 3.0.0
 */
export class RobotsBuilder {
  constructor(
    private config: RobotsConfig,
    private baseUrl: string
  ) {}

  build(): string {
    let output = ''

    for (const rule of this.config.rules) {
      output += `User-agent: ${rule.userAgent}\n`
      if (rule.disallow && rule.disallow.length > 0) {
        rule.disallow.forEach((path) => {
          output += `Disallow: ${path}\n`
        })
      }
      if (rule.allow && rule.allow.length > 0) {
        rule.allow.forEach((path) => {
          output += `Allow: ${path}\n`
        })
      }
      if (rule.crawlDelay) {
        output += `Crawl-delay: ${rule.crawlDelay}\n`
      }
      output += '\n'
    }

    // Smartly determine sitemap URLs
    // If user provided explicit sitemapUrls, use them.
    // Otherwise, generate one default sitemap URL based on baseUrl.
    const sitemaps =
      this.config.sitemapUrls && this.config.sitemapUrls.length > 0
        ? this.config.sitemapUrls
        : [`${this.baseUrl}/sitemap.xml`]

    sitemaps.forEach((url) => {
      output += `Sitemap: ${url}\n`
    })

    if (this.config.host) {
      output += `Host: ${this.config.host}\n`
    }

    // Trim trailing newline for cleanness, but ensure one final newline is standard
    return `${output.trim()}\n`
  }
}
