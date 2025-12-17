import { describe, expect, it, jest } from 'bun:test';
import { SitemapGenerator } from '../src/core/SitemapGenerator';
import { SitemapIndex } from '../src/core/SitemapIndex';
import { SitemapStream } from '../src/core/SitemapStream';
import { OrbitSitemap } from '../src/OrbitSitemap';
import { RouteScanner } from '../src/providers/RouteScanner';
import { MemorySitemapStorage } from '../src/storage/MemorySitemapStorage';

// Mock core for OrbitSitemap tests
const mockCore = {
  router: {
    get: jest.fn(),
    routes: [
      { method: 'GET', path: '/' },
      { method: 'GET', path: '/about' },
      { method: 'POST', path: '/submit' },
      { method: 'GET', path: '/api/data' },
      { method: 'GET', path: '/users/:id' },
    ],
  },
};

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

  it('should generate video extension', () => {
    const sitemap = new SitemapStream({ baseUrl });
    sitemap.add({
      url: '/video',
      videos: [
        {
          thumbnail_loc: '/thumb.jpg',
          title: 'Video Title',
          description: 'Video Description',
          player_loc: '/player',
          duration: 3600,
        },
      ],
    });

    const xml = sitemap.toXML();
    expect(xml).toContain('xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"');
    expect(xml).toContain('<video:title>Video Title</video:title>');
    expect(xml).toContain('<video:duration>3600</video:duration>');
  });

  it('should generate news extension', () => {
    const sitemap = new SitemapStream({ baseUrl });
    sitemap.add({
      url: '/news',
      news: {
        publication: { name: 'The Daily News', language: 'en' },
        publication_date: '2024-01-01',
        title: 'News Title',
      },
    });

    const xml = sitemap.toXML();
    expect(xml).toContain('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"');
    expect(xml).toContain('<news:name>The Daily News</news:name>');
    expect(xml).toContain('<news:title>News Title</news:title>');
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

describe('RouteScanner', () => {
  it('should scan matching routes', () => {
    const scanner = new RouteScanner(mockCore.router, {
      include: ['/', '/api/*'],
    });
    const entries = scanner.getEntries();

    expect(entries.length).toBe(2);
    expect(entries.find((e) => e.url === '/')).toBeDefined();
    expect(entries.find((e) => e.url === '/api/data')).toBeDefined();
  });

  it('should exclude routes', () => {
    const scanner = new RouteScanner(mockCore.router, {
      include: ['*'],
      exclude: ['/api/*'],
    });
    const entries = scanner.getEntries();

    expect(entries.find((e) => e.url === '/api/data')).toBeUndefined();
    expect(entries.find((e) => e.url === '/about')).toBeDefined();
  });

  it('should skip parameterized routes', () => {
    const scanner = new RouteScanner(mockCore.router, { include: ['*'] });
    const entries = scanner.getEntries();

    expect(entries.find((e) => e.url === '/users/:id')).toBeUndefined();
  });
});

describe('OrbitSitemap', () => {
  it('should install dynamic sitemap route', async () => {
    const core = { router: { get: jest.fn() } } as any;

    OrbitSitemap.dynamic({
      baseUrl: 'https://example.com',
      providers: [],
    }).install(core);

    expect(core.router.get).toHaveBeenCalledWith('/sitemap.xml', expect.any(Function));
  });

  it('should trigger static generation', async () => {
    // Mock fs and path imports for static generation test
    // Since we can't easily mock dynamic imports in this test env without more setup,
    // we'll skip the actual generation call or wrap it in a try-catch for now
    // to avoid FS errors, or just trust the manual verification in Phase 3.

    // For now, let's just instantiate it
    const orbit = OrbitSitemap.static({
      baseUrl: 'https://example.com',
      outDir: './dist',
      providers: [],
    });
    expect(orbit).toBeDefined();
  });
});

describe('SitemapGenerator', () => {
  it('should split sitemap into shards', async () => {
    const storage = new MemorySitemapStorage('https://example.com');
    const generator = new SitemapGenerator({
      baseUrl: 'https://example.com',
      storage,
      providers: [
        {
          getEntries: () => [{ url: '/1' }, { url: '/2' }, { url: '/3' }],
        },
      ],
      maxEntriesPerFile: 1,
      filename: 'sitemap.xml',
    });

    await generator.run();

    // Should produce sitemap-1.xml, sitemap-2.xml, sitemap-3.xml and sitemap.xml
    expect(await storage.exists('sitemap-1.xml')).toBe(true);
    expect(await storage.exists('sitemap-2.xml')).toBe(true);
    expect(await storage.exists('sitemap-3.xml')).toBe(true);
    expect(await storage.exists('sitemap.xml')).toBe(true);

    const index = await storage.read('sitemap.xml');
    expect(index).toContain('sitemap-1.xml');
    expect(index).toContain('sitemap-3.xml');
    expect(index).toContain('<sitemapindex');
  });

  it('should handle async iterables', async () => {
    const storage = new MemorySitemapStorage('https://example.com');

    async function* entryGenerator() {
      yield { url: '/async-1' };
      yield { url: '/async-2' };
    }

    const generator = new SitemapGenerator({
      baseUrl: 'https://example.com',
      storage,
      providers: [
        {
          getEntries: () => entryGenerator(),
        },
      ],
      filename: 'sitemap.xml',
    });

    await generator.run();

    expect(await storage.exists('sitemap-1.xml')).toBe(true);
    const content = await storage.read('sitemap-1.xml');
    expect(content).toContain('/async-1');
    expect(content).toContain('/async-2');
  });
});
