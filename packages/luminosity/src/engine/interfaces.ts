import type { SitemapEntry } from '../interfaces'

/**
 * Interface for SEO entry management strategies.
 *
 * Strategies define how sitemap entries are stored, updated, and retrieved.
 *
 * @public
 * @since 3.0.0
 */
export interface SeoStrategy {
  /**
   * Initialize the strategy.
   *
   * @returns A promise that resolves when initialization is complete.
   */
  init(): Promise<void>

  /**
   * Retrieve all current sitemap entries.
   *
   * @returns A promise that resolves to an array of sitemap entries.
   */
  getEntries(): Promise<SitemapEntry[]>

  /**
   * Manually add or update a sitemap entry.
   *
   * Note: Some strategies (like Dynamic) may not support this operation and
   * will log a warning or throw an error.
   *
   * @param entry - The sitemap entry to add or update.
   * @returns A promise that resolves when the operation is complete.
   */
  add(entry: SitemapEntry): Promise<void>

  /**
   * Manually remove a sitemap entry by its URL.
   *
   * Note: Some strategies may not support this operation.
   *
   * @param url - The URL of the entry to remove.
   * @returns A promise that resolves when the operation is complete.
   */
  remove(url: string): Promise<void>

  /**
   * Perform any necessary cleanup when the engine is shutting down.
   *
   * @returns A promise that resolves when shutdown is complete.
   */
  shutdown?(): Promise<void>
}
