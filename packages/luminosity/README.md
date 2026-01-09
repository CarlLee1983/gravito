# @gravito/luminosity

The intelligent core of the Gravito SmartMap Engine™. Provides incremental sitemap generation, robots.txt management, and dynamic meta tag building. Sitemap generation is powered by Constellation under the hood.

## Features

- **Tri-Mode Architecture**: Dynamic, Cached (Mutex), and Incremental (LSM) modes.
- **RouteScanner**: Automatic route discovery for Gravito, Hono, Express, Next.js, and Nuxt.
- **Sitemap Generation**: High-performance XML stream builder.
- **Robots.txt**: Programmable crawler directives.
- **Meta Tags**: Builder for Meta, OpenGraph, Twitter Cards, and JSON-LD.
- **Framework Agnostic**: Core logic decoupled from HTTP layers.

## Installation

```bash
bun add @gravito/luminosity
```

## Configuration

The engine is controlled via a `SeoConfig` object, typically defined in `gravito.seo.config.ts`.

### Basic Config
```typescript
import type { SeoConfig } from '@gravito/luminosity';

const config: SeoConfig = {
  mode: 'incremental', // 'dynamic' | 'cached' | 'incremental'
  baseUrl: 'https://example.com',
  resolvers: [ /* ... */ ],
  
  // Required for 'incremental' mode
  incremental: {
    logDir: './storage/seo', // Directory to store LSM logs and snapshots
    compactInterval: 3600000 // Autosave/Compact every 1 hour (in ms)
  }
};
```

## Advanced Strategies

### Incremental Mode (LSM-Tree Engine)
Designed for large-scale sites (1M+ pages), this mode uses a **Log-Structured Merge-Tree** approach similar to databases like Cassandra or LevelDB.

1. **Write-Optimized**: New URLs are appended to a sequential log file (`sitemap.ops.jsonl`). fast writing with zero lock contention.
2. **Read-Optimized**: Serving the sitemap merges the memory snapshot with the latest ops log.
3. **Background Compaction**: The engine automatically merges logs into the main snapshot (`sitemap.snapshot.json`) in the background based on `compactInterval`.

### Sitemap Indexing & Pagination
Gravito automatically handles the Google/Sitemap protocol limit of **50,000 URLs**.
- If your sitemap exceeds 50k URLs, the engine automatically renders a **Sitemap Index** (`<sitemapindex>`).
- It paginates the actual entries into sub-sitemaps (e.g., `sitemap.xml?page=1`, `sitemap.xml?page=2`).
- This happens transparently—no extra configuration needed.

### Robots.txt Configuration
You can define `robots.txt` rules directly in your config:

```typescript
const config: SeoConfig = {
  // ...
  robots: {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/admin', '/private']
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/']
      }
    ],
    // Optional: Defaults to sitemap.xml
    sitemapUrls: ['https://example.com/sitemap.xml'],
    host: 'example.com'
  }
};
```

When using `gravito-seo` middleware (in Photon/Express), requests to `/robots.txt` will automatically serve this generated content.

## usage

### 1. Sitemap Engine
Typically used via `@gravito/luminosity-adapter-photon` or `@gravito/luminosity-adapter-express`.

### 2. Meta Tags (SeoMetadata)
Use `SeoMetadata` in your controllers or views to generate HTML head tags dynamically.

```typescript
import { SeoMetadata } from '@gravito/luminosity';

// In your controller/route
const post = { title: "Hello World", summary: "..." };

const seo = new SeoMetadata({
  meta: {
    title: post.title,
    description: post.summary,
    canonical: 'https://example.com/post/hello-world',
    keywords: ['gravito', 'seo']
  },
  og: {
    title: post.title, // Fallback to meta.title if omitted
    type: 'article',
    image: 'https://example.com/cover.jpg'
  },
  twitter: {
    card: 'summary_large_image'
  },
  jsonLd: {
    type: 'Article',
    data: {
      headline: post.title,
      author: {
        '@type': 'Person',
        name: 'Carl Lee'
      }
    }
  }
});

// Inject into template
const headHtml = seo.toString();
```

