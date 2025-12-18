import { describe, expect, it } from 'bun:test'
import { SeoRenderer } from '../../src/engine/SeoRenderer'
import type { SitemapEntry } from '../../src/interfaces'
import type { SeoConfig } from '../../src/types'

describe('SeoRenderer', () => {
  const config: SeoConfig = {
    mode: 'dynamic',
    baseUrl: 'https://example.com',
    resolvers: [],
  }
  const renderer = new SeoRenderer(config)

  it('should render normal sitemap when <= 50000 entries', () => {
    const entries: SitemapEntry[] = [{ url: '/page1' }, { url: '/page2' }]
    const xml = renderer.render(entries, 'https://example.com/sitemap.xml')

    expect(xml).toContain('<urlset')
    expect(xml).toContain('<loc>https://example.com/page1</loc>')
    expect(xml).not.toContain('<sitemapindex')
  })

  it('should render sitemap index when > 50000 entries and no page param', () => {
    // Create mock long array (length 50001)
    // We use Array.from to avoid actual memory usage? No, we need actual array for length check
    // But we can mock the array access if needed, but creating 50k tiny objects is fast enough in JS
    const entries = Array.from({ length: 50001 }, (_, i) => ({
      url: `/page-${i}`,
    }))

    const xml = renderer.render(entries, 'https://example.com/sitemap.xml')

    expect(xml).toContain('<sitemapindex')
    expect(xml).toContain('<loc>https://example.com/sitemap.xml?page=1</loc>')
    expect(xml).toContain('<loc>https://example.com/sitemap.xml?page=2</loc>')
    expect(xml).not.toContain('<urlset')
  })

  it('should render specific slice when page param is provided', () => {
    const entries = Array.from({ length: 50001 }, (_, i) => ({
      url: `/page-${i}`,
    }))

    // Page 2 should have 1 item (index 50000)
    const xml = renderer.render(entries, 'https://example.com/sitemap.xml', 2)

    expect(xml).toContain('<urlset')
    expect(xml).toContain('<loc>https://example.com/page-50000</loc>')
    expect(xml).not.toContain('page-0') // Should not have first item
  })

  it('should handle page out of bounds', () => {
    // Create large entries > MAX_ENTRIES to trigger pagination logic
    const entries = Array.from({ length: 50001 }, (_, i) => ({
      url: `/page-${i}`,
    }))
    const xml = renderer.render(entries, 'https://example.com/sitemap.xml', 999)

    expect(xml).toContain('<urlset')
    expect(xml).not.toContain('<loc>') // Empty urlset
  })
})
