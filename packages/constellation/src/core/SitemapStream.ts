import { getEscapeHtml } from '@gravito/core'
import type { SitemapEntry, SitemapStreamOptions } from '../types'

/**
 * SitemapStream handles the low-level generation of sitemap XML content.
 *
 * It supports standard sitemap tags as well as Google-specific extensions for
 * images, videos, news, and internationalization (i18n) via `xhtml:link`.
 *
 * @example
 * ```typescript
 * const stream = new SitemapStream({ baseUrl: 'https://example.com' });
 * stream.add({
 *   url: '/contact',
 *   changefreq: 'monthly',
 *   priority: 0.5
 * });
 * const xml = stream.toXML();
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class SitemapStream {
  private options: SitemapStreamOptions
  private entries: SitemapEntry[] = []
  private flags = {
    hasImages: false,
    hasVideos: false,
    hasNews: false,
    hasAlternates: false,
  }
  private escapeHtml = getEscapeHtml()

  constructor(options: SitemapStreamOptions) {
    this.options = { ...options }
    // Remove trailing slash from baseUrl if present
    if (this.options.baseUrl.endsWith('/')) {
      this.options.baseUrl = this.options.baseUrl.slice(0, -1)
    }
  }

  /**
   * Adds a single entry to the sitemap stream.
   *
   * @param entry - A URL string or a complete `SitemapEntry` object.
   * @returns The `SitemapStream` instance for chaining.
   */
  add(entry: string | SitemapEntry): this {
    const e = typeof entry === 'string' ? { url: entry } : entry
    this.entries.push(e)

    if (e.images && e.images.length > 0) {
      this.flags.hasImages = true
    }
    if (e.videos && e.videos.length > 0) {
      this.flags.hasVideos = true
    }
    if (e.news) {
      this.flags.hasNews = true
    }
    if (e.alternates && e.alternates.length > 0) {
      this.flags.hasAlternates = true
    }

    return this
  }

  /**
   * Adds multiple entries to the sitemap stream.
   *
   * @param entries - An array of URL strings or `SitemapEntry` objects.
   * @returns The `SitemapStream` instance for chaining.
   */
  addAll(entries: (string | SitemapEntry)[]): this {
    for (const entry of entries) {
      this.add(entry)
    }
    return this
  }

  /**
   * Generates the sitemap XML content.
   *
   * Automatically includes the necessary XML namespaces for images, videos, news,
   * and internationalization if the entries contain such metadata.
   *
   * @returns The complete XML string for the sitemap.
   */
  toXML(): string {
    const parts: string[] = []
    for (const chunk of this.toSyncIterable()) {
      parts.push(chunk)
    }
    return parts.join('')
  }

  /**
   * 以 AsyncGenerator 方式產生 XML 內容。
   * 每次 yield 一個邏輯區塊，適合串流寫入場景，可減少記憶體峰值。
   *
   * @returns AsyncGenerator 產生 XML 字串片段
   *
   * @example
   * ```typescript
   * const stream = new SitemapStream({ baseUrl: 'https://example.com' })
   * stream.add({ url: '/page1' })
   * stream.add({ url: '/page2' })
   *
   * for await (const chunk of stream.toAsyncIterable()) {
   *   process.stdout.write(chunk)
   * }
   * ```
   *
   * @since 3.1.0
   */
  async *toAsyncIterable(): AsyncGenerator<string, void, unknown> {
    // Yield XML 宣告
    yield '<?xml version="1.0" encoding="UTF-8"?>\n'

    // Yield urlset 開標籤與命名空間
    yield this.buildUrlsetOpenTag()

    // 逐條 yield entry XML
    const { baseUrl, pretty } = this.options
    for (const entry of this.entries) {
      yield this.renderUrl(entry, baseUrl, pretty)
    }

    // Yield 閉標籤
    yield '</urlset>'
  }

  /**
   * 同步版本的 iterable，供 toXML() 使用。
   */
  private *toSyncIterable(): Generator<string> {
    yield '<?xml version="1.0" encoding="UTF-8"?>\n'
    yield this.buildUrlsetOpenTag()

    const { baseUrl, pretty } = this.options
    for (const entry of this.entries) {
      yield this.renderUrl(entry, baseUrl, pretty)
    }

    yield '</urlset>'
  }

  /**
   * 建立 urlset 開標籤與所有必要的 XML 命名空間。
   */
  private buildUrlsetOpenTag(): string {
    const parts: string[] = []

    parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')

    if (this.flags.hasImages) {
      parts.push(' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')
    }
    if (this.flags.hasVideos) {
      parts.push(' xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"')
    }
    if (this.flags.hasNews) {
      parts.push(' xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"')
    }
    if (this.flags.hasAlternates) {
      parts.push(' xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    }

    parts.push('>\n')

    return parts.join('')
  }

  /**
   * Renders a single sitemap entry into its XML representation.
   */
  private renderUrl(entry: SitemapEntry, baseUrl: string, pretty?: boolean): string {
    const indent = pretty ? '  ' : ''
    const subIndent = pretty ? '    ' : ''
    const nl = pretty ? '\n' : ''
    const parts: string[] = []

    let loc = entry.url
    if (!loc.startsWith('http')) {
      if (!loc.startsWith('/')) {
        loc = `/${loc}`
      }
      loc = baseUrl + loc
    }

    parts.push(`${indent}<url>${nl}`)
    parts.push(`${subIndent}<loc>${this.escapeHtml(loc)}</loc>${nl}`)

    if (entry.lastmod) {
      const date = entry.lastmod instanceof Date ? entry.lastmod : new Date(entry.lastmod)
      parts.push(`${subIndent}<lastmod>${date.toISOString().split('T')[0]}</lastmod>${nl}`)
    }

    if (entry.changefreq) {
      parts.push(`${subIndent}<changefreq>${entry.changefreq}</changefreq>${nl}`)
    }

    if (entry.priority !== undefined) {
      parts.push(`${subIndent}<priority>${entry.priority.toFixed(1)}</priority>${nl}`)
    }

    if (entry.alternates) {
      for (const alt of entry.alternates) {
        let altLoc = alt.url
        if (!altLoc.startsWith('http')) {
          if (!altLoc.startsWith('/')) {
            altLoc = `/${altLoc}`
          }
          altLoc = baseUrl + altLoc
        }
        parts.push(
          `${subIndent}<xhtml:link rel="alternate" hreflang="${alt.lang}" href="${this.escapeHtml(altLoc)}"/>${nl}`
        )
      }
    }

    if (entry.redirect?.canonical) {
      let canonicalUrl = entry.redirect.canonical
      if (!canonicalUrl.startsWith('http')) {
        if (!canonicalUrl.startsWith('/')) {
          canonicalUrl = `/${canonicalUrl}`
        }
        canonicalUrl = baseUrl + canonicalUrl
      }
      parts.push(
        `${subIndent}<xhtml:link rel="canonical" href="${this.escapeHtml(canonicalUrl)}"/>${nl}`
      )
    }

    if (entry.redirect && !entry.redirect.canonical) {
      parts.push(
        `${subIndent}<!-- Redirect: ${entry.redirect.from} → ${entry.redirect.to} (${entry.redirect.type}) -->${nl}`
      )
    }

    if (entry.images) {
      for (const img of entry.images) {
        let loc = img.loc
        if (!loc.startsWith('http')) {
          if (!loc.startsWith('/')) {
            loc = `/${loc}`
          }
          loc = baseUrl + loc
        }
        parts.push(`${subIndent}<image:image>${nl}`)
        parts.push(`${subIndent}  <image:loc>${this.escapeHtml(loc)}</image:loc>${nl}`)
        if (img.title) {
          parts.push(`${subIndent}  <image:title>${this.escapeHtml(img.title)}</image:title>${nl}`)
        }
        if (img.caption) {
          parts.push(
            `${subIndent}  <image:caption>${this.escapeHtml(img.caption)}</image:caption>${nl}`
          )
        }
        if (img.geo_location) {
          parts.push(
            `${subIndent}  <image:geo_location>${this.escapeHtml(img.geo_location)}</image:geo_location>${nl}`
          )
        }
        if (img.license) {
          parts.push(
            `${subIndent}  <image:license>${this.escapeHtml(img.license)}</image:license>${nl}`
          )
        }
        parts.push(`${subIndent}</image:image>${nl}`)
      }
    }

    if (entry.videos) {
      for (const video of entry.videos) {
        parts.push(`${subIndent}<video:video>${nl}`)
        parts.push(
          `${subIndent}  <video:thumbnail_loc>${this.escapeHtml(video.thumbnail_loc)}</video:thumbnail_loc>${nl}`
        )
        parts.push(`${subIndent}  <video:title>${this.escapeHtml(video.title)}</video:title>${nl}`)
        parts.push(
          `${subIndent}  <video:description>${this.escapeHtml(video.description)}</video:description>${nl}`
        )
        if (video.content_loc) {
          parts.push(
            `${subIndent}  <video:content_loc>${this.escapeHtml(video.content_loc)}</video:content_loc>${nl}`
          )
        }
        if (video.player_loc) {
          parts.push(
            `${subIndent}  <video:player_loc>${this.escapeHtml(video.player_loc)}</video:player_loc>${nl}`
          )
        }
        if (video.duration) {
          parts.push(`${subIndent}  <video:duration>${video.duration}</video:duration>${nl}`)
        }
        if (video.view_count) {
          parts.push(`${subIndent}  <video:view_count>${video.view_count}</video:view_count>${nl}`)
        }
        if (video.publication_date) {
          const pubDate =
            video.publication_date instanceof Date
              ? video.publication_date
              : new Date(video.publication_date)
          parts.push(
            `${subIndent}  <video:publication_date>${pubDate.toISOString()}</video:publication_date>${nl}`
          )
        }
        if (video.family_friendly) {
          parts.push(
            `${subIndent}  <video:family_friendly>${video.family_friendly}</video:family_friendly>${nl}`
          )
        }
        if (video.tag) {
          for (const tag of video.tag) {
            parts.push(`${subIndent}  <video:tag>${this.escapeHtml(tag)}</video:tag>${nl}`)
          }
        }
        parts.push(`${subIndent}</video:video>${nl}`)
      }
    }

    if (entry.news) {
      parts.push(`${subIndent}<news:news>${nl}`)
      parts.push(`${subIndent}  <news:publication>${nl}`)
      parts.push(
        `${subIndent}    <news:name>${this.escapeHtml(entry.news.publication.name)}</news:name>${nl}`
      )
      parts.push(
        `${subIndent}    <news:language>${this.escapeHtml(entry.news.publication.language)}</news:language>${nl}`
      )
      parts.push(`${subIndent}  </news:publication>${nl}`)

      const pubDate =
        entry.news.publication_date instanceof Date
          ? entry.news.publication_date
          : new Date(entry.news.publication_date)
      parts.push(
        `${subIndent}  <news:publication_date>${pubDate.toISOString()}</news:publication_date>${nl}`
      )
      parts.push(`${subIndent}  <news:title>${this.escapeHtml(entry.news.title)}</news:title>${nl}`)

      if (entry.news.genres) {
        parts.push(
          `${subIndent}  <news:genres>${this.escapeHtml(entry.news.genres)}</news:genres>${nl}`
        )
      }
      if (entry.news.keywords) {
        parts.push(
          `${subIndent}  <news:keywords>${entry.news.keywords.map((k) => this.escapeHtml(k)).join(', ')}</news:keywords>${nl}`
        )
      }
      parts.push(`${subIndent}</news:news>${nl}`)
    }

    parts.push(`${indent}</url>${nl}`)
    return parts.join('')
  }

  /**
   * Escapes special XML characters in a string.
   */
  /**
   * Returns all entries currently in the stream.
   *
   * @returns An array of `SitemapEntry` objects.
   */
  getEntries(): SitemapEntry[] {
    return this.entries
  }
}
