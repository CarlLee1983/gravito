---
title: Orbit SEO
description: API reference for Gravito's SEO and Sitemap integration.
---

# 🛰️ Orbit SEO

The `@gravito/seo-adapter-hono` (or simply `OrbitSEO`) provides a seamless integration between Gravito's core and the SEO engine.

## Installation

```bash
bun add @gravito/seo-core @gravito/seo-adapter-hono
```

## Basic Usage

The SEO orbit registers a middleware that handles `/sitemap.xml` and `/robots.txt` automatically.

```typescript
import { gravitoSeo } from '@gravito/seo-adapter-hono'
import { seoConfig } from './config/seo'

// In your bootstrap or index
app.use('*', gravitoSeo(seoConfig))
```

## `SeoConfig` Interface

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `'dynamic' \| 'cached' \| 'incremental'` | The SEO strategy to use. |
| `baseUrl` | `string` | The base URL for all absolute links. |
| `resolvers` | `SeoResolver[]` | Dynamic URL generators. |
| `robots` | `RobotsConfig` | Rules for robots.txt. |
| `analytics` | `AnalyticsConfig` | Config for GA, Pixel, etc. |

## Dynamic Resolvers

Resolvers are the most powerful part of Orbit SEO. They allow you to fetch URLs from any source (DB, FS, etc.)

```typescript
const postsResolver = {
  name: 'posts',
  fetch: async () => {
    const posts = await db.posts.findMany()
    return posts.map(p => ({
      url: `/post/${p.slug}`,
      lastmod: p.updatedAt,
      priority: 0.8
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
