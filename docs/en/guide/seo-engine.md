---
title: Luminosity SEO Engine
description: The advanced SEO engine for Gravito, featuring sitemap generation and meta tag management.
---

# Luminosity SEO Engine

Traditional Single-Page Applications (SPAs) are often "invisible" to search engines because they rely heavily on client-side rendering. Gravito provides two complementary systems to solve this:

1.  **Luminosity Engine** (this page): Manages the "Front Door" of your pages, handling Meta tags, OpenGraph, and JSON-LD.
2.  **Sitemap System**: Manages the "Map" of your galaxy, declaring all available URLs to crawlers. See the [Sitemap System Guide](./sitemap-guide).

---

## The Three Illumination Modes

The Luminosity SEO engine can be configured in three "illumination" modes depending on your scale and traffic, ensuring search engines can clearly "see" your content.

| Mode | Use Case | How it Works |
|------|----------|--------------|
| **`dynamic`** | Small/Medium sites | **Instant Mode**: Generates Sitemap on every request. Data is always 100% fresh. |
| **`cached`** | High-traffic sites | **Steady Mode**: Keeps Sitemap in memory for blazing fast access. |
| **`incremental`**| Millions of URLs | **Stellar Mode**: Built for massive datasets with zero memory pressure and background compaction. |

---

## Step-by-Step Integration

### 1. Define Your Configuration
The core of the Luminosity SEO engine is organized into `resolvers`. We support three "babysitter-level" ways to find your URLs:

#### A. Static URLs (Simple list)
Best for fixed pages like Home, Contact, or Pricing.

#### B. Dynamic URLs (From Database/API)
Best for blog posts, products, or user profiles.

#### C. Automatic Discovery (Route Scanning)
Gravito can automatically scan your router for all static `GET` routes. This is the ultimate "set and forget" feature.

```typescript
// src/config/seo.ts
import { routeScanner } from '@gravito/constellation' 
import { router } from '../routes'

export const seoConfig: SeoConfig = {
  mode: 'dynamic',
  baseUrl: 'https://your-app.com',
  resolvers: [
    // 1. Automatic Discovery - Scans all your defined routes
    {
      name: 'router-scanner',
      fetch: () => routeScanner(router, { 
        exclude: ['/api/*', '/admin/*', '/dashboard/*'] 
      }).getEntries()
    },
    // 2. Dynamic Data - Fetch content from your database
    {
      name: 'blog-posts',
      fetch: async () => {
        const posts = await db.posts.all()
        return posts.map(p => ({ 
          url: `/blog/${p.slug}`, 
          lastmod: p.updatedAt,
          changefreq: 'weekly',
          priority: 0.8
        }))
      }
    },
    // 3. Static List - Manually defined important URLs
    {
      name: 'promotions',
      fetch: () => [
        { url: '/black-friday', priority: 1.0 },
        { url: '/summer-sale', priority: 0.9 }
      ]
    }
  ],
  analytics: {
    gtag: 'G-XXXXXXXXXX',
  }
}
```

### 2. Connect the Gravito (Middleware)
Register the SEO middleware at your application entry point. It will automatically handle `/sitemap.xml` and `/robots.txt`.

```typescript
// src/index.ts
import { gravitoSeo } from '@gravito/luminosity-adapter-photon'
import { seoConfig } from './config/seo'

app.use('*', gravitoSeo(seoConfig))
```

### Node.js Runtime Demo (Express)
If you want to validate Luminosity on a pure Node runtime, use the Express adapter example:

- `examples/luminosity-node`

Note: Some features are only supported when running on Gravito core.

---

## RouteScanner (Cross-Framework Support)

Luminosity includes a powerful **RouteScanner** system that automatically discovers routes from various frameworks. This means you can use Luminosity even if you're not using Gravito!

### Supported Frameworks

| Framework | Scanner | Route Discovery |
|-----------|---------|-----------------|
| **Gravito** | `GravitoScanner` | `core.router.routes` |
| **Hono** | `HonoScanner` | `app.routes` |
| **Express** | `ExpressScanner` | `app._router.stack` |
| **Next.js** | `NextScanner` | File system (`app/`, `pages/`) |
| **Nuxt** | `NuxtScanner` | File system (`pages/`) |

### Usage with Hono

```typescript
import { Hono } from 'hono'
import { SitemapBuilder, HonoScanner } from '@gravito/luminosity'

const app = new Hono()
app.get('/hello', (c) => c.text('Hello'))
app.get('/blog/:slug', (c) => c.text('Blog'))

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

### Usage with Express

```typescript
import express from 'express'
import { SitemapBuilder, ExpressScanner } from '@gravito/luminosity'

