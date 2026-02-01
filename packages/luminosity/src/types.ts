/**
 * Operational modes for the Luminosity SEO engine.
 *
 * - `dynamic`: Generates sitemaps on-the-fly for every request.
 * - `cached`: Generates sitemaps and caches them for a TTL period.
 * - `incremental`: Updates sitemaps using a Write-Ahead Log (WAL) and compaction strategy.
 *
 * @public
 * @since 3.0.0
 */
export type SeoMode = 'dynamic' | 'cached' | 'incremental'

/**
 * Supported change frequency values for sitemap entries.
 *
 * Indicates to search engines how often the content at a URL is expected to change.
 *
 * @public
 * @since 3.0.0
 */
export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

/**
 * Configuration for the Luminosity SEO engine.
 *
 * Defines the operational behavior, storage locations, and output formats for
 * sitemap and robots.txt generation.
 *
 * @public
 * @since 3.0.0
 */
export interface SeoConfig {
  /** The operation mode for sitemap generation. */
  mode: SeoMode

  /** The base URL for the site (e.g., 'https://example.com'). Do not include a trailing slash. */
  baseUrl: string

  /** An array of data resolvers that provide URL entries. */
  resolvers: unknown[]

  /** Configuration for generating robots.txt files. */
  robots?: {
    /** A list of robots rules. */
    rules: {
      /** The user-agent this rule applies to. */
      userAgent: string
      /** A list of allowed paths. */
      allow?: string[]
      /** A list of disallowed paths. */
      disallow?: string[]
      /** Delay between crawls in seconds. */
      crawlDelay?: number
    }[]
    /** Additional sitemap URLs to include in robots.txt. */
    sitemapUrls?: string[]
    /** The host directive for robots.txt. */
    host?: string
  }

  /** Cache settings for 'cached' mode. */
  cache?: {
    /** Time-to-live for cached sitemaps in seconds. */
    ttl: number
    /** Maximum number of entries to keep in memory. */
    maxSize?: number
    /** Optional distributed lock provider for multi-instance environments. */
    lockProvider?: any
  }

  /** Incremental generation settings for 'incremental' mode. */
  incremental?: {
    /** Directory where incremental .jsonl logs are stored. */
    logDir: string
    /** Interval in milliseconds for automatic log compaction. */
    compactInterval?: number
    /** Maximum log file size in bytes before triggering rotation or compaction. */
    maxLogSize?: number
    /** Optional custom storage adapter for incremental logs. */
    storage?: any
  }

  /** Configuration for sitemap file output. */
  output?: {
    /** Directory path for static file generation. */
    path?: string
    /** The main sitemap filename. @default 'sitemap.xml' */
    filename?: string
    /** Maximum number of entries per individual sitemap file. @default 50000 */
    maxEntriesPerSitemap?: number
  }

  /** Configuration for Gravito branding. */
  branding?: {
    /** Whether to include Gravito branding watermarks. @default true */
    enabled?: boolean
    /** Custom watermark text to include in XML files. */
    watermark?: string
  }
}
