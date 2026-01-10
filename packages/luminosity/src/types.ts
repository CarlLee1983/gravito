export type SeoMode = 'dynamic' | 'cached' | 'incremental'

export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

export interface SeoConfig {
  /** Operation mode */
  mode: SeoMode

  /** Base URL for sitemap (e.g., 'https://example.com') - NO trailing slash */
  baseUrl: string

  /** Data resolvers */
  resolvers: unknown[] // Changed to avoid circular dependency, cast to SeoResolver[] in usage

  /** Robots.txt configuration */
  robots?: {
    rules: {
      userAgent: string
      allow?: string[]
      disallow?: string[]
      crawlDelay?: number
    }[]
    sitemapUrls?: string[]
    host?: string
  }

  /** Cache settings (for 'cached' mode) */
  cache?: {
    ttl: number // TTL in seconds
    maxSize?: number // Max entries in memory
  }

  /** Incremental settings (for 'incremental' mode) */
  incremental?: {
    logDir: string // Path to .jsonl logs
    compactInterval?: number // Auto-compact interval (ms)
    maxLogSize?: number // Max log file size before rotation
    storage?: any // Optional: StorageAdapter instance
  }

  /** Output settings */
  output?: {
    path?: string // For static file generation
    filename?: string // Default: 'sitemap.xml'
    maxEntriesPerSitemap?: number // For sitemap index (50,000)
  }

  /** Branding (can be disabled for enterprise) */
  branding?: {
    enabled?: boolean // Default: true
    watermark?: string // Custom watermark text
  }
}
