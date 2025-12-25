---
title: RouteScanner
description: Cross-framework automatic route discovery for sitemap generation.
---

# RouteScanner (Cross-Framework Support)

Luminosity includes a powerful **RouteScanner** system that automatically discovers routes from various frameworks. This means you can use Luminosity for sitemap generation even if you're not using Gravito!

---

## Supported Frameworks

| Framework | Scanner | Route Discovery Method |
|-----------|---------|------------------------|
| **Gravito** | `GravitoScanner` | `core.router.routes` |
| **Hono** | `HonoScanner` | `app.routes` |
| **Express** | `ExpressScanner` | `app._router.stack` |
| **Next.js** | `NextScanner` | File system (`app/`, `pages/`) |
| **Nuxt** | `NuxtScanner` | File system (`pages/`) |

---

## Installation

```bash
bun add @gravito/luminosity
```

---

## Quick Start

The `SitemapBuilder` class orchestrates route scanning and sitemap entry generation:

```typescript
import { SitemapBuilder, GravitoScanner } from '@gravito/luminosity'

const builder = new SitemapBuilder({
  scanner: new GravitoScanner(core),
  hostname: 'https://example.com'
})

const entries = await builder.build()
```

---

## Usage with Gravito

```typescript
import { PlanetCore } from 'gravito-core'
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

---

## Usage with Hono

```typescript
import { Hono } from 'hono'
import { SitemapBuilder, HonoScanner } from '@gravito/luminosity'

const app = new Hono()
app.get('/hello', (c) => c.text('Hello'))
app.get('/blog/:slug', (c) => c.text('Blog'))
app.get('/products/:category/:id', (c) => c.text('Product'))

