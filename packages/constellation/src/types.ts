/**
 * Supported change frequency values for sitemap entries.
 *
 * @public
 * @since 3.0.0
 */
export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

/**
 * Represents an alternate language or regional version of a URL.
 *
 * @public
 * @since 3.0.0
 */
export interface AlternateUrl {
  /** The language code (e.g., 'en', 'zh-TW') or 'x-default'. */
  lang: string
  /** The full URL of the alternate version. */
  url: string
}

/**
 * Image metadata for a sitemap entry.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapImage {
  /** The full URL of the image. */
  loc: string
  /** The title of the image. */
  title?: string | undefined
  /** A caption for the image. */
  caption?: string | undefined
  /** The geographic location of the image. */
  geo_location?: string | undefined
  /** A URL to the license for the image. */
  license?: string | undefined
}

/**
 * Video metadata for a sitemap entry.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapVideo {
  /** The URL of the video thumbnail. */
  thumbnail_loc: string
  /** The title of the video. */
  title: string
  /** A description of the video. */
  description: string
  /** The URL of the actual video file. */
  content_loc?: string | undefined
  /** The URL of the video player. */
  player_loc?: string | undefined
  /** Duration of the video in seconds. */
  duration?: number | undefined
  /** When the video will no longer be available. */
  expiration_date?: Date | string | undefined
  /** Rating of the video (0.0 to 5.0). */
  rating?: number | undefined
  /** Number of times the video has been viewed. */
  view_count?: number | undefined
  /** When the video was first published. */
  publication_date?: Date | string | undefined
  /** Whether the video is suitable for children. */
  family_friendly?: 'yes' | 'no' | undefined
  /** Tags associated with the video. */
  tag?: string[] | undefined
  /** The category of the video. */
  category?: string | undefined
  /** Regional restrictions for the video. */
  restriction?:
    | {
        relationship: 'allow' | 'deny'
        countries: string[]
      }
    | undefined
}

/**
 * News metadata for a sitemap entry.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapNews {
  /** The publication that the news article belongs to. */
  publication: {
    /** Name of the news publication. */
    name: string
    /** Language of the news publication (ISO 639 code). */
    language: string
  }
  /** The publication date of the news article. */
  publication_date: Date | string
  /** The title of the news article. */
  title: string
  /** Genres of the news article (e.g., 'PressRelease', 'Blog'). */
  genres?: string | undefined
  /** Keywords for the news article. */
  keywords?: string[] | undefined
  /** Stock tickers for the news article. */
  stock_tickers?: string[] | undefined
}

/**
 * Represents a single URL entry in an XML sitemap.
 *
 * Supports standard sitemap properties as well as Google-specific extensions
 * for images, videos, and news.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapEntry {
  /** The full URL of the page including protocol and domain. */
  url: string
  /** The date of last modification of the page. */
  lastmod?: Date | string | undefined
  /** How frequently the page is likely to change. */
  changefreq?: ChangeFreq | undefined
  /** The priority of this URL relative to other URLs on your site (0.0 to 1.0). @default 0.5 */
  priority?: number | undefined
  /** Alternate language or regional versions of this URL (i18n). */
  alternates?: AlternateUrl[] | undefined
  /** Image information associated with this URL. */
  images?: SitemapImage[] | undefined
  /** Video information associated with this URL. */
  videos?: SitemapVideo[] | undefined
  /** News-specific information for this URL. */
  news?: SitemapNews | undefined
  /** Optional redirect metadata for SEO and tracking purposes. */
  redirect?: {
    /** The source URL path that redirects to this entry. */
    from: string
    /** The destination URL path. */
    to: string
    /** The HTTP redirect status code. */
    type: 301 | 302
    /** The preferred canonical URL for this page. */
    canonical?: string
  }
}

/**
 * Represents an entry in a sitemap index file.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapIndexEntry {
  /** URL of the sub-sitemap file. */
  url: string
  /** Last modification time of the sub-sitemap. */
  lastmod?: Date | string | undefined
}

/**
 * A provider responsible for yielding sitemap entries.
 *
 * Providers can be implemented to scan databases, file systems, or
 * external APIs to discover content that should be included in the sitemap.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapProvider {
  /**
   * Generates a collection of sitemap entries.
   *
   * @returns An array, a promise of an array, or an async iterable of sitemap entries.
   */
  getEntries(): Promise<SitemapEntry[]> | SitemapEntry[] | AsyncIterable<SitemapEntry>
}

