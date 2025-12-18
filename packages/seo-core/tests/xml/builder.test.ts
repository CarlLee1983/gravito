import { describe, expect, it } from 'bun:test'
import type { SitemapEntry } from '../../src/interfaces'
import { GRAVITO_WATERMARK } from '../../src/xml/watermark'
import { XmlStreamBuilder } from '../../src/xml/XmlStreamBuilder'

describe('XmlStreamBuilder', () => {
  const defaultOptions = {
    baseUrl: 'https://example.com',
  }

  describe('start()', () => {
    it('should generate XML header with branding by default', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const header = builder.start()

      expect(header).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(header).toContain(GRAVITO_WATERMARK)
      expect(header).toContain('<urlset')
      expect(header).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
      expect(header).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    })

    it('should omit branding when disabled', () => {
      const builder = new XmlStreamBuilder({
        ...defaultOptions,
        branding: false,
      })
      const header = builder.start()

      expect(header).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(header).not.toContain('Gravito')
      expect(header).toContain('<urlset')
    })
  })

  describe('entry()', () => {
    it('should generate URL entry with loc', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const entry: SitemapEntry = { url: '/page' }
      const xml = builder.entry(entry)

      expect(xml).toContain('<url>')
      expect(xml).toContain('<loc>https://example.com/page</loc>')
      expect(xml).toContain('</url>')
    })

    it('should handle absolute URLs', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const entry: SitemapEntry = { url: 'https://other.com/page' }
      const xml = builder.entry(entry)

      expect(xml).toContain('<loc>https://other.com/page</loc>')
    })

    it('should handle URLs without leading slash', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const entry: SitemapEntry = { url: 'page' }
      const xml = builder.entry(entry)

      expect(xml).toContain('<loc>https://example.com/page</loc>')
    })

    it('should include lastmod as string', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const entry: SitemapEntry = {
        url: '/page',
        lastmod: '2024-01-15',
      }
      const xml = builder.entry(entry)

      expect(xml).toContain('<lastmod>2024-01-15</lastmod>')
    })

    it('should convert Date to ISO string for lastmod', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const date = new Date('2024-01-15T10:30:00Z')
      const entry: SitemapEntry = {
        url: '/page',
        lastmod: date,
      }
      const xml = builder.entry(entry)

      expect(xml).toContain('<lastmod>2024-01-15T10:30:00.000Z</lastmod>')
    })

    it('should include changefreq', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const entry: SitemapEntry = {
        url: '/page',
        changefreq: 'weekly',
      }
      const xml = builder.entry(entry)

      expect(xml).toContain('<changefreq>weekly</changefreq>')
    })

    it('should include priority with one decimal place', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const entry: SitemapEntry = {
        url: '/page',
        priority: 0.8,
      }
      const xml = builder.entry(entry)

      expect(xml).toContain('<priority>0.8</priority>')
    })

    it('should format priority 1.0 correctly', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const entry: SitemapEntry = {
        url: '/page',
        priority: 1,
      }
      const xml = builder.entry(entry)

      expect(xml).toContain('<priority>1.0</priority>')
    })

    it('should include i18n alternates', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const entry: SitemapEntry = {
        url: '/page',
        alternates: [
          { lang: 'en', url: 'https://example.com/en/page' },
          { lang: 'zh-TW', url: 'https://example.com/zh/page' },
        ],
      }
      const xml = builder.entry(entry)

      expect(xml).toContain(
        '<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/page" />'
      )
      expect(xml).toContain(
        '<xhtml:link rel="alternate" hreflang="zh-TW" href="https://example.com/zh/page" />'
      )
    })

    it('should include all optional fields when provided', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const entry: SitemapEntry = {
        url: '/full-page',
        lastmod: '2024-01-15',
        changefreq: 'daily',
        priority: 0.9,
        alternates: [{ lang: 'en', url: 'https://example.com/en/page' }],
      }
      const xml = builder.entry(entry)

      expect(xml).toContain('<loc>https://example.com/full-page</loc>')
      expect(xml).toContain('<lastmod>2024-01-15</lastmod>')
      expect(xml).toContain('<changefreq>daily</changefreq>')
      expect(xml).toContain('<priority>0.9</priority>')
      expect(xml).toContain('xhtml:link')
    })
  })

  describe('end()', () => {
    it('should generate closing tag', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const footer = builder.end()

      expect(footer).toBe('</urlset>')
    })
  })

  describe('buildFull()', () => {
    it('should generate complete XML document', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const entries: SitemapEntry[] = [
        { url: '/', priority: 1.0 },
        { url: '/about', priority: 0.8 },
      ]

      const xml = builder.buildFull(entries)

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(xml).toContain('<urlset')
      expect(xml).toContain('<loc>https://example.com/</loc>')
      expect(xml).toContain('<loc>https://example.com/about</loc>')
      expect(xml).toContain('</urlset>')
    })

    it('should return valid XML for empty entries', () => {
      const builder = new XmlStreamBuilder(defaultOptions)
      const xml = builder.buildFull([])

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(xml).toContain('<urlset')
      expect(xml).toContain('</urlset>')
      // Should have no <url> elements
      expect(xml).not.toContain('<url>')
    })

    it('should produce valid XML structure', () => {
      const builder = new XmlStreamBuilder({
        baseUrl: 'https://test.com',
        branding: false,
      })
      const entries: SitemapEntry[] = [{ url: '/page1' }, { url: '/page2' }, { url: '/page3' }]

      const xml = builder.buildFull(entries)

      // Count opening and closing tags
      const urlOpens = (xml.match(/<url>/g) || []).length
      const urlCloses = (xml.match(/<\/url>/g) || []).length

      expect(urlOpens).toBe(3)
      expect(urlCloses).toBe(3)
    })
  })
})

describe('GRAVITO_WATERMARK', () => {
  it('should contain branding information', () => {
    expect(GRAVITO_WATERMARK).toContain('Gravito SmartMap Engine')
    expect(GRAVITO_WATERMARK).toContain('gravito.dev')
  })

  it('should be wrapped in XML comment', () => {
    expect(GRAVITO_WATERMARK.trim().startsWith('<!--')).toBe(true)
    expect(GRAVITO_WATERMARK.trim().endsWith('-->')).toBe(true)
  })
})
