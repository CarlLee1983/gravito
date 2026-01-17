/**
 * RobotsTxtBuilder provides a fluent API for generating robots.txt files.
 *
 * @example
 * ```typescript
 * const robots = new RobotsTxtBuilder()
 *   .userAgent('Googlebot')
 *   .allow('/')
 *   .disallow('/admin')
 *   .sitemap('https://example.com/sitemap.xml')
 *   .build();
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class RobotsTxtBuilder {
  private _lines: string[] = []

  constructor() {
    // Default to all agents if not specified immediately?
    // Usually starts with User-agent: *
    this.userAgent('*')
  }

  userAgent(agent: string): this {
    // If previous line was User-agent: *, overwrite it if it was the only thing?
    // No, keep it simple append. But usually a builder starts empty.
    // Let's reset if constructor added one?
    // Let's make constructor empty and let user define agents.
    if (this._lines.length === 1 && this._lines[0] === 'User-agent: *') {
      this._lines = []
    }
    this._lines.push(`User-agent: ${agent}`)
    return this
  }

  allow(path: string): this {
    this._lines.push(`Allow: ${path}`)
    return this
  }

  disallow(path: string): this {
    this._lines.push(`Disallow: ${path}`)
    return this
  }

  crawlDelay(delay: number): this {
    this._lines.push(`Crawl-delay: ${delay}`)
    return this
  }

  sitemap(url: string): this {
    this._lines.push(`Sitemap: ${url}`)
    return this
  }

  host(host: string): this {
    this._lines.push(`Host: ${host}`)
    return this
  }

  build(): string {
    return this._lines.join('\n')
  }
}