/**
 * Configuration for the sitemap XML generation stream.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapStreamOptions {
  /** Base domain used to normalize relative URLs. */
  baseUrl: string
  /** Whether to output formatted and indented XML. @default false */
  pretty?: boolean | undefined
}

/**
 * Persistence layer for storing generated sitemap files.
 *
 * Supports atomic deployments via "shadow" areas and provides hooks for
 * version management and rollbacks.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapStorage {
  /**
   * Write sitemap content to the storage backend.
   *
   * @param filename - The destination filename.
   * @param content - The raw XML content.
   */
  write(filename: string, content: string): Promise<void>

  /**
   * Read sitemap content from the storage backend.
   *
   * @param filename - The filename to read.
   * @returns The XML content as a string, or null if not found.
   */
  read(filename: string): Promise<string | null>

  /**
   * Check if a sitemap file exists in storage.
   *
   * @param filename - The filename to check.
   * @returns True if the file exists, false otherwise.
   */
  exists(filename: string): Promise<boolean>

  /**
   * Get the public URL for a given sitemap filename.
   *
   * @param filename - The sitemap filename.
   * @returns The full public URL.
   */
  getUrl(filename: string): string

  /**
   * Write content to a non-public staging area for atomic deployment.
   *
   * @param filename - The target filename.
   * @param content - The XML content.
   * @param shadowId - Optional session identifier.
   */
  writeShadow?(filename: string, content: string, shadowId?: string): Promise<void>

  /**
   * Commit all staged files in a shadow session to production.
   *
   * @param shadowId - The identifier of the session to commit.
   */
  commitShadow?(shadowId: string): Promise<void>

  /**
   * List available archived versions of a specific sitemap.
   *
   * @param filename - The sitemap filename.
   * @returns An array of version identifiers.
   */
  listVersions?(filename: string): Promise<string[]>

  /**
   * Revert a sitemap to a previously archived version.
   *
   * @param filename - The sitemap filename.
   * @param version - The version identifier to switch to.
   */
  switchVersion?(filename: string, version: string): Promise<void>
}

/**
 * Cache interface for storing frequently accessed sitemap fragments.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapCache {
  /**
   * Retrieve a cached XML fragment.
   *
   * @param key - The cache key.
   * @returns The cached XML string, or null if miss.
   */
  get(key: string): Promise<string | null>

  /**
   * Store an XML fragment in the cache.
   *
   * @param key - The cache key.
   * @param value - The XML content to cache.
   * @param ttl - Optional time-to-live in seconds.
   */
  set(key: string, value: string, ttl?: number): Promise<void>

  /**
   * Check if a specific fragment is currently cached.
   *
   * @param key - The cache key.
   * @returns True if hit, false otherwise.
   */
  has(key: string): Promise<boolean>
}

/**
 * Distributed lock interface to prevent concurrent sitemap generation.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapLock {
  /**
   * Attempt to acquire a lock on a resource.
   *
   * @param resource - Identifier for the resource to lock.
   * @param ttl - Lock expiration time in milliseconds.
   * @returns True if the lock was acquired, false otherwise.
   */
  acquire(resource: string, ttl: number): Promise<boolean>

  /**
   * Release a previously held lock.
   *
   * @param resource - Identifier for the resource to unlock.
   */
  release(resource: string): Promise<void>
}

/**
 * Progress tracking data for large-scale sitemap generation jobs.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapProgress {
  /** Unique identifier for the generation job. */
  jobId: string
  /** Current state of the generation process. */
  status: 'pending' | 'processing' | 'completed' | 'failed'
  /** Total number of URLs to be processed. */
  total: number
  /** Number of URLs already processed. */
  processed: number
  /** Completion percentage (0 to 100). */
  percentage: number
  /** Timestamp when the job was started. */
  startTime?: Date
  /** Timestamp when the job was finished or failed. */
  endTime?: Date
  /** Error message if the status is 'failed'. */
  error?: string
}