const app = express()
app.get('/hello', (req, res) => res.send('Hello'))
app.get('/blog/:slug', (req, res) => res.send('Blog'))

const builder = new SitemapBuilder({
  scanner: new ExpressScanner(app),
  hostname: 'https://example.com'
})

const entries = await builder.build()
```

### Usage with Next.js

For Next.js App Router, create a `sitemap.ts` file:

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
  // Convert to XML and return
})
```

### Creating Custom Scanners

You can create scanners for any framework by implementing the `RouteScanner` interface:

```typescript
import type { RouteScanner, ScannedRoute } from '@gravito/luminosity'

class MyFrameworkScanner implements RouteScanner {
  readonly framework = 'my-framework'

  async scan(): Promise<ScannedRoute[]> {
    // Your route discovery logic here
    return [
      { path: '/', method: 'GET', isDynamic: false },
      { path: '/blog/:slug', method: 'GET', isDynamic: true, params: ['slug'] }
    ]
  }
}

### 3. Dynamic Meta Tags in Controllers
Inject dynamic meta tags for social media sharing directly from your controllers.

```typescript
// src/controllers/PostController.ts
import { SeoMetadata } from '@gravito/luminosity'

export class PostController {
  show(c: GravitoContext) {
    const post = // ... fetch your data
    
    const seo = new SeoMetadata({
      meta: { title: post.title, description: post.summary },
      og: { title: post.title, type: 'article', image: post.coverImage }
    })

    return c.get('inertia').render('Post', { 
      post, 
      seoHtml: seo.toString() // Pass to your frontend layout
    })
  }
}
```

---

## 10M+ URLs: Stellar Scale Architecture

Handling tens of millions of URLs requires more than just a sitemap generator—it requires a **"Sitemap Lifecycle Management System"**. Luminosity provides an architecture that ensures stellar performance from day one to year ten.

### Phase 1: Initial Cold Start (0 to 1)
During the first run, Luminosity uses **Streaming Processing** to prevent memory overflow. Instead of loading 10M records at once, it flows data from your database directly into disk-based logs.
- **Batching**: Uses `batchSize` to cycle through your data in chunks.
- **Disk Persistence**: Data is committed to disk immediately after each batch, allowing for recovery if the process is interrupted.

### Phase 2: Log Persistence (Day 1+)
Once the initial footprint is established, Luminosity shifts to **Incremental Mode**.
- **Append-only Updates (LSM-log)**: New pages or changes are treated as "append-only" entries in a transaction log.
- **Skip Full Scans**: You no longer need to re-scan the entire 10M record database just to add a single new URL.

### Phase 3: Background Compaction (Day-2 Performance)
`incremental.compactInterval` controls the frequency of the background maintenance task (e.g., every 24h). During this process, the system performs the following **Atomic Operations**:

1.  **Merge & Dedupe**: Combines the tens of thousands of changes in `.jsonl` logs with the main snapshot. If a URL changes multiple times (e.g., `add` -> `update` -> `remove`), only the final state is preserved.
2.  **Log Rotation**: Clears old log files to prevent infinite disk usage once data is safely persisted.
3.  **Physical Emission**: Recalculates the pagination layout for all URLs and generates static `sitemap-index.xml` and `sitemap-N.xml` (Gzip) files. This allows your Web Server (Nginx/CDN) to serve static files directly with **Zero CPU Usage**.
4.  **Shadow Write & Atomic Swap**: To prevent read-concurrency issues, files are first written to a `.shadow` directory. Once verification passes, the system performs an OS-level **Atomic Rename**, instantly replacing the old files. Users will **never** encounter partially written or corrupted sitemaps.

### Massive Scale Example

```typescript
// src/config/seo.ts
export const seoConfig: SeoConfig = {
  mode: 'incremental', // Enable Stellar scale mode
  baseUrl: 'https://global-shop.com',
  resolvers: [
    {
      name: 'products-massive',
      fetch: async () => {
        const pageSize = 10000
        let page = 0
        const entries = []
        
        while (true) {
          // Stream from your database using pagination to avoid memory overflow
          // Even with millions of records, this keeps the server stable.
          const products = await db.products.findMany({
            take: pageSize,
            skip: page * pageSize,
            select: { slug: true, updatedAt: true }
          })
          
          if (products.length === 0) break
          
          entries.push(...products.map(p => ({
            url: `/products/${p.slug}`,
            lastmod: p.updatedAt,
            changefreq: 'weekly',
            priority: 0.7
          })))
          
          page++
        }
        return entries
      }
    }
  ],
  incremental: {
    compactInterval: '24h', // Perform background compaction every 24h
    maxEntriesPerFile: 50000 // Threshold for auto-pagination
  }
}
```

---

## Storage & Hydration Details

Understanding the underlying behavior of the Stellar architecture provides peace of mind when handling massive datasets:

### 1. Where are the files stored?
All Sitemap "states" are stored in your configured `logDir` (we recommend `.gravito/seo`).
- **`sitemap.snapshot.json`**: This is your "source of truth"—the main snapshot database.
- **`sitemap.ops.jsonl`**: The "append-only log" that records all changes since the last compaction.
- **XML Files**: Automatically generated in your public directory based on the snapshot.

### 2. Do I need to wait during the first deployment?
**A one-time "Hydration" process is required**, but it is fully automated:
- When you boot the app for the first time and no snapshot exists, Luminosity calls your `fetch` resolvers.
- **Streaming Write**: This is the "Cold Start" phase. It streams data from your source into disk-based logs.
- **Instant Boot Thereafter**: Once the snapshot is created, subsequent server restarts load the state in **milliseconds**, with no need to re-scan the database.

### 3. How do I trigger updates?
You don't need to manually delete files. Simply call `seo.add()` or `seo.remove()`. Changes are immediately written to the `.jsonl` log and merged into the main snapshot during the next background **Compaction**.

---

## ☁ Cloud & Container Native

If you are deploying with Docker/Kubernetes and utilizing **Auto-scaling**, the ephemeral nature of container storage requires a strategic approach:

### 1. Shared Persistent Volumes (Recommended)
Point `logDir` to a shared network file system like AWS EFS, Google Cloud Filestore, or a Kubernetes Persistent Volume (PV).
- **Pros**: All instances share the same snapshot and logs, ensuring perfect consistency.
- **Config Example (Docker Compose)**:
  ```yaml
  services:
    app:
      image: my-app:latest
      volumes:
        - efs-data:/app/.gravito/seo
  volumes:
    efs-data:
      driver: local # Use cloud driver in production
  ```

### 2. Build-time Generation (SSG / Freeze)
If your data doesn't change every minute, use `@gravito/freeze` during your CI/CD pipeline.
- **Workflow**: Run `luminosity build` during Docker construction and bake the XML files directly into the image.
- **Pros**: Fully stateless, ultra-scalable, and no need for external storage mounting.

### 3. Leader Compaction
In massive clusters, we recommend designating **one specific instance** as the "Leader" with write access to handle log compaction, while "Follower" instances stay in read-only mode for serving snapshots.

### 4. Object Storage Mounting (S3/MinIO)
Theoretically, Luminosity supports mounting S3/GCS buckets as local directories via **FUSE** or **CSI Drivers** (e.g., s3fs).
- **Use Case**: Extreme cost optimization or infinite storage retention.
- **Note**: Since S3 is not designed for low-latency random writes, we recommend increasing your write buffer (Batch Size) to minimize I/O overhead.

---

## Fault Tolerance

Luminosity uses a **Parallel Isolation** strategy when executing resolvers:

1.  **Independent Execution**: Each resolver runs as an independent Promise.
2.  **Failure Isolation**: If one resolver (e.g., `products`) fails due to a DB timeout, **it does not block or crash other resolvers**.
3.  **Graceful Degradation**: The failed resolver logs an error to the console and returns an empty array temporarily. This ensures `sitemap.xml` is still generated and your SEO service remains online.

```typescript
// Even if 'news-api' fails, 'static-pages' will still be generated
resolvers: [
  { name: 'static-pages', fetch: () => [...] },
  { 
    name: 'news-api', 
    fetch: async () => {
      // Suppose this throws an Error...
      throw new Error('API Timeout') 
    }
  }
]
```

---

## Advanced Features: Images, i18n & Robots

Luminosity supports the full SEO protocol stack, not just basic URLs:

### 1. Image Sitemaps
For e-commerce or media platforms, image ranking is crucial. You can attach image metadata directly to your `SitemapEntry`:

```typescript
{
  url: '/products/galaxy-s24',
  images: [
    {
      url: 'https://cdn.example.com/s24-titanium.jpg',
      title: 'Galaxy S24 Titanium',
      caption: 'The new Titanium Gray',
      license: 'https://creativecommons.org/licenses/by/4.0/'
    }
  ]
}
```

### 2. Internationalization (i18n / hreflang)
For global sites, Luminosity supports Google's `hreflang` standard to prevent duplicate content issues across different languages:

```typescript
{
  url: '/en/about',
  alternates: [
    { lang: 'zh-TW', url: '/zh-tw/about' },
    { lang: 'ja-JP', url: '/ja/about' }
  ]
}
```

### 3. Robots.txt & Branding
Manage your `robots.txt` rules directly in the config, and even customize the XML footer watermark (Enterprise users can disable it):

```typescript
const config: SeoConfig = {
  // ...
  robots: {
    // Automatically generates and appends Sitemap Link
    rules: [
      { userAgent: '*', allow: ['/'], disallow: ['/admin', '/private'] },
      { userAgent: 'GPTBot', disallow: ['/'] } // Block AI crawlers
    ]
  },
  branding: {
    enabled: true, // Set false to hide "Generated by Luminosity"
    watermark: 'Managed by MyCorp SEO Team'
  }
}
```

---

## Unified Meta Management

Beyond Sitemaps, Luminosity provides a powerful `SeoMetadata` utility specifically designed to solve the "Blank Link Preview" issue common in SPAs.

### Why Server-Side Meta?
While Inertia's `<Head>` component handles client-side navigation updates, crawlers for Facebook, Twitter (X), and Line often do not execute JavaScript. Therefore, **OpenGraph and Twitter Cards must be injected directly into the initial HTML response**.

### Implementation Example

#### 1. Controller Setup
Create Metadata in your controller and pass it to the View:

```typescript
import { SeoMetadata } from '@gravito/luminosity'

