import type { SitemapEntry } from '../../interfaces'
import type { SeoConfig, SeoResolver } from '../../types'
import type { SeoStrategy } from '../interfaces'

export class DynamicStrategy implements SeoStrategy {
  constructor(private config: SeoConfig) {}

  async init(): Promise<void> {
    // No initialization needed for dynamic mode
  }

  async getEntries(): Promise<SitemapEntry[]> {
    const resolvers = this.config.resolvers as SeoResolver[]
    if (!resolvers || resolvers.length === 0) {
      return []
    }

    const promises = resolvers.map(async (resolver) => {
      try {
        let entries = await resolver.fetch()

        // Apply resolver-level defaults if entry doesn't have them
        entries = entries.map((entry) => ({
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

  async add(_entry: SitemapEntry): Promise<void> {
    console.warn(
      '[GravitoSeo] DynamicStrategy does not support manual add(). Update your data source instead.'
    )
  }

  async remove(_url: string): Promise<void> {
    console.warn(
      '[GravitoSeo] DynamicStrategy does not support manual remove(). Update your data source instead.'
    )
  }
}