const builder = new SitemapBuilder({
  scanner: new HonoScanner(app),
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

const entries = await builder.build()
```

---

## Usage with Express

```typescript
import express from 'express'
import { SitemapBuilder, ExpressScanner } from '@gravito/luminosity'

const app = express()
app.get('/hello', (req, res) => res.send('Hello'))
app.get('/blog/:slug', (req, res) => res.send('Blog'))
app.get('/api/users', (req, res) => res.json([]))

const builder = new SitemapBuilder({
  scanner: new ExpressScanner(app, {
    excludePatterns: ['/api/*']  // Exclude API routes
  }),
  hostname: 'https://example.com'
})

const entries = await builder.build()
```

---

## Usage with Next.js

For Next.js, `NextScanner` scans your file system to discover routes from both App Router and Pages Router.

### App Router (Recommended)

```typescript
// app/sitemap.ts
import { SitemapBuilder, NextScanner } from '@gravito/luminosity'

export default async function sitemap() {
  const builder = new SitemapBuilder({
    scanner: new NextScanner({ 
      appDir: './app',
      excludePatterns: ['/(admin)/*', '/api/*']
    }),
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

### Pages Router

```typescript
// pages/sitemap.xml.ts
import { SitemapBuilder, NextScanner } from '@gravito/luminosity'

export default async function sitemap() {
  const builder = new SitemapBuilder({
    scanner: new NextScanner({ 
      pagesDir: './pages',
      excludePatterns: ['/api/*', '/_app', '/_document']
    }),
    hostname: 'https://example.com'
  })

  return builder.build()
}
```

---

## Usage with Nuxt

```typescript
// server/routes/sitemap.xml.ts
import { SitemapBuilder, NuxtScanner } from '@gravito/luminosity'

export default defineEventHandler(async () => {
  const builder = new SitemapBuilder({
    scanner: new NuxtScanner({ 
      pagesDir: './pages',
      excludePatterns: ['/admin/*']
    }),
    hostname: 'https://example.com',
    dynamicResolvers: [
      {
        pattern: '/blog/:slug',
        resolve: async () => {
          const articles = await queryContent('blog').find()
          return articles.map(a => ({ slug: a._path }))
        }
      }
    ]
  })

  const entries = await builder.build()
  
  // Convert to XML
  const xml = generateSitemapXml(entries)
  
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' }
  })
})
```

---

## Dynamic Route Resolvers

For routes with parameters (e.g., `/blog/:slug`), you must provide a resolver to generate concrete URLs:

```typescript
const builder = new SitemapBuilder({
  scanner: new GravitoScanner(core),
  hostname: 'https://example.com',
  dynamicResolvers: [
    {
      // Pattern to match (supports :param and [param] syntax)
      pattern: '/products/:category/:id',
      
      // Resolve function returns parameter combinations
      resolve: async () => {
        const products = await Product.all()
        return products.map(p => ({
          category: p.category.slug,
          id: p.id
        }))
      },
      
      // Optional: Override default sitemap metadata
      meta: {
        priority: 0.8,
        changefreq: 'weekly'
      }
    }
  ]
})
```

### Multiple Resolvers

You can define multiple resolvers for different route patterns:

```typescript
dynamicResolvers: [
  {
    pattern: '/blog/:slug',
    resolve: async () => (await Post.all()).map(p => ({ slug: p.slug }))
  },
  {
    pattern: '/products/:id',
    resolve: async () => (await Product.all()).map(p => ({ id: p.id })),
    meta: { priority: 0.9 }
  },
  {
    pattern: '/users/:username',
    resolve: async () => (await User.where('public', true).all()).map(u => ({ username: u.username })),
    meta: { priority: 0.5, changefreq: 'monthly' }
  }
]
```

---

## SitemapBuilder Options

```typescript
interface SitemapBuilderOptions {
  // Required: The scanner to use
  scanner: RouteScanner
  
  // Required: Your site's base URL
  hostname: string
  
  // Optional: Resolvers for dynamic routes
  dynamicResolvers?: DynamicRouteResolver[]
  
  // Optional: Patterns to exclude (string glob or RegExp)
  excludePatterns?: (string | RegExp)[]
  
  // Optional: Only include routes matching these patterns
  includePatterns?: (string | RegExp)[]
  
  // Optional: Default sitemap metadata
  defaultPriority?: number      // Default: 0.5
  defaultChangefreq?: ChangeFreq // Default: undefined
}
```

---

## Creating Custom Scanners

You can create scanners for any framework by implementing the `RouteScanner` interface:

```typescript
import type { RouteScanner, ScannedRoute } from '@gravito/luminosity'

class FastifyScanner implements RouteScanner {
  readonly framework = 'fastify'

  constructor(private app: FastifyInstance) {}

  async scan(): Promise<ScannedRoute[]> {
    const routes: ScannedRoute[] = []
    
    // Access Fastify's internal route store
    this.app.routes.forEach(route => {
      routes.push({
        path: route.path,
        method: route.method as ScannedRoute['method'],
        isDynamic: route.path.includes(':'),
        params: this.extractParams(route.path)
      })
    })
    
    return routes
  }
  
  private extractParams(path: string): string[] {
    const matches = path.match(/:([^/]+)/g) || []
    return matches.map(m => m.slice(1))
  }
}
```

### ScannedRoute Interface

```typescript
interface ScannedRoute {
  // The route path (e.g., '/blog/:slug')
  path: string
  
  // HTTP method
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL'
  
  // Whether the route has dynamic segments
  isDynamic: boolean
  
  // Parameter names (e.g., ['slug'])
  params?: string[]
  
  // Optional metadata
  meta?: {
    priority?: number
    changefreq?: ChangeFreq
    exclude?: boolean  // Skip this route in sitemap
  }
}
```

---

## Why RouteScanner?

### vs. Manual URL Definition

| Approach | Pros | Cons |
|----------|------|------|
| **Manual** | Full control | Tedious, error-prone, out of sync |
| **RouteScanner** | Auto-sync, zero maintenance | Requires resolver for dynamic routes |

### vs. next-sitemap / nuxt-sitemap

| Feature | next-sitemap | nuxt-sitemap | Luminosity |
|---------|-------------|--------------|------------|
| Auto static routes | ✅ | ✅ | ✅ |
| Dynamic route API | Custom | Built-in | **Unified** |
| Cross-framework | ❌ | ❌ | ✅ |
| Incremental updates | ❌ | ❌ | ✅ |
| Enterprise scale | ❌ | ❌ | ✅ |

---

## Next Steps

- [Luminosity SEO Engine](/en/docs/guide/seo-engine) - Meta tags and analytics
- [Sitemap Basics](/en/docs/guide/sitemap-guide) - Quick start and configuration
- [Advanced Sitemap](/en/docs/guide/sitemap-advanced) - Cloud storage, incremental builds