export class ProductController {
  async show({ inertia, params }: HttpContext) {
    const product = await Product.find(params.id)
    
    // Define Meta Tags
    const seo = new SeoMetadata({
      meta: {
        title: product.name,
        description: product.summary,
        canonical: `https://example.com/products/${product.slug}`
      },
      og: {
        type: 'product',
        title: product.name,
        image: product.coverImage,
        url: `https://example.com/products/${product.slug}`
      },
      twitter: {
        card: 'summary_large_image'
      }
    })

    // Pass generated HTML string to Root Template (3rd argument)
    return inertia.render('Product/Show', { product }, {
      metaTags: seo.toString()
    })
  }
}
```

#### 2. Root Template Slot
Ensure your root template (e.g., `resources/views/app.edge`) has a slot in the `<head>`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Server-Side Meta Injection -->
  {{ metaTags || '' }}
  
  @vite(['src/main.tsx'])
</head>
<body>
  <div id="app" data-page="{ { page } }"></div>
</body>
</html>
```

---

## Command Line Interface (CLI)

Beyond running as an API middleware, Luminosity is also a robust CLI tool, perfect for CI/CD pipelines or manual maintenance.

### Installation

```bash
npm install -g @gravito/luminosity-cli
# Or run directly via npx
npx luminosity --help
```