/**
 * Interface for persisting and retrieving sitemap job progress.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapProgressStorage {
  /**
   * Retrieve progress for a specific generation job.
   *
   * @param jobId - The job identifier.
   */
  get(jobId: string): Promise<SitemapProgress | null>

  /**
   * Initialize or overwrite a progress record.
   *
   * @param jobId - The job identifier.
   * @param progress - The initial progress state.
   */
  set(jobId: string, progress: SitemapProgress): Promise<void>

  /**
   * Update specific fields of an existing progress record.
   *
   * @param jobId - The job identifier.
   * @param updates - Object containing fields to update.
   */
  update(jobId: string, updates: Partial<SitemapProgress>): Promise<void>

  /**
   * Delete a progress record from storage.
   *
   * @param jobId - The job identifier.
   */
  delete(jobId: string): Promise<void>

  /**
   * List recent sitemap generation jobs.
   *
   * @param limit - Maximum number of records to return. @default 100
   * @returns An array of progress records.
   */
  list(limit?: number): Promise<SitemapProgress[]>
}

/**
 * The nature of a structural change detected in the site.
 *
 * @public
 * @since 3.0.0
 */
export type ChangeType = 'add' | 'update' | 'remove'

/**
 * Represents a single structural change detected in the site.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapChange {
  /** The nature of the change (add, update, or remove). */
  type: ChangeType
  /** The target URL that was affected. */
  url: string
  /** The sitemap entry representation of the URL (for additions and updates). */
  entry?: SitemapEntry
  /** When the change was detected. */
  timestamp: Date
}

/**
 * Interface for tracking and querying site structure changes over time.
 *
 * Change trackers are used by the `IncrementalGenerator` to perform
 * partial sitemap updates.
 *
 * @public
 * @since 3.0.0
 */
export interface ChangeTracker {
  /**
   * Record a new site structure change.
   *
   * @param change - The change event to record.
   */
  track(change: SitemapChange): Promise<void>

  /**
   * Retrieve all changes recorded since a specific time.
   *
   * @param since - Optional start date for the query.
   * @returns An array of change events.
   */
  getChanges(since?: Date): Promise<SitemapChange[]>

  /**
   * Retrieve the full change history for a specific URL.
   *
   * @param url - The URL to query history for.
   * @returns An array of change events.
   */
  getChangesByUrl(url: string): Promise<SitemapChange[]>

  /**
   * Purge old change records from storage.
   *
   * @param since - If provided, only records older than this date will be cleared.
   */
  clear(since?: Date): Promise<void>
}

/**
 * Defines a 301 or 302 redirect rule managed by Constellation.
 *
 * @public
 * @since 3.0.0
 */
export interface RedirectRule {
  /** The incoming URL path or glob pattern. */
  from: string
  /** The destination URL path or absolute URL. */
  to: string
  /** The HTTP status code (301 for permanent, 302 for temporary). */
  type: 301 | 302
  /** Timestamp when the redirect rule was created. */
  createdAt?: Date
}

/**
 * Represents a manifest file that tracks URL-to-shard mappings.
 *
 * @public
 * @since 3.0.1
 */
export interface ShardManifest {
  version: number
  generatedAt: Date | string
  baseUrl: string
  maxEntriesPerShard: number
  sort: string
  shards: ShardInfo[]
}

/**
 * Metadata about a single sitemap shard.
 *
 * @public
 * @since 3.0.1
 */
export interface ShardInfo {
  filename: string
  from: string
  to: string
  count: number
  lastmod: Date | string
}

/**
 * Manager for registering and resolving redirect rules.
 *
 * @public
 * @since 3.0.0
 */
export interface RedirectManager {
  /**
   * Register a single redirect rule.
   *
   * @param redirect - The redirect rule to add.
   */
  register(redirect: RedirectRule): Promise<void>

  /**
   * Register multiple redirect rules at once.
   *
   * @param redirects - An array of redirect rules.
   */
  registerBatch(redirects: RedirectRule[]): Promise<void>

  /**
   * Retrieve a specific redirect rule by its source path.
   *
   * @param from - The source path.
   * @returns The redirect rule, or null if not found.
   */
  get(from: string): Promise<RedirectRule | null>

  /**
   * Retrieve all registered redirect rules.
   *
   * @returns An array of all redirect rules.
   */
  getAll(): Promise<RedirectRule[]>

  /**
   * Resolve a URL through the redirect table.
   *
   * @param url - The URL to resolve.
   * @param followChains - Whether to recursively resolve if redirects point to other redirects.
   * @param maxChainLength - Maximum depth for chain resolution to prevent infinite loops.
   * @returns The final destination URL, or null if no redirect matches.
   */
  resolve(url: string, followChains?: boolean, maxChainLength?: number): Promise<string | null>
}
