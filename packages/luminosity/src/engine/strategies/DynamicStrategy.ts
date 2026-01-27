import type { SeoResolver, SitemapEntry } from '../../interfaces'
import type { SeoConfig } from '../../types'
import type { SeoStrategy } from '../interfaces'

/**
 * DynamicStrategy generates sitemap entries on-the-fly by querying resolvers.
 *
 * It does not persist any data and always reflects the current state of
 * the underlying data sources (e.g., database, CMS API). It is suitable
 * for small to medium sites where data changes frequently.
 *
 * @public
 * @since 3.0.0
 */
export class DynamicStrategy implements SeoStrategy {
  constructor(private config: SeoConfig) {}

  /**
   * Initializes the strategy.
   *
   * @returns A promise that resolves immediately.
   */
  async init(): Promise<void> {
    // No initialization needed for dynamic mode
  }

  /**
   * Fetches the latest entries from all configured resolvers.
   *
   * @returns A promise that resolves to an array of sitemap entries.
   */
  async getEntries(): Promise<SitemapEntry[]> {
    const resolvers = this.config.resolvers as SeoResolver[]
    if (!resolvers || resolvers.length === 0) {
      return []
    }

    const promises = resolvers.map(async (resolver) => {
      try {
        let entries = await resolver.fetch()

        // Apply resolver-level defaults if entry doesn't have them
        entries = entries.map((entry: SitemapEntry) => ({
          ...entry,
          priority: entry.priority ?? resolver.priority,
          changefreq: entry.changefreq ?? resolver.changefreq,
        }))

        return entries
      } catch (e) {
        console.error(`[GravitoSeo] Resolver '${resolver.name}' failed:`, e)
        return []
      }
    })

    const results = await Promise.all(promises)
    return results.flat()
  }

  /**
   * Manually adds a sitemap entry.
   *
   * @param _entry - The entry to add.
   */
  async add(_entry: SitemapEntry): Promise<void> {
    console.warn(
      '[GravitoSeo] DynamicStrategy does not support manual add(). Update your data source instead.'
    )
  }

  /**
   * Manually removes a sitemap entry.
   *
   * @param _url - The URL to remove.
   */
  async remove(_url: string): Promise<void> {
    console.warn(
      '[GravitoSeo] DynamicStrategy does not support manual remove(). Update your data source instead.'
    )
  }
}
