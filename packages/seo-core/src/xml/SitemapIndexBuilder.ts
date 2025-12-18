import { GRAVITO_WATERMARK } from './watermark'

export interface SitemapIndexEntry {
  url: string
  lastmod?: Date | string
}

export interface IndexBuilderOptions {
  branding?: boolean
}

export class SitemapIndexBuilder {
  constructor(private options: IndexBuilderOptions) {}

  start(): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`

    if (this.options.branding !== false) {
      xml += `${GRAVITO_WATERMARK}\n`
    }

    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    return xml
  }

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

  end(): string {
    return `</sitemapindex>`
  }

  buildFull(entries: SitemapIndexEntry[]): string {
    let xml = this.start()
    for (const entry of entries) {
      xml += this.entry(entry)
    }
    xml += this.end()
    return xml
  }
}
