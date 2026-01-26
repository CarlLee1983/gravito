import type { SitemapEntry } from '../types'

/**
 * SitemapParser provides utility methods for parsing sitemap XML files.
 * Used by `IncrementalGenerator` for incremental updates.
 *
 * @public
 * @since 3.0.1
 */
export class SitemapParser {
  /**
   * Parses a sitemap XML string into an array of entries.
   *
   * @param xml - The raw sitemap XML content.
   * @returns An array of `SitemapEntry` objects.
   */
  static parse(xml: string): SitemapEntry[] {
    const entries: SitemapEntry[] = []
    const urlRegex = /<url>([\s\S]*?)<\/url>/g
    let match: RegExpExecArray | null

    while ((match = urlRegex.exec(xml)) !== null) {
      const entry = this.parseEntry(match[1])
      if (entry) {
        entries.push(entry)
      }
    }

    return entries
  }

  /**
   * Parses a sitemap XML stream into an async iterable of entries.
   *
   * Useful for large sitemap files that should not be fully loaded into memory.
   *
   * @param stream - An async iterable of XML chunks.
   * @returns An async iterable of `SitemapEntry` objects.
   */
  static async *parseStream(stream: AsyncIterable<string>): AsyncIterable<SitemapEntry> {
    let buffer = ''
    const urlRegex = /<url>([\s\S]*?)<\/url>/g

    for await (const chunk of stream) {
      buffer += chunk
      let match: RegExpExecArray | null

      while ((match = urlRegex.exec(buffer)) !== null) {
        const entry = this.parseEntry(match[1])
        if (entry) {
          yield entry
        }

        buffer = buffer.slice(match.index + match[0].length)
        urlRegex.lastIndex = 0
      }

      if (buffer.length > 1024 * 1024) {
        const lastUrlStart = buffer.lastIndexOf('<url>')
        buffer = lastUrlStart !== -1 ? buffer.slice(lastUrlStart) : ''
      }
    }
  }

  /**
   * Parses a single `<url>` tag content into a `SitemapEntry`.
   */
  private static parseEntry(urlContent: string): SitemapEntry | null {
    const entry: SitemapEntry = { url: '' }

    const locMatch = /<loc>(.*?)<\/loc>/.exec(urlContent)
    if (locMatch) {
      entry.url = this.unescape(locMatch[1])
    } else {
      return null
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

    return entry
  }

  /**
   * Parses a sitemap index XML string into an array of sitemap URLs.
   *
   * @param xml - The raw sitemap index XML content.
   * @returns An array of sub-sitemap URLs.
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

  /**
   * Unescapes special XML entities in a string.
   */
  private static unescape(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
  }
}
