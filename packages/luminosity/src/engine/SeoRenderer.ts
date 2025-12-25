import type { SitemapEntry } from '../interfaces'
import type { SeoConfig } from '../types'
import { SitemapIndexBuilder } from '../xml/SitemapIndexBuilder'
import { XmlStreamBuilder } from '../xml/XmlStreamBuilder'

export class SeoRenderer {
  private static MAX_ENTRIES = 50000

  constructor(private config: SeoConfig) {}

  /**
   * Render the sitemap or sitemap index based on entries count and page query.
   *
   * @param entries All sitemap entries
   * @param url The current request URL (used to generate sub-sitemap URLs)
   * @param page The requested page number (1-based), or undefined for index/main
   */
  render(entries: SitemapEntry[], url: string, page?: number): string {
    const maxEntries = this.config.output?.maxEntriesPerSitemap || SeoRenderer.MAX_ENTRIES

    // Case 1: Small sitemap, render everything normally
    if (entries.length <= maxEntries) {
      return this.renderSitemap(entries)
    }

    // Case 2: Large sitemap, requires pagination/index
    const totalPages = Math.ceil(entries.length / maxEntries)

    // If a specific page is requested
    if (page && page > 0) {
      if (page > totalPages) {
        // Return empty sitemap if page out of bounds? Or throw?
        // Standard practice: empty sitemap is valid xml
        return this.renderSitemap([])
      }

      const start = (page - 1) * maxEntries
      const end = start + maxEntries
      const slice = entries.slice(start, end)
      return this.renderSitemap(slice)
    }

    // Case 3: No page requested, but we have > 50k entries -> Render Index
    return this.renderIndex(url, totalPages, entries)
  }

  private renderSitemap(entries: SitemapEntry[]): string {
    const builder = new XmlStreamBuilder({
      baseUrl: this.config.baseUrl,
      branding: this.config.branding?.enabled,
    })
    return builder.buildFull(entries)
  }

  private renderIndex(currentUrl: string, totalPages: number, allEntries: SitemapEntry[]): string {
    const maxEntries = this.config.output?.maxEntriesPerSitemap || SeoRenderer.MAX_ENTRIES
    const builder = new SitemapIndexBuilder({
      branding: this.config.branding?.enabled,
    })

    const indexEntries = []

    // We attempt to find the latest lastmod for each chunk to be accurate
    // or just use the current time if that's too expensive.
    // Let's be accurate since we have the data in memory.

    for (let i = 1; i <= totalPages; i++) {
      // Find latest lastmod in this chunk
      const start = (i - 1) * maxEntries
      const end = start + maxEntries

      // This is safe even if end > length
      // We only need the lastmod, checking 50k items might be slow?
      // JS array iteration is fast. 50k is nothing for V8.

      let lastMod: Date | string | undefined
      for (let j = start; j < Math.min(end, allEntries.length); j++) {
        const entry = allEntries[j]!
        if (entry.lastmod) {
          if (!lastMod) {
            lastMod = entry.lastmod
          } else {
            const current = new Date(entry.lastmod)
            const existing = new Date(lastMod)
            if (current > existing) {
              lastMod = entry.lastmod
            }
          }
        }
      }

      // Construct URL for sub-sitemap
      // We append ?page=N to the current URL
      const sep = currentUrl.includes('?') ? '&' : '?'
      const loc = `${currentUrl}${sep}page=${i}`

      indexEntries.push({
        url: loc,
        lastmod: lastMod,
      })
    }

    return builder.buildFull(indexEntries)
  }
}
