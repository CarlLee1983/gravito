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

  constructor(options: SitemapStreamOptions) {
    this.options = { ...options }
    // Remove trailing slash from baseUrl if present
    if (this.options.baseUrl.endsWith('/')) {
      this.options.baseUrl = this.options.baseUrl.slice(0, -1)
    }
  }

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

  addAll(entries: (string | SitemapEntry)[]): this {
    for (const entry of entries) {
      this.add(entry)
    }
    return this
  }

  toXML(): string {
    const { baseUrl, pretty } = this.options
    const parts: string[] = []

    parts.push('<?xml version="1.0" encoding="UTF-8"?>\n')
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

    for (const entry of this.entries) {
      parts.push(this.renderUrl(entry, baseUrl, pretty))
    }

    parts.push('</urlset>')

    return parts.join('')
  }

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
    parts.push(`${subIndent}<loc>${this.escape(loc)}</loc>${nl}`)

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
          `${subIndent}<xhtml:link rel="alternate" hreflang="${alt.lang}" href="${this.escape(altLoc)}"/>${nl}`
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
        `${subIndent}<xhtml:link rel="canonical" href="${this.escape(canonicalUrl)}"/>${nl}`
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
        parts.push(`${subIndent}  <image:loc>${this.escape(loc)}</image:loc>${nl}`)
        if (img.title) {
          parts.push(`${subIndent}  <image:title>${this.escape(img.title)}</image:title>${nl}`)
        }
        if (img.caption) {
          parts.push(
            `${subIndent}  <image:caption>${this.escape(img.caption)}</image:caption>${nl}`
          )
        }
        if (img.geo_location) {
          parts.push(
            `${subIndent}  <image:geo_location>${this.escape(img.geo_location)}</image:geo_location>${nl}`
          )
        }
        if (img.license) {
          parts.push(
            `${subIndent}  <image:license>${this.escape(img.license)}</image:license>${nl}`
          )
        }
        parts.push(`${subIndent}</image:image>${nl}`)
      }
    }

    if (entry.videos) {
      for (const video of entry.videos) {
        parts.push(`${subIndent}<video:video>${nl}`)
        parts.push(
          `${subIndent}  <video:thumbnail_loc>${this.escape(video.thumbnail_loc)}</video:thumbnail_loc>${nl}`
        )
        parts.push(`${subIndent}  <video:title>${this.escape(video.title)}</video:title>${nl}`)
        parts.push(
          `${subIndent}  <video:description>${this.escape(video.description)}</video:description>${nl}`
        )
        if (video.content_loc) {
          parts.push(
            `${subIndent}  <video:content_loc>${this.escape(video.content_loc)}</video:content_loc>${nl}`
          )
        }
        if (video.player_loc) {
          parts.push(
            `${subIndent}  <video:player_loc>${this.escape(video.player_loc)}</video:player_loc>${nl}`
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
            parts.push(`${subIndent}  <video:tag>${this.escape(tag)}</video:tag>${nl}`)
          }
        }
        parts.push(`${subIndent}</video:video>${nl}`)
      }
    }

    if (entry.news) {
      parts.push(`${subIndent}<news:news>${nl}`)
      parts.push(`${subIndent}  <news:publication>${nl}`)
      parts.push(
        `${subIndent}    <news:name>${this.escape(entry.news.publication.name)}</news:name>${nl}`
      )
      parts.push(
        `${subIndent}    <news:language>${this.escape(entry.news.publication.language)}</news:language>${nl}`
      )
      parts.push(`${subIndent}  </news:publication>${nl}`)

      const pubDate =
        entry.news.publication_date instanceof Date
          ? entry.news.publication_date
          : new Date(entry.news.publication_date)
      parts.push(
        `${subIndent}  <news:publication_date>${pubDate.toISOString()}</news:publication_date>${nl}`
      )
      parts.push(`${subIndent}  <news:title>${this.escape(entry.news.title)}</news:title>${nl}`)

      if (entry.news.genres) {
        parts.push(
          `${subIndent}  <news:genres>${this.escape(entry.news.genres)}</news:genres>${nl}`
        )
      }
      if (entry.news.keywords) {
        parts.push(
          `${subIndent}  <news:keywords>${entry.news.keywords.map((k) => this.escape(k)).join(', ')}</news:keywords>${nl}`
        )
      }
      parts.push(`${subIndent}</news:news>${nl}`)
    }

    parts.push(`${indent}</url>${nl}`)
    return parts.join('')
  }

  private escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  getEntries(): SitemapEntry[] {
    return this.entries
  }
}
