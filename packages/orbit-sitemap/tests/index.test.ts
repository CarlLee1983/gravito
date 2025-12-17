import { describe, expect, it } from 'bun:test';
import { SitemapIndex } from '../src/core/SitemapIndex';
import { SitemapStream } from '../src/core/SitemapStream';

describe('SitemapStream', () => {
  const baseUrl = 'https://example.com';

  it('should generate basic sitemap xml', () => {
    const sitemap = new SitemapStream({ baseUrl });
    sitemap.add('/');
    sitemap.add({ url: '/about', priority: 0.8, changefreq: 'daily' });

    const xml = sitemap.toXML();

    expect(xml).toContain('<loc>https://example.com/</loc>');
    expect(xml).toContain('<loc>https://example.com/about</loc>');
    expect(xml).toContain('<priority>0.8</priority>');
    expect(xml).toContain('<changefreq>daily</changefreq>');
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it('should handle dates correctly', () => {
    const sitemap = new SitemapStream({ baseUrl });
    const date = new Date('2024-01-01');
    sitemap.add({ url: '/', lastmod: date });

    const xml = sitemap.toXML();
    expect(xml).toContain('<lastmod>2024-01-01</lastmod>');
  });

  it('should handle alternates for i18n', () => {
    const sitemap = new SitemapStream({ baseUrl });
    sitemap.add({
      url: '/',
      alternates: [
        { lang: 'en', url: '/' },
        { lang: 'zh-TW', url: '/zh' },
      ],
    });

    const xml = sitemap.toXML();
    expect(xml).toContain('xhtml:link rel="alternate" hreflang="en" href="https://example.com/"');
    expect(xml).toContain(
      'xhtml:link rel="alternate" hreflang="zh-TW" href="https://example.com/zh"'
    );
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  it('should add image extension namespace only when needed', () => {
    const sitemap = new SitemapStream({ baseUrl });
    sitemap.add({
      url: '/gallery',
      images: [{ loc: '/img/1.jpg', title: 'Image 1' }],
    });

    const xml = sitemap.toXML();
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
    expect(xml).toContain('<image:loc>https://example.com/img/1.jpg</image:loc>');
  });
});

describe('SitemapIndex', () => {
  const baseUrl = 'https://example.com';

  it('should generate sitemap index xml', () => {
    const index = new SitemapIndex({ baseUrl });
    index.add('sitemap-1.xml');
    index.add({ url: 'sitemap-2.xml', lastmod: '2024-01-01' });

    const xml = index.toXML();
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://example.com/sitemap-1.xml</loc>');
    expect(xml).toContain('<loc>https://example.com/sitemap-2.xml</loc>');
    expect(xml).toContain('<lastmod>2024-01-01</lastmod>');
  });
});
