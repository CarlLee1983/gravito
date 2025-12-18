import type { SitemapEntry } from '../interfaces'
import { GRAVITO_WATERMARK } from './watermark'

export interface BuilderOptions {
  baseUrl: string
  branding?: boolean
}

export class XmlStreamBuilder {
  constructor(private options: BuilderOptions) {}

  /**
   * Generates the XML Header
   */
  start(): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`

    if (this.options.branding !== false) {
      xml += `${GRAVITO_WATERMARK}\n`
    }

    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`
    return xml
  }

  /**
   * Generates a single URL entry
   */
  entry(item: SitemapEntry): string {
    const loc = item.url.startsWith('http')
      ? item.url
      : `${this.options.baseUrl}${item.url.startsWith('/') ? '' : '/'}${item.url}`

    let xml = `  <url>\n`
    xml += `    <loc>${loc}</loc>\n`

    if (item.lastmod) {
      const date = item.lastmod instanceof Date ? item.lastmod.toISOString() : item.lastmod
      xml += `    <lastmod>${date}</lastmod>\n`
    }

    if (item.changefreq) {
      xml += `    <changefreq>${item.changefreq}</changefreq>\n`
    }

    if (item.priority !== undefined) {
      xml += `    <priority>${item.priority.toFixed(1)}</priority>\n`
    }

    // i18n alternates
    if (item.alternates && item.alternates.length > 0) {
      for (const alt of item.alternates) {
        xml += `    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${alt.url}" />\n`
      }
    }

    xml += `  </url>\n`
    return xml
  }

  /**
   * Generates the XML Footer
   */
  end(): string {
    return `</urlset>`
  }

  /**
   * Helper to build full XML at once
   */
  buildFull(entries: SitemapEntry[]): string {
    let xml = this.start()
    for (const entry of entries) {
      xml += this.entry(entry)
    }
    xml += this.end()
    return xml
  }
}
