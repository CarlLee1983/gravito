import type { SitemapEntry } from '../types'

/**
 * SitemapParser provides utility methods for parsing sitemap XML files.
 *
 * It is primarily used by `IncrementalGenerator` to load existing sitemap entries
 * for difference calculation and incremental updates.
 *
 * @public
 * @since 3.0.1
 */
export class SitemapParser {
  /**
   * Parses a sitemap XML string and extracts entries.
   *
   * @param xml - The sitemap XML content to parse.
   * @returns An array of sitemap entries.
   */
  static parse(xml: string): SitemapEntry[] {
    const entries: SitemapEntry[] = []
    const urlRegex = /<url>([\s\S]*?)<\/url>/g
    let match: RegExpExecArray | null

    while ((match = urlRegex.exec(xml)) !== null) {
      const urlContent = match[1]
      const entry: SitemapEntry = { url: '' }

      const locMatch = /<loc>(.*?)<\/loc>/.exec(urlContent)
      if (locMatch) {
        entry.url = this.unescape(locMatch[1])
      }

      const lastmodMatch = /<lastmod>(.*?)<\/lastmod>/.exec(urlContent)
      if (lastmodMatch) {
        entry.lastmod = new Date(lastmodMatch[1])
      }

      const priorityMatch = /<priority>(.*?)<\/priority>/.exec(urlContent)
      if (priorityMatch) {
        entry.priority = parseFloat(priorityMatch[1])
      }

      const changefreqMatch = /<changefreq>(.*?)<\/changefreq>/.exec(urlContent)
      if (changefreqMatch) {
        entry.changefreq = changefreqMatch[1] as any
      }

      if (entry.url) {
        entries.push(entry)
      }
    }

    return entries
  }

  /**
   * Parses a sitemap index XML string and extracts sitemap URLs.
   *
   * @param xml - The sitemap index XML content to parse.
   * @returns An array of sitemap URLs.
   */
  static parseIndex(xml: string): string[] {
    const urls: string[] = []
    const sitemapRegex = /<sitemap>([\s\S]*?)<\/sitemap>/g
    let match: RegExpExecArray | null

    while ((match = sitemapRegex.exec(xml)) !== null) {
      const content = match[1]
      const locMatch = /<loc>(.*?)<\/loc>/.exec(content)
      if (locMatch) {
        urls.push(this.unescape(locMatch[1]))
      }
    }

    return urls
  }

  private static unescape(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  }
}