### 1. Manual Generation (Build-time)
If you prefer not to generate Sitemaps at runtime, use this command to build static XML files before deployment:

```bash
# Reads default luminosity.config.ts and outputs to dist/sitemap.xml
npx luminosity generate

# Custom config and output path
npx luminosity generate --config ./seo.config.ts --out ./public/sitemap.xml
```

### 2. Force Compaction
In `incremental` mode, you can manually trigger log compaction at any time. This is useful after bulk data imports:

```bash
npx luminosity compact
```

---

## Ultimate Simplicity: From Deployment to Maintenance

Many developers associate "millions of URLs" or "incremental architectures" with complex distributed systems. In Luminosity, this is simplified to the point of being "invisible":

1.  **Deploy in One Second**: You don't need to install Redis, Kafka, or any external index databases. Just switch your `mode` to `incremental`, and the engine handles log management locally.
2.  **Maintenance is "Set and Forget"**: Compaction tasks are executed automatically by background workers. No need to write cron jobs or manually manage sitemap files.
3.  **No-Pain Scalability**: When your site grows from 1,000 URLs to 10M, your code **stays exactly the same**. Luminosity evolves automatically as your data scales.

---

## Why Luminosity is the Strongest SEO Engine?

Luminosity isn't just a sitemap generator; it's a comprehensive solution for business success:

1.  **Cross-Platform Consistency**: Whether using React (Ion) or Vue, Meta tag management is centralized on the server, solving SPA "invisibility".
2.  **Babysitter-Level Scanning**: The built-in `routeScanner` syncs your routes in a single line of code.
3.  **Zero-Config Tracking**: Automated script injection for GA4, Facebook Pixel, and Baidu with full CSP support.
4.  **SSG Ready**: Deeply integrated with `@gravito/freeze` to bring enterprise SEO to static sites.

> **Final Step**: Ready to go live? Check out the [Deployment Guide](/en/docs/guide/deployment).
