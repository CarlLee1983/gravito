# Galaxy SEO & Sitemaps Guide

In a **Galaxy Architecture**, a website is often composed of many independent Satellites. `@gravito/constellation` ensures that search engines can find all of them through a unified "Star Chart".

## 1. Multi-Satellite URL Scanning

Each Satellite that provides public URLs should expose a `SitemapProvider`.

```typescript
// satellites/blog/src/BlogSatellite.ts
async boot(core) {
  const constellation = core.container.resolve('constellation');
  
  constellation.addProvider({
    async getEntries() {
      const posts = await Post.all();
      return posts.map(p => ({ url: `/blog/${p.slug}`, lastmod: p.updatedAt }));
    }
  });
}
```

## 2. Dynamic vs Static Mode

- **Dynamic**: Best for content that changes in real-time. The sitemap is generated on-demand and cached.
- **Static**: Recommended for sites with 50,000+ URLs. The sitemap is pre-generated during the build phase and uploaded to `Nebula` storage.

## 3. Sharding for Large Galaxies

Google limits sitemaps to 50,000 URLs or 50MB. Constellation automatically shards your URLs into multiple files and creates a sitemap index.

```typescript
const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  sharding: { enabled: true, limit: 10000 } // Custom limit
});
```

## 4. Shadow Deployment (Zero Downtime)

To prevent crawlers from seeing partial sitemaps during generation, use the **Shadow Mode**.

1.  URLs are written to a temporary "Shadow" directory.
2.  Once all shards are complete, the temporary directory is atomically swapped with the public directory.

## 5. i18n Support (hreflang)

Integrate with `@gravito/cosmos` to automatically include alternate language links in your sitemap.

```json
{
  "url": "/en/home",
  "links": [
    { "lang": "zh-TW", "url": "/zh-TW/home" }
  ]
}
```
