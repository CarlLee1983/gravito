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

    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" `
    xml += `xmlns:xhtml="http://www.w3.org/1999/xhtml" `
    xml += `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" `
    xml += `xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n`
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

    // Images
    if (item.images && item.images.length > 0) {
      for (const img of item.images) {
        xml += `    <image:image>\n`
        xml += `      <image:loc>${img.url}</image:loc>\n`
        if (img.title) xml += `      <image:title>${img.title}</image:title>\n`
        if (img.caption) xml += `      <image:caption>${img.caption}</image:caption>\n`
        if (img.license) xml += `      <image:license>${img.license}</image:license>\n`
        if (img.geo_location)
          xml += `      <image:geo_location>${img.geo_location}</image:geo_location>\n`
        xml += `    </image:image>\n`
      }
    }

    // Videos
    if (item.videos && item.videos.length > 0) {
      for (const vid of item.videos) {
        xml += `    <video:video>\n`
        xml += `      <video:thumbnail_loc>${vid.thumbnail_loc}</video:thumbnail_loc>\n`
        xml += `      <video:title>${vid.title}</video:title>\n`
        xml += `      <video:description>${vid.description}</video:description>\n`
        if (vid.content_loc)
          xml += `      <video:content_loc>${vid.content_loc}</video:content_loc>\n`
        if (vid.player_loc) xml += `      <video:player_loc>${vid.player_loc}</video:player_loc>\n`
        if (vid.duration) xml += `      <video:duration>${vid.duration}</video:duration>\n`
        if (vid.expiration_date) {
          const date =
            vid.expiration_date instanceof Date
              ? vid.expiration_date.toISOString()
              : vid.expiration_date
          xml += `      <video:expiration_date>${date}</video:expiration_date>\n`
        }
        if (vid.rating) xml += `      <video:rating>${vid.rating.toFixed(1)}</video:rating>\n`
        if (vid.view_count) xml += `      <video:view_count>${vid.view_count}</video:view_count>\n`
        if (vid.publication_date) {
          const date =
            vid.publication_date instanceof Date
              ? vid.publication_date.toISOString()
              : vid.publication_date
          xml += `      <video:publication_date>${date}</video:publication_date>\n`
        }
        if (vid.family_friendly)
          xml += `      <video:family_friendly>${vid.family_friendly}</video:family_friendly>\n`
        if (vid.live) xml += `      <video:live>${vid.live}</video:live>\n`
        xml += `    </video:video>\n`
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
