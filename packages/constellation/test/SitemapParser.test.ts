import { describe, expect, test } from 'bun:test'
import { SitemapParser } from '../src/core/SitemapParser'

describe('SitemapParser', () => {
  test('should parse basic sitemap XML', () => {
    const xml = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2024-01-01T00:00:00.000Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2024-01-02T00:00:00.000Z</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
    `
    const entries = SitemapParser.parse(xml)
    expect(entries).toHaveLength(2)
    expect(entries[0].url).toBe('https://example.com/')
    expect(entries[0].lastmod instanceof Date).toBe(true)
    expect((entries[0].lastmod as Date).toISOString()).toBe('2024-01-01T00:00:00.000Z')
    expect(entries[0].changefreq).toBe('daily')
    expect(entries[0].priority).toBe(1.0)

    expect(entries[1].url).toBe('https://example.com/about')
    expect(entries[1].lastmod instanceof Date).toBe(true)
    expect((entries[1].lastmod as Date).toISOString()).toBe('2024-01-02T00:00:00.000Z')
    expect(entries[1].changefreq).toBe('monthly')
    expect(entries[1].priority).toBe(0.8)
  })

  test('should handle escaped characters', () => {
    const xml = `
<urlset>
  <url>
    <loc>https://example.com/page?id=1&amp;name=test&apos;s</loc>
  </url>
</urlset>
    `
    const entries = SitemapParser.parse(xml)
    expect(entries[0].url).toBe("https://example.com/page?id=1&name=test's")
  })

  test('should parse sitemap index XML', () => {
    const xml = `
<sitemapindex>
  <sitemap>
    <loc>https://example.com/sitemap-1.xml</loc>
    <lastmod>2024-01-01</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-2.xml</loc>
  </sitemap>
</sitemapindex>
    `
    const urls = SitemapParser.parseIndex(xml)
    expect(urls).toEqual(['https://example.com/sitemap-1.xml', 'https://example.com/sitemap-2.xml'])
  })

  test('should return empty array for invalid XML', () => {
    const entries = SitemapParser.parse('invalid xml')
    expect(entries).toEqual([])
  })
})
