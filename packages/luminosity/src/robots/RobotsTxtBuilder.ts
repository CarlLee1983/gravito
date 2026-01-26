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

  /**
   * Sets the User-agent for the subsequent rules.
   *
   * @param agent - The user agent string (e.g., 'Googlebot', '*').
   * @returns The builder instance for chaining.
   */
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

  /**
   * Adds an Allow rule for the current user agent.
   *
   * @param path - The path to allow.
   * @returns The builder instance for chaining.
   */
  allow(path: string): this {
    this._lines.push(`Allow: ${path}`)
    return this
  }

  /**
   * Adds a Disallow rule for the current user agent.
   *
   * @param path - The path to disallow.
   * @returns The builder instance for chaining.
   */
  disallow(path: string): this {
    this._lines.push(`Disallow: ${path}`)
    return this
  }

  /**
   * Adds a Crawl-delay directive for the current user agent.
   *
   * @param delay - The delay in seconds.
   * @returns The builder instance for chaining.
   */
  crawlDelay(delay: number): this {
    this._lines.push(`Crawl-delay: ${delay}`)
    return this
  }

  /**
   * Adds a Sitemap directive.
   *
   * @param url - The full URL to the sitemap.
   * @returns The builder instance for chaining.
   */
  sitemap(url: string): this {
    this._lines.push(`Sitemap: ${url}`)
    return this
  }

  /**
   * Adds a Host directive.
   *
   * @param host - The preferred hostname.
   * @returns The builder instance for chaining.
   */
  host(host: string): this {
    this._lines.push(`Host: ${host}`)
    return this
  }

  /**
   * Builds the final robots.txt content.
   *
   * @returns The raw string content of the robots.txt file.
   */
  build(): string {
    return this._lines.join('\n')
  }
}
