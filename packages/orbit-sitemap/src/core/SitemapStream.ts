import type { SitemapEntry, SitemapStreamOptions } from '../types'

export class SitemapStream {
  private options: SitemapStreamOptions
  private entries: SitemapEntry[] = []

  constructor(options: SitemapStreamOptions) {
    this.options = { ...options }
    // Remove trailing slash from baseUrl if present
    if (this.options.baseUrl.endsWith('/')) {
      this.options.baseUrl = this.options.baseUrl.slice(0, -1)
    }
  }

  add(entry: string | SitemapEntry): this {
    if (typeof entry === 'string') {
      this.entries.push({ url: entry })
    } else {
      this.entries.push(entry)
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

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`

    // Add namespaces if needed
    if (this.hasImages()) {
      xml += ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`
    }
    if (this.hasVideos()) {
      xml += ` xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"`
    }
    if (this.hasNews()) {
      xml += ` xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"`
    }
    if (this.hasAlternates()) {
      xml += ` xmlns:xhtml="http://www.w3.org/1999/xhtml"`
    }

    xml += `>\n`

    for (const entry of this.entries) {
      xml += this.renderUrl(entry, baseUrl, pretty)
    }

    xml += `</urlset>`

    return xml
  }

  private renderUrl(entry: SitemapEntry, baseUrl: string, pretty?: boolean): string {
    const indent = pretty ? '  ' : ''
    const subIndent = pretty ? '    ' : ''
    const nl = pretty ? '\n' : ''

    let loc = entry.url
    if (!loc.startsWith('http')) {
      // Ensure url starts with / if not absolute
      if (!loc.startsWith('/')) loc = '/' + loc
      loc = baseUrl + loc
    }

    let item = `${indent}<url>${nl}`
    item += `${subIndent}<loc>${this.escape(loc)}</loc>${nl}`

    if (entry.lastmod) {
      const date = entry.lastmod instanceof Date ? entry.lastmod : new Date(entry.lastmod)
      item += `${subIndent}<lastmod>${date.toISOString().split('T')[0]}</lastmod>${nl}`
    }

    if (entry.changefreq) {
      item += `${subIndent}<changefreq>${entry.changefreq}</changefreq>${nl}`
    }

    if (entry.priority !== undefined) {
      item += `${subIndent}<priority>${entry.priority.toFixed(1)}</priority>${nl}`
    }

    // Alternates (i18n)
    if (entry.alternates) {
      for (const alt of entry.alternates) {
        let altLoc = alt.url
        if (!altLoc.startsWith('http')) {
          if (!altLoc.startsWith('/')) altLoc = '/' + altLoc
          altLoc = baseUrl + altLoc
        }
        item += `${subIndent}<xhtml:link rel="alternate" hreflang="${alt.lang}" href="${this.escape(altLoc)}"/>${nl}`
      }
    }

    // Images
    if (entry.images) {
      for (const img of entry.images) {
        let loc = img.loc
        if (!loc.startsWith('http')) {
          if (!loc.startsWith('/')) loc = '/' + loc
          loc = baseUrl + loc
        }
        item += `${subIndent}<image:image>${nl}`
        item += `${subIndent}  <image:loc>${this.escape(loc)}</image:loc>${nl}`
        if (img.title)
          item += `${subIndent}  <image:title>${this.escape(img.title)}</image:title>${nl}`
        if (img.caption)
          item += `${subIndent}  <image:caption>${this.escape(img.caption)}</image:caption>${nl}`
        if (img.geo_location)
          item += `${subIndent}  <image:geo_location>${this.escape(img.geo_location)}</image:geo_location>${nl}`
        if (img.license)
          item += `${subIndent}  <image:license>${this.escape(img.license)}</image:license>${nl}`
        item += `${subIndent}</image:image>${nl}`
      }
    }

    // Videos
    if (entry.videos) {
      for (const video of entry.videos) {
        item += `${subIndent}<video:video>${nl}`
        item += `${subIndent}  <video:thumbnail_loc>${this.escape(video.thumbnail_loc)}</video:thumbnail_loc>${nl}`
        item += `${subIndent}  <video:title>${this.escape(video.title)}</video:title>${nl}`
        item += `${subIndent}  <video:description>${this.escape(video.description)}</video:description>${nl}`
        if (video.content_loc)
          item += `${subIndent}  <video:content_loc>${this.escape(video.content_loc)}</video:content_loc>${nl}`
        if (video.player_loc)
          item += `${subIndent}  <video:player_loc>${this.escape(video.player_loc)}</video:player_loc>${nl}`
        if (video.duration)
          item += `${subIndent}  <video:duration>${video.duration}</video:duration>${nl}`
        if (video.view_count)
          item += `${subIndent}  <video:view_count>${video.view_count}</video:view_count>${nl}`
        if (video.publication_date) {
          const pubDate =
            video.publication_date instanceof Date
              ? video.publication_date
              : new Date(video.publication_date)
          item += `${subIndent}  <video:publication_date>${pubDate.toISOString()}</video:publication_date>${nl}`
        }
        if (video.family_friendly)
          item += `${subIndent}  <video:family_friendly>${video.family_friendly}</video:family_friendly>${nl}`
        if (video.tag) {
          for (const tag of video.tag) {
            item += `${subIndent}  <video:tag>${this.escape(tag)}</video:tag>${nl}`
          }
        }
        item += `${subIndent}</video:video>${nl}`
      }
    }

    // News
    if (entry.news) {
      item += `${subIndent}<news:news>${nl}`
      item += `${subIndent}  <news:publication>${nl}`
      item += `${subIndent}    <news:name>${this.escape(entry.news.publication.name)}</news:name>${nl}`
      item += `${subIndent}    <news:language>${this.escape(entry.news.publication.language)}</news:language>${nl}`
      item += `${subIndent}  </news:publication>${nl}`

      const pubDate =
        entry.news.publication_date instanceof Date
          ? entry.news.publication_date
          : new Date(entry.news.publication_date)
      item += `${subIndent}  <news:publication_date>${pubDate.toISOString()}</news:publication_date>${nl}`
      item += `${subIndent}  <news:title>${this.escape(entry.news.title)}</news:title>${nl}`

      if (entry.news.genres)
        item += `${subIndent}  <news:genres>${this.escape(entry.news.genres)}</news:genres>${nl}`
      if (entry.news.keywords)
        item += `${subIndent}  <news:keywords>${entry.news.keywords.map((k) => this.escape(k)).join(', ')}</news:keywords>${nl}`
      item += `${subIndent}</news:news>${nl}`
    }

    item += `${indent}</url>${nl}`
    return item
  }

  private hasImages(): boolean {
    return this.entries.some((e) => e.images && e.images.length > 0)
  }

  private hasVideos(): boolean {
    return this.entries.some((e) => e.videos && e.videos.length > 0)
  }

  private hasNews(): boolean {
    return this.entries.some((e) => !!e.news)
  }

  private hasAlternates(): boolean {
    return this.entries.some((e) => e.alternates && e.alternates.length > 0)
  }

  private escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}
