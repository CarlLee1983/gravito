/**
 * Represents a set of rules for a specific user-agent in robots.txt.
 *
 * @public
 * @since 3.0.0
 */
export interface RobotsRule {
  /** The user-agent this rule set applies to (e.g., '*', 'Googlebot'). */
  userAgent: string
  /** An array of paths that are allowed to be crawled. */
  allow?: string[]
  /** An array of paths that are disallowed from crawling. */
  disallow?: string[]
  /** The number of seconds to wait between successive requests. */
  crawlDelay?: number
}

/**
 * Configuration for the robots.txt file.
 *
 * @public
 * @since 3.0.0
 */
export interface RobotsConfig {
  /** An array of rules for different user-agents. */
  rules: RobotsRule[]
  /** Additional sitemap URLs to include in the robots.txt file. */
  sitemapUrls?: string[]
  /** The host directive, specifying the preferred domain for the site. */
  host?: string
}
