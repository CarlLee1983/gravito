import type { SitemapIndexEntry, SitemapStreamOptions } from '../types'

/**
 * SitemapIndex handles the generation of sitemap index files.
 *
 * A sitemap index is used when a site has multiple sitemap files, usually
 * because the number of URLs exceeds the 50,000 limit per sitemap.
 *
 * @example
 * ```typescript
 * const index = new SitemapIndex({ baseUrl: 'https://example.com' });
 * index.add('sitemap-posts.xml');
 * index.add({ url: 'sitemap-pages.xml', lastmod: new Date() });
 * const xml = index.toXML();
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class SitemapIndex {
  private options: SitemapStreamOptions
  private entries: SitemapIndexEntry[] = []

  constructor(options: SitemapStreamOptions) {
    this.options = { ...options }
    if (this.options.baseUrl.endsWith('/')) {
      this.options.baseUrl = this.options.baseUrl.slice(0, -1)
    }
  }

  /**
   * Adds a single entry to the sitemap index.
   *
   * @param entry - A sitemap filename or a `SitemapIndexEntry` object.
   * @returns The `SitemapIndex` instance for chaining.
   */
  add(entry: string | SitemapIndexEntry): this {
    if (typeof entry === 'string') {
      this.entries.push({ url: entry })
    } else {
      this.entries.push(entry)
    }
    return this
  }

  /**
   * Adds multiple entries to the sitemap index.
   *
   * @param entries - An array of sitemap filenames or `SitemapIndexEntry` objects.
   * @returns The `SitemapIndex` instance for chaining.
   */
  addAll(entries: (string | SitemapIndexEntry)[]): this {
    for (const entry of entries) {
      this.add(entry)
    }
    return this
  }

  /**
   * Generates the sitemap index XML content.
   *
   * @returns The complete XML string for the sitemap index.
   */
  toXML(): string {
    const { baseUrl, pretty } = this.options

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

    const indent = pretty ? '  ' : ''
    const subIndent = pretty ? '    ' : ''
    const nl = pretty ? '\n' : ''

    for (const entry of this.entries) {
      let loc = entry.url
      if (!loc.startsWith('http')) {
        if (!loc.startsWith('/')) {
          loc = `/${loc}`
        }
        loc = baseUrl + loc
      }

      xml += `${indent}<sitemap>${nl}`
      xml += `${subIndent}<loc>${this.escape(loc)}</loc>${nl}`

      if (entry.lastmod) {
        const date = entry.lastmod instanceof Date ? entry.lastmod : new Date(entry.lastmod)
        xml += `${subIndent}<lastmod>${date.toISOString().split('T')[0]}</lastmod>${nl}`
      }

      xml += `${indent}</sitemap>${nl}`
    }

    xml += `</sitemapindex>`
    return xml
  }

  /**
   * Escapes special XML characters in a string.
   */
  private escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}
