---
title: Constellation
---

# Constellation

Dynamic and static sitemap generation for Gravito applications. Constellation can be used standalone or as the sitemap and route-scanning engine for Luminosity.

**Constellation** provides a flexible way to generate XML sitemaps for your Gravito application, supporting both dynamic generation (via routes) and static generation (for build time). It includes support for Google Sitemap extensions like Images, Videos, News, and i18n alternates.

## Features

- **Dynamic Generation**: Serve `sitemap.xml` directly from your application
- **Static Generation**: Generate files for static hosting
- **Auto Scanning**: Automatically scan registered routes
- **Sitemap Extensions**: Support for Images, Videos, News, and i18n
- **Sitemap Index**: Generators for large sites (Phase 1/2)
- **Enterprise Features**:
  - **Cloud Storage**: AWS S3 and Google Cloud Storage support
  - **Shadow Processing**: Atomic switching and versioning for safe deployments
  - **Background Jobs**: Non-blocking generation with progress tracking
  - **Incremental Generation**: Only update changed URLs, not the entire sitemap
  - **301 Redirect Handling**: Comprehensive redirect detection and processing
  - **Progress Tracking**: Real-time progress monitoring via API

## Installation

```bash
bun add @gravito/constellation
```

## Usage

### 1. Dynamic Sitemap (Runtime)

Integrate directly into your Gravito app:

```typescript
// gravito.config.ts or index.ts
import { OrbitSitemap, routeScanner } from '@gravito/constellation'

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
import { OrbitSitemap, routeScanner } from '@gravito/constellation'

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
import { SitemapStream } from '@gravito/constellation'

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

## Enterprise Features

### Cloud Storage (S3 / GCP)

Store sitemaps directly in cloud storage with shadow processing:

```typescript
import { OrbitSitemap, S3SitemapStorage } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  storage: new S3SitemapStorage({
    bucket: 'my-sitemap-bucket',
    region: 'us-east-1',
    shadow: {
      enabled: true,
      mode: 'atomic' // or 'versioned'
    }
  }),
  providers: [...]
})
```

### Shadow Processing

Generate sitemaps safely with atomic switching or versioning:

```typescript
const sitemap = OrbitSitemap.static({
  // ...
  shadow: {
    enabled: true,
    mode: 'atomic' // Atomic switch: generate to temp, then swap
    // or 'versioned' // Versioning: keep old versions, switch when ready
  }
})
```

### Background Generation with Progress Tracking

Generate sitemaps asynchronously without blocking:

```typescript
import { OrbitSitemap, MemoryProgressStorage } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  // ...
  progressStorage: new MemoryProgressStorage()
})

// Trigger background generation
const jobId = await sitemap.generateAsync({
  onProgress: (progress) => {
    console.log(`${progress.percentage}% (${progress.processed}/${progress.total})`)
  },
  onComplete: () => {
    console.log('Generation completed!')
  }
})

// Query progress via API
// GET /admin/sitemap/status/:jobId
```

### Incremental Generation

Only update changed URLs, perfect for large sites:

```typescript
import { OrbitSitemap, MemoryChangeTracker } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  // ...
  incremental: {
    enabled: true,
    changeTracker: new MemoryChangeTracker(),
    autoTrack: true
  }
})

// Full generation (first time)
await sitemap.generate()

// Incremental update (only changed URLs)
await sitemap.generateIncremental(new Date('2024-01-01'))
```

### 301 Redirect Handling

Automatically handle URL redirects in your sitemap:

```typescript
import { OrbitSitemap, MemoryRedirectManager, RedirectDetector } from '@gravito/constellation'

const redirectManager = new MemoryRedirectManager()
const detector = new RedirectDetector({
  baseUrl: 'https://example.com',
  autoDetect: {
    enabled: true,
    timeout: 5000,
    cache: true
  }
})

// Auto-detect redirects
const redirects = await detector.detectBatch(['/old-page', '/another-old'])

// Register redirects
for (const [from, rule] of redirects) {
  if (rule) {
    await redirectManager.register(rule)
  }
}

const sitemap = OrbitSitemap.static({
  // ...
  redirect: {
    enabled: true,
    manager: redirectManager,
    strategy: 'remove_old_add_new', // or 'keep_relation', 'update_url', 'dual_mark'
    followChains: true,
    maxChainLength: 5
  }
})
```

### API Endpoints

Install API endpoints for triggering generation and querying progress:

```typescript
const sitemap = OrbitSitemap.static({ ... })

// Install API endpoints
sitemap.installApiEndpoints(core, '/admin/sitemap')

// Available endpoints:
// POST /admin/sitemap/generate - Trigger generation
// GET /admin/sitemap/status/:jobId - Query progress
// GET /admin/sitemap/history - List generation history
```

### Creating Custom Storage/Lock
Implement `SitemapStorage` and `SitemapLock` interfaces:

```typescript
import { SitemapStorage, SitemapLock } from '@gravito/constellation'

class MyStorage implements SitemapStorage { ... }
class MyLock implements SitemapLock { ... }
```

## Type Reference

See `dist/index.d.ts` for full type definitions including `SitemapEntry`, `SitemapImage`, `SitemapVideo`, etc.

## License

MIT
