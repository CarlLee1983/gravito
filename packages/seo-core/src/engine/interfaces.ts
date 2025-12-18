import type { SitemapEntry } from '../../interfaces'

export interface SeoStrategy {
  /**
   * Initialize the strategy (e.g., load cache, open DB)
   */
  init(): Promise<void>

  /**
   * Get all sitemap entries
   */
  getEntries(): Promise<SitemapEntry[]>

  /**
   * Add or update an entry (Incremental mode only, others might ignore or throw)
   */
  add(entry: SitemapEntry): Promise<void>

  /**
   * Remove an entry (Incremental mode only)
   */
  remove(url: string): Promise<void>

  /**
   * Optional: Shutdown the strategy (e.g., stop background timers)
   */
  shutdown?(): Promise<void>
}
