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

## `SeoConfig` Interface

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `'dynamic' \| 'cached' \| 'incremental'` | The SEO strategy to use. |
| `baseUrl` | `string` | The base URL for all absolute links. |
| `resolvers` | `SeoResolver[]` | Dynamic URL generators. |
| `robots` | `RobotsConfig` | Rules for robots.txt. |
| `analytics` | `AnalyticsConfig` | Config for GA, Pixel, etc. |

## Dynamic Resolvers

Resolvers are the most powerful part of Luminosity. They allow you to fetch URLs from any source (DB, FS, etc.)

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
