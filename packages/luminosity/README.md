# @gravito/luminosity

The intelligent core of the Gravito SmartMap Engine™. Provides incremental sitemap generation, robots.txt management, and dynamic meta tag building. Sitemap generation is powered by Constellation under the hood.

## Features

- **Tri-Mode Architecture**: Dynamic, Cached (Mutex), and Incremental (LSM) modes.
- **RouteScanner**: Automatic route discovery for modern frameworks.
- **Sitemap Generation**: High-performance XML stream builder with **Gzip support**.
- **Robots.txt**: Programmable crawler directives.
- **Meta Tags**: Builder for Meta, OpenGraph, Twitter Cards, and JSON-LD.
- **Framework Agnostic**: Core logic decoupled from HTTP layers.
- **Rich Media**: Support for **Image** and **Video** sitemaps.
- **Cloud Ready**: S3 storage adapter support for serverless environments.

## Installation

```bash
bun add @gravito/luminosity
```

## CLI Tools

Luminosity comes with a powerful CLI for managing your SEO infrastructure.

```bash
# Generate sitemaps manually
lux generate

# Repair corrupted LSM logs
lux repair

# Inspect a URL for SEO meta tags (Preview Google/OG results)
lux inspect https://example.com/blog/my-post
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
  },
  
  // Enable Gzip compression (sitemap.xml.gz)
  gzip: true
};
```

## RouteScanner (Automatic Route Discovery)

Luminosity includes a powerful **RouteScanner** system that automatically discovers routes from various frameworks.

### Supported Frameworks

| Framework | Scanner | Usage |
|-----------|---------|-------|
| **Gravito** | `GravitoScanner` | `new GravitoScanner(core)` |
| **Hono** | `HonoScanner` | `new HonoScanner(app)` |
| **Express** | `ExpressScanner` | `new ExpressScanner(app)` |
| **Fastify** | `FastifyScanner` | `app.addHook('onRoute', scanner.collect)` |
| **Next.js** | `NextScanner` | `new NextScanner({ appDir: './app' })` |
| **Nuxt** | `NuxtScanner` | `new NuxtScanner({ pagesDir: './pages' })` |
| **Remix** | `RemixScanner` | `new RemixScanner({ routesDir: './app/routes' })` |
| **SvelteKit** | `SvelteKitScanner` | `new SvelteKitScanner({ routesDir: './src/routes' })` |
| **Astro** | `AstroScanner` | `new AstroScanner({ pagesDir: './src/pages' })` |

### Usage Example (Remix)

```typescript
import { SitemapBuilder, RemixScanner } from '@gravito/luminosity'

const builder = new SitemapBuilder({
  scanner: new RemixScanner({ routesDir: './app/routes' }),
  hostname: 'https://example.com'
})

const entries = await builder.build()
```

## Rich Media Sitemaps

Luminosity supports Google's Image and Video extensions.

```typescript
const entry: SitemapEntry = {
  url: '/gallery/summer-vacation',
  images: [
    {
      url: 'https://example.com/img/summer.jpg',
      title: 'Summer Fun',
      caption: 'Best vacation ever',
      license: 'https://creativecommons.org/licenses/by/4.0/'
    }
  ],
  videos: [
    {
      thumbnail_loc: 'https://example.com/thumbs/v1.jpg',
      title: 'Surfing Lesson',
      description: 'Learn to surf in 5 minutes',
      player_loc: 'https://example.com/embed/v1',
      duration: 300,
      publication_date: new Date('2023-06-01')
    }
  ]
}
```

## Cloud Storage (S3)

For serverless deployments (like Vercel, AWS Lambda), you can swap the file system storage for S3.

```typescript
import { S3Adapter } from '@gravito/luminosity';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });

const config: SeoConfig = {
  mode: 'incremental',
  incremental: {
    logDir: 'seo-logs', // S3 Key prefix
    storage: new S3Adapter({
      bucket: 'my-seo-bucket',
      client: s3Client,
      commands: {
        PutObjectCommand,
        GetObjectCommand,
        DeleteObjectCommand,
        HeadObjectCommand
      }
    })
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