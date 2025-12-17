import type { SitemapEntry, SitemapStreamOptions } from '../types';

export class SitemapStream {
  private options: SitemapStreamOptions;
  private entries: SitemapEntry[] = [];

  constructor(options: SitemapStreamOptions) {
    this.options = { ...options };
    // Remove trailing slash from baseUrl if present
    if (this.options.baseUrl.endsWith('/')) {
      this.options.baseUrl = this.options.baseUrl.slice(0, -1);
    }
  }

  add(entry: string | SitemapEntry): this {
    if (typeof entry === 'string') {
      this.entries.push({ url: entry });
    } else {
      this.entries.push(entry);
    }
    return this;
  }

  addAll(entries: (string | SitemapEntry)[]): this {
    for (const entry of entries) {
      this.add(entry);
    }
    return this;
  }

  toXML(): string {
    const { baseUrl, pretty } = this.options;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`;

    // Add namespaces if needed
    if (this.hasImages()) {
      xml += ` xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`;
    }
    if (this.hasVideos()) {
      xml += ` xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"`;
    }
    if (this.hasNews()) {
      xml += ` xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"`;
    }
    if (this.hasAlternates()) {
      xml += ` xmlns:xhtml="http://www.w3.org/1999/xhtml"`;
    }

    xml += `>\n`;

    for (const entry of this.entries) {
      xml += this.renderUrl(entry, baseUrl, pretty);
    }

    xml += `</urlset>`;

    return xml;
  }

  private renderUrl(entry: SitemapEntry, baseUrl: string, pretty?: boolean): string {
    const indent = pretty ? '  ' : '';
    const subIndent = pretty ? '    ' : '';
    const nl = pretty ? '\n' : '';

    let loc = entry.url;
    if (!loc.startsWith('http')) {
      // Ensure url starts with / if not absolute
      if (!loc.startsWith('/')) loc = '/' + loc;
      loc = baseUrl + loc;
    }

    let item = `${indent}<url>${nl}`;
    item += `${subIndent}<loc>${this.escape(loc)}</loc>${nl}`;

    if (entry.lastmod) {
      const date = entry.lastmod instanceof Date ? entry.lastmod : new Date(entry.lastmod);
      item += `${subIndent}<lastmod>${date.toISOString().split('T')[0]}</lastmod>${nl}`;
    }

    if (entry.changefreq) {
      item += `${subIndent}<changefreq>${entry.changefreq}</changefreq>${nl}`;
    }

    if (entry.priority !== undefined) {
      item += `${subIndent}<priority>${entry.priority.toFixed(1)}</priority>${nl}`;
    }

    // Alternates (i18n)
    if (entry.alternates) {
      for (const alt of entry.alternates) {
        let altLoc = alt.url;
        if (!altLoc.startsWith('http')) {
          if (!altLoc.startsWith('/')) altLoc = '/' + altLoc;
          altLoc = baseUrl + altLoc;
        }
        item += `${subIndent}<xhtml:link rel="alternate" hreflang="${alt.lang}" href="${this.escape(altLoc)}"/>${nl}`;
      }
    }

    // Images
    if (entry.images) {
      for (const img of entry.images) {
        let loc = img.loc;
        if (!loc.startsWith('http')) {
          if (!loc.startsWith('/')) loc = '/' + loc;
          loc = baseUrl + loc;
        }
        item += `${subIndent}<image:image>${nl}`;
        item += `${subIndent}  <image:loc>${this.escape(loc)}</image:loc>${nl}`;
        if (img.title)
          item += `${subIndent}  <image:title>${this.escape(img.title)}</image:title>${nl}`;
        if (img.caption)
          item += `${subIndent}  <image:caption>${this.escape(img.caption)}</image:caption>${nl}`;
        if (img.geo_location)
          item += `${subIndent}  <image:geo_location>${this.escape(img.geo_location)}</image:geo_location>${nl}`;
        if (img.license)
          item += `${subIndent}  <image:license>${this.escape(img.license)}</image:license>${nl}`;
        item += `${subIndent}</image:image>${nl}`;
      }
    }

    // Videos
    // (Implementation skipped for brevity in Phase 1, added in Phase 2)

    // News
    // (Implementation skipped for brevity in Phase 1, added in Phase 2)

    item += `${indent}</url>${nl}`;
    return item;
  }

  private hasImages(): boolean {
    return this.entries.some((e) => e.images && e.images.length > 0);
  }

  private hasVideos(): boolean {
    return this.entries.some((e) => e.videos && e.videos.length > 0);
  }

  private hasNews(): boolean {
    return this.entries.some((e) => !!e.news);
  }

  private hasAlternates(): boolean {
    return this.entries.some((e) => e.alternates && e.alternates.length > 0);
  }

  private escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
