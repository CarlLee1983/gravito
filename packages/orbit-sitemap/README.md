---
title: Orbit Sitemap
---

# Orbit Sitemap

Dynamic and static sitemap generation for Gravito applications.

**Orbit Sitemap** provides a flexible way to generate XML sitemaps for your Gravito application, supporting both dynamic generation (via routes) and static generation (for build time). It includes support for Google Sitemap extensions like Images, Videos, News, and i18n alternates.

## Features

- **Dynamic Generation**: Serve `sitemap.xml` directly from your application
- **Static Generation**: Generate files for static hosting
- **Auto Scanning**: Automatically scan registered routes
- **Sitemap Extensions**: Support for Images, Videos, News, and i18n
- **Sitemap Index**: Generators for large sites (Phase 1/2)

## Installation

```bash
bun add @gravito/orbit-sitemap
```

## Usage

### 1. Dynamic Sitemap (Runtime)

Integrate directly into your Gravito app:

```typescript
// gravito.config.ts or index.ts
import { OrbitSitemap, routeScanner } from '@gravito/orbit-sitemap'

OrbitSitemap.dynamic({
  baseUrl: 'https://example.com',
  providers: [
    // Automatically scan routes
    routeScanner(core.router, {
      exclude: ['/api/*', '/admin/*'],
      defaultChangefreq: 'daily'
    }),
    
    // Custom provider (e.g. from database)
    {
      async getEntries() {
        const posts = await db.query('SELECT slug, updated_at FROM posts')
        return posts.map(post => ({
          url: `/blog/${post.slug}`,
          lastmod: post.updated_at
        }))
      }
    }
  ],
  cacheSeconds: 3600 // Cache for 1 hour
}).install(core)
```

### 2. Static Generation (Build Time)

Generate files during build:

```typescript
import { OrbitSitemap, routeScanner } from '@gravito/orbit-sitemap'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  outDir: './dist',
  providers: [
    routeScanner(core.router),
    // ...
  ]
})

await sitemap.generate()
```

### 3. Manual Usage (SitemapStream)

Use the low-level API for custom needs:

```typescript
import { SitemapStream } from '@gravito/orbit-sitemap'

const sitemap = new SitemapStream({ baseUrl: 'https://example.com' })

sitemap.add('/')
sitemap.add({
  url: '/about',
  changefreq: 'monthly',
  priority: 0.8,
  alternates: [
    { lang: 'en', url: '/about' },
    { lang: 'zh-TW', url: '/zh/about' }
  ],
  images: [
    { loc: '/img/team.jpg', title: 'Our Team' }
  ]
})

console.log(sitemap.toXML())
```

## Extensions

### Video Sitemap
```typescript
sitemap.add({
  url: '/video-page',
  videos: [{
    thumbnail_loc: 'https://...',
    title: 'Video Title',
    description: 'Description',
    player_loc: 'https://...',
    duration: 600
  }]
})
```

### News Sitemap
```typescript
sitemap.add({
  url: '/news/article',
  news: {
    publication: { name: 'The Daily', language: 'en' },
    publication_date: '2024-01-01',
    title: 'Article Title'
  }
})
```

## Scaling & Distributed (Advanced)

### Large Scale Sharding
Orbit Sitemap automatically handles large datasets by splitting them into multiple files (default 50,000 URLs per file).

```typescript
OrbitSitemap.dynamic({
  // ...
  maxEntriesPerFile: 10000, // Custom split limit
  storage: new RedisSitemapStorage({ ... }) // Store generated files in Redis/S3
})
```

### Async Iterators (Streaming)
For large datasets, use Async Generators in your providers to stream URLs without loading them all into memory.

```typescript
{
  async *getEntries() {
    for await (const row of db.cursor('SELECT * FROM massive_table')) {
      yield { url: `/item/${row.id}` }
    }
  }
}
```

### Distributed Locking
In a distributed environment (e.g. Kubernetes), use `lock` to prevent concurrent sitemap generation.

```typescript
OrbitSitemap.dynamic({
  // ...
  lock: new RedisSitemapLock(redisClient),
  storage: new S3SitemapStorage(bucket)
})
```

### Creating Custom Storage/Lock
Implement `SitemapStorage` and `SitemapLock` interfaces:

```typescript
import { SitemapStorage, SitemapLock } from '@gravito/orbit-sitemap'

class MyStorage implements SitemapStorage { ... }
class MyLock implements SitemapLock { ... }
```

## Type Reference

See `dist/index.d.ts` for full type definitions including `SitemapEntry`, `SitemapImage`, `SitemapVideo`, etc.

## License

MIT
