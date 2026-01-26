import { GRAVITO_WATERMARK } from './watermark'

/**
 * Represents an entry in a sitemap index file.
 *
 * @public
 * @since 3.0.0
 */
export interface SitemapIndexEntry {
  /** The full URL of the sub-sitemap. */
  url: string
  /** The date of last modification of the sub-sitemap. */
  lastmod?: Date | string
}

/**
 * Options for configuring the `SitemapIndexBuilder`.
 *
 * @public
 * @since 3.0.0
 */
export interface IndexBuilderOptions {
  /** Whether to include the Gravito branding watermark in the XML. @default true */
  branding?: boolean
}

/**
 * SitemapIndexBuilder handles the generation of sitemap index XML files.
 *
 * A sitemap index is used to list multiple individual sitemap files when
 * a site's URL count exceeds the standard sitemap limit (50,000 URLs).
 *
 * @public
 * @since 3.0.0
 */
export class SitemapIndexBuilder {
  constructor(private options: IndexBuilderOptions) {}

  /**
   * Generates the XML Header for a sitemap index.
   *
   * @returns The XML header string.
   */
  start(): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`

    if (this.options.branding !== false) {
      xml += `${GRAVITO_WATERMARK}\n`
    }

    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    return xml
  }

  /**
   * Generates a single sitemap entry for the index.
   *
   * @param item - The sitemap index entry.
   * @returns The XML string for this entry.
   */
  entry(item: SitemapIndexEntry): string {
    let xml = `  <sitemap>\n`
    xml += `    <loc>${item.url}</loc>\n`

    if (item.lastmod) {
      const date = item.lastmod instanceof Date ? item.lastmod.toISOString() : item.lastmod
      xml += `    <lastmod>${date}</lastmod>\n`
    }

    xml += `  </sitemap>\n`
    return xml
  }

  /**
   * Generates the XML Footer for a sitemap index.
   *
   * @returns The XML footer string.
   */
  end(): string {
    return `</sitemapindex>`
  }

  /**
   * Helper to build a full sitemap index XML at once.
   *
   * @param entries - The list of sitemap index entries.
   * @returns The complete XML document string.
   */
  buildFull(entries: SitemapIndexEntry[]): string {
    let xml = this.start()
    for (const entry of entries) {
      xml += this.entry(entry)
    }
    xml += this.end()
    return xml
  }
}