**Output:**
```html
<title>Hello World</title>
<meta name="description" content="...">
<link rel="canonical" href="...">
<meta property="og:title" content="Hello World">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"...","@type":"Article",...}</script>
```

### 3. RobotsBuilder (Direct Usage)
If you need to generate robots.txt manually:

```typescript
import { RobotsBuilder } from '@gravito/luminosity';

const builder = new RobotsBuilder({
  rules: [{ userAgent: '*', disallow: ['/'] }]
}, 'https://example.com');

console.log(builder.build());
```

## RouteScanner (Automatic Route Discovery)

Luminosity now includes a powerful **RouteScanner** system that automatically discovers routes from various frameworks and generates sitemap entries.

### Supported Frameworks

| Framework | Scanner | Route Discovery Method |
|-----------|---------|----------------------|
| **Gravito** | `GravitoScanner` | `core.router.routes` |
| **Hono** | `HonoScanner` | `app.routes` |
| **Express** | `ExpressScanner` | `app._router.stack` |
| **Next.js** | `NextScanner` | File system (`app/`, `pages/`) |
| **Nuxt** | `NuxtScanner` | File system (`pages/`) |

### Usage with Gravito

```typescript
import { PlanetCore } from '@gravito/core'
import { SitemapBuilder, GravitoScanner } from '@gravito/luminosity'

const core = await PlanetCore.boot({ ... })

const builder = new SitemapBuilder({
  scanner: new GravitoScanner(core),
  hostname: 'https://example.com',
  dynamicResolvers: [
    {
      pattern: '/blog/:slug',
      resolve: async () => {
        const posts = await Post.all()
        return posts.map(p => ({ slug: p.slug }))
      }
    }
  ]
})

const entries = await builder.build()
```

### Usage with Hono

```typescript
import { Hono } from 'hono'
import { SitemapBuilder, HonoScanner } from '@gravito/luminosity'

const app = new Hono()
app.get('/hello', (c) => c.text('Hello'))
app.get('/blog/:slug', (c) => c.text('Blog'))

const builder = new SitemapBuilder({
  scanner: new HonoScanner(app),
  hostname: 'https://example.com'
})

const entries = await builder.build()
```

### Usage with Next.js

```typescript
// app/sitemap.ts
import { SitemapBuilder, NextScanner } from '@gravito/luminosity'

export default async function sitemap() {
  const builder = new SitemapBuilder({
    scanner: new NextScanner({ appDir: './app' }),
    hostname: 'https://example.com',
    dynamicResolvers: [
      {
        pattern: '/blog/:slug',
        resolve: async () => {
          const posts = await getPosts()
          return posts.map(p => ({ slug: p.slug }))
        }
      }
    ]
  })

  return builder.build()
}
```

### Usage with Nuxt

```typescript
// server/routes/sitemap.xml.ts
import { SitemapBuilder, NuxtScanner } from '@gravito/luminosity'

export default defineEventHandler(async () => {
  const builder = new SitemapBuilder({
    scanner: new NuxtScanner({ pagesDir: './pages' }),
    hostname: 'https://example.com'
  })

  const entries = await builder.build()
  // Convert to XML...
})
```

### Dynamic Route Resolvers

For routes with parameters (e.g., `/blog/:slug`), you must provide a resolver:

```typescript
const builder = new SitemapBuilder({
  scanner: new GravitoScanner(core),
  hostname: 'https://example.com',
  dynamicResolvers: [
    {
      pattern: '/products/:category/:id',
      resolve: async () => {
        const products = await Product.all()
        return products.map(p => ({
          category: p.category.slug,
          id: p.id
        }))
      },
      meta: {
        priority: 0.8,
        changefreq: 'weekly'
      }
    }
  ]
})
```
