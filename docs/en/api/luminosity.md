---
title: Luminosity
description: API reference for Gravito's SEO and Sitemap integration.
---

# Luminosity

The `@gravito/luminosity-adapter-photon` (or simply `OrbitLuminosity`) provides a seamless integration between Gravito's core and the SEO engine.

## Installation

```bash
bun add @gravito/luminosity @gravito/luminosity-adapter-photon
```

## Basic Usage

The Luminosity module registers a middleware that handles `/sitemap.xml` and `/robots.txt` automatically.

```typescript
import { gravitoSeo } from '@gravito/luminosity-adapter-photon'
import { seoConfig } from './config/seo'

// In your bootstrap or index
app.use('*', gravitoSeo(seoConfig))
```

## CLI Tools

```bash
lux generate # Generate static sitemap files
lux inspect <url> # Preview meta tags like Google/Facebook
lux repair # Fix corrupted LSM logs
```

## `SeoConfig` Interface

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `'dynamic' \| 'cached' \| 'incremental'` | The SEO strategy to use. |
| `baseUrl` | `string` | The base URL for all absolute links. |
| `resolvers` | `SeoResolver[]` | Dynamic URL generators. |
| `robots` | `RobotsConfig` | Rules for robots.txt. |
| `analytics` | `AnalyticsConfig` | Config for GA, Pixel, etc. |
| `gzip` | `boolean` | Enable Gzip compression (.xml.gz). |

## Dynamic Resolvers & Rich Media

Resolvers are the most powerful part of Luminosity. They allow you to fetch URLs from any source (DB, FS, etc.) and now support **Images** and **Videos**.

```typescript
const postsResolver = {
  name: 'posts',
  fetch: async () => {
    const posts = await db.posts.findMany()
    return posts.map(p => ({
      url: `/post/${p.slug}`,
      lastmod: p.updatedAt,
      priority: 0.8,
      images: p.images.map(img => ({
        url: img.url,
        title: img.title
      })),
      videos: p.video ? [{
        thumbnail_loc: p.video.thumb,
        title: p.video.title,
        description: p.video.desc
      }] : undefined
    }))
  }
}
```

## Analytics Builder

The engine generates professional, non-blocking script tags for:
- **Google Analytics** (`gtag`)
- **Meta Pixel** (`pixel`)
- **Baidu Tongji** (`baidu`)

These are injected via the `SeoMetadata` utility used in your controllers.

## RouteScanner (Cross-Framework Support)

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

### Usage with Remix

```typescript
import { SitemapBuilder, RemixScanner } from '@gravito/luminosity'

const builder = new SitemapBuilder({
  scanner: new RemixScanner({ routesDir: './app/routes' }),
  hostname: 'https://example.com'
})

const entries = await builder.build()
```

## Cloud Storage (S3)

For serverless deployments (like Vercel, AWS Lambda), you can swap the file system storage for S3.

```typescript
import { S3Adapter } from '@gravito/luminosity';
import { S3Client } from '@aws-sdk/client-s3';

// ... in your incremental config:
storage: new S3Adapter({
  bucket: 'my-seo-bucket',
  client: new S3Client({...}),
  commands: { ... } // Pass AWS SDK commands
})
```