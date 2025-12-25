# Sitemap System Guide: Cartography for Technical SEO

In the world of Search Engine Optimization, a **Sitemap** is your website's primary nautical chart. While the [Luminosity Engine](./seo-engine) makes individual pages more attractive (Meta tags), the **Sitemap** determines whether search engine crawlers can even find and index the "hidden gems" within your galaxy.

Gravito's Sitemap system is designed for **Enterprise SCALE**, capable of handling millions of URLs with built-in support for sharding, incremental updates, and automated cloud synchronization.

---

## Why a Dedicated Sitemap System?

1.  **Solving SPA Crawling**: Content in Single Page Applications (React/Vue) can be elusive to crawlers. Sitemaps ensure every dynamic route is explicitly declared.
2.  **Stellar Scalability**: When your URL count exceeds 50,000, Google requires **"Sitemap Sharding"**. This system automatically generates Index files and shards for you.
3.  **Sync-with-Redirects**: If a URL changes (301 redirect), the Sitemap updates automatically, preventing crawlers from hitting dead ends.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Basic Usage: Dynamic & Static](#basic-usage)
3. [Enterprise Features: S3 & Cloud Storage](#enterprise-features)
4. [Atomic Shadow Processing (Shadow Swap)](#shadow-processing-shadow-swap)
5. [Incremental Build](#incremental-generation)
6. [Automated 301 Redirect Handling](#301-redirect-handling)
7. [Best Practices](#best-practices)


---

## Quick Start

### Installation

```bash
bun add @gravito/constellation
```

### Minimal Example

```typescript
import { OrbitSitemap, routeScanner } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  outDir: './dist',
  providers: [
    routeScanner(core.router)
  ]
})

await sitemap.generate()
```

That's it!Your sitemap is generated at `./dist/sitemap.xml`.

---

## Node.js Runtime Demo

If you want to validate sitemap rendering on a pure Node runtime, use the Express adapter example:

- `examples/luminosity-node`

Note: Some features are only supported when running on Gravito core.

---

## Basic Usage

### 1. Dynamic Sitemap (Runtime)

Serve sitemap directly from your application:

```typescript
import { OrbitSitemap, routeScanner } from '@gravito/constellation'

OrbitSitemap.dynamic({
  baseUrl: 'https://example.com',
  providers: [
    // Automatically scan routes
    routeScanner(core.router, {
      exclude: ['/api/*', '/admin/*'],
      defaultChangefreq: 'daily'
    }),
    
    // Custom provider from database
    {
      async getEntries() {
        const posts = await db.query('SELECT slug, updated_at FROM posts')
        return posts.map(post => ({
          url: `/blog/${post.slug}`,
          lastmod: post.updated_at,
          changefreq: 'weekly',
          priority: 0.8
        }))
      }
    }
  ],
  cacheSeconds: 3600 // Cache for 1 hour
}).install(core)
```

**Access**: Visit `https://example.com/sitemap.xml` in your browser.

### 2. Static Generation (Build Time)

Generate sitemap files during build process:

```typescript
import { OrbitSitemap, routeScanner } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  outDir: './dist',
  filename: 'sitemap.xml',
  providers: [
    routeScanner(core.router),
    {
      async getEntries() {
        // Your custom entries
      }
    }
  ]
})

await sitemap.generate()
```

### 3. Custom Providers

Providers can return:
- **Array**: `Promise<SitemapEntry[]>` or `SitemapEntry[]`
- **AsyncIterable**: For streaming large datasets

```typescript
// Array provider (good for small datasets)
{
  async getEntries() {
    return [
      { url: '/page1', lastmod: new Date() },
      { url: '/page2', lastmod: new Date() }
    ]
  }
}

// AsyncIterable provider (good for large datasets)
{
  async *getEntries() {
    const pageSize = 1000
    let offset = 0
    
    while (true) {
      const rows = await db.query(
        'SELECT id, slug, updated_at FROM products LIMIT ? OFFSET ?',
        [pageSize, offset]
      )
      
      if (rows.length === 0) break
      
      for (const row of rows) {
        yield {
          url: `/products/${row.slug}`,
          lastmod: row.updated_at
        }
      }
      
      offset += pageSize
    }
  }
}
```

### 4. Sitemap Extensions

#### Images

```typescript
{
  url: '/gallery',
  images: [
    {
      loc: 'https://example.com/image1.jpg',
      title: 'Image Title',
      caption: 'Image Caption',
      license: 'https://example.com/license'
    }
  ]
}
```

#### Videos

```typescript
{
  url: '/video-page',
  videos: [{
    thumbnail_loc: 'https://example.com/thumb.jpg',
    title: 'Video Title',
    description: 'Video Description',
    content_loc: 'https://example.com/video.mp4',
    duration: 600,
    view_count: 1000
  }]
}
```

#### News

```typescript
{
  url: '/news/article',
  news: {
    publication: {
      name: 'The Daily',
      language: 'en'
    },
    publication_date: '2024-01-01',
    title: 'Article Title',
    keywords: ['news', 'article']
  }
}
```

#### i18n Alternates

```typescript
{
  url: '/about',
  alternates: [
    { lang: 'en', url: '/en/about' },
    { lang: 'zh-TW', url: '/zh-TW/about' },
    { lang: 'ja', url: '/ja/about' }
  ]
}
```

---

## Enterprise Features

### Cloud Storage (S3 / GCP)

Store sitemaps directly in cloud storage for scalability:

#### AWS S3

```bash
# Install AWS SDK (peer dependency)
bun add @aws-sdk/client-s3
```

```typescript
import { OrbitSitemap, S3SitemapStorage } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  storage: new S3SitemapStorage({
    bucket: 'my-sitemap-bucket',
    region: 'us-east-1',
    prefix: 'sitemaps', // Optional: folder prefix
    baseUrl: 'https://my-sitemap-bucket.s3.amazonaws.com',
    shadow: {
      enabled: true,
      mode: 'atomic' // or 'versioned'
    }
  }),
  providers: [...]
})

await sitemap.generate()
```

**Environment Variables**:
```bash
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

#### Google Cloud Storage

```bash
# Install GCP SDK (peer dependency)
bun add @google-cloud/storage
```

```typescript
import { OrbitSitemap, GCPSitemapStorage } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  storage: new GCPSitemapStorage({
    bucket: 'my-sitemap-bucket',
    prefix: 'sitemaps',
    baseUrl: 'https://storage.googleapis.com/my-sitemap-bucket',
    shadow: {
      enabled: true,
      mode: 'versioned'
    }
  }),
  providers: [...]
})

await sitemap.generate()
```

**Authentication**: Uses default GCP credentials or set `GOOGLE_APPLICATION_CREDENTIALS`.

### Shadow Processing

Shadow processing ensures safe deployments by generating sitemaps to temporary locations before switching:

#### Atomic Mode

Generate to temporary location, then atomically swap:

```typescript
const sitemap = OrbitSitemap.static({
  // ...
  shadow: {
    enabled: true,
    mode: 'atomic'
  }
})
```

**How it works**:
1. Generate to `sitemap.xml.shadow.{id}`
2. When complete, atomically move to `sitemap.xml`
3. Delete shadow file

#### Versioned Mode

Keep old versions, switch when ready:

```typescript
const sitemap = OrbitSitemap.static({
  // ...
  shadow: {
    enabled: true,
    mode: 'versioned'
  }
})
```

**How it works**:
1. Generate to `sitemap.xml.shadow.{id}`
2. Copy to `sitemap.xml.v{version}`
3. Copy to `sitemap.xml`
4. Delete shadow file

**Switch versions**:
```typescript
await storage.switchVersion('sitemap.xml', 'version-id')
```

### Background Generation with Progress Tracking

Generate sitemaps asynchronously without blocking:

```typescript
import { OrbitSitemap, MemoryProgressStorage } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  outDir: './dist',
  providers: [...],
  progressStorage: new MemoryProgressStorage() // or RedisProgressStorage
})

// Trigger background generation
const jobId = await sitemap.generateAsync({
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percentage}% (${progress.processed}/${progress.total})`)
  },
  onComplete: () => {
    console.log('[Complete] Generation completed!')
  },
  onError: (error) => {
    console.error('❌ Generation failed:', error)
  }
})

console.log(`Job ID: ${jobId}`)
```

#### Query Progress via API

Install API endpoints:

```typescript
sitemap.installApiEndpoints(core, '/admin/sitemap')
```

> **Security Note**: These API endpoints are not protected by default. In production, you must implement authentication and authorization to protect these endpoints from unauthorized access.

**Protecting the Endpoints**:

##### Method 1: Using Sentinel (Recommended)

Use `@gravito/sentinel` for authentication and authorization:

```typescript
import { auth, can } from '@gravito/sentinel'

// Define authorization ability (in Gate)
core.get('gate').define('manage-sitemap', (user) => {
  // Only admins can manage sitemap
  return user.role === 'admin'
})

// Register protection middleware before installing endpoints
core.router.use('/admin/sitemap/*', auth(), can('manage-sitemap'))

// Then install endpoints
sitemap.installApiEndpoints(core, '/admin/sitemap')
```

##### Method 2: Using API Token

Simple API token authentication:

```typescript
import type { GravitoContext, Next } from 'gravito-core'

const apiTokenAuth = async (c: GravitoContext, next: Next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const validToken = process.env.SITEMAP_API_TOKEN
  
  if (!token || token !== validToken) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  await next()
}

// Register protection middleware before installing endpoints
core.router.use('/admin/sitemap/*', apiTokenAuth)

// Then install endpoints
sitemap.installApiEndpoints(core, '/admin/sitemap')
```

**Environment Variable**:
```bash
SITEMAP_API_TOKEN=your-secret-token-here
```

**Usage**:
```bash
curl -X POST http://localhost:3000/admin/sitemap/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token-here" \
  -d '{"incremental": false}'
```

##### Method 3: Using IP Whitelist

Restrict access to specific IPs:

```typescript
import type { GravitoContext, Next } from 'gravito-core'
import { ipRangeCheck } from 'ip-range-check' // requires package installation

const adminOnly = async (c: GravitoContext, next: Next) => {
  // Get client IP (considering proxy servers)
  const forwardedFor = c.req.header('x-forwarded-for')
  const realIp = c.req.header('x-real-ip')
  const clientIP = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
  
  // Allowed IP ranges
  const allowedIPs = [
    '127.0.0.1',
    '::1',
    '10.0.0.0/8',      // Internal network
    '192.168.0.0/16',  // Internal network
  ]
  
  const isAllowed = allowedIPs.some(ip => {
    if (ip.includes('/')) {
      // CIDR range check
      return ipRangeCheck(clientIP, ip)
    }
    return clientIP === ip
  })
  
  if (!isAllowed) {
    return c.json({ error: 'Forbidden: IP not allowed' }, 403)
  }
  
  await next()
}

core.router.use('/admin/sitemap/*', adminOnly)
sitemap.installApiEndpoints(core, '/admin/sitemap')
```

##### Method 4: Combining Multiple Protection Mechanisms

Combine multiple protection methods for enhanced security:

```typescript
import { auth } from '@gravito/sentinel'
import type { GravitoContext, Next } from 'gravito-core'

// 1. Check authentication
const requireAuth = auth()

// 2. Check API Token (as second layer)
const requireApiToken = async (c: GravitoContext, next: Next) => {
  const token = c.req.header('X-API-Token')
  if (token !== process.env.SITEMAP_API_TOKEN) {
    return c.json({ error: 'Invalid API token' }, 401)
  }
  await next()
}

// 3. Combine both
core.router.use('/admin/sitemap/*', requireAuth, requireApiToken)
sitemap.installApiEndpoints(core, '/admin/sitemap')
```

**Available endpoints**:
- `POST /admin/sitemap/generate` - Trigger generation
- `GET /admin/sitemap/status/:jobId` - Query progress
- `GET /admin/sitemap/history` - List generation history

**Example request** (with API token authentication):
```bash
# Trigger generation
curl -X POST http://localhost:3000/admin/sitemap/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token-here" \
  -d '{"incremental": false}'

# Query progress
curl http://localhost:3000/admin/sitemap/status/{jobId} \
  -H "Authorization: Bearer your-secret-token-here"

# Query history
curl http://localhost:3000/admin/sitemap/history?limit=10 \
  -H "Authorization: Bearer your-secret-token-here"
```

> **Tip**: In development, you can temporarily skip authentication, but always implement proper security before deploying to production.

#### Using Redis for Progress Storage

```typescript
import { RedisProgressStorage } from '@gravito/constellation'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

const sitemap = OrbitSitemap.static({
  // ...
  progressStorage: new RedisProgressStorage({
    client: redis,
    keyPrefix: 'sitemap:progress:',
    ttl: 86400 // 24 hours
  })
})
```

### Large Scale Sharding

Automatically splits large sitemaps into multiple files:

```typescript
const sitemap = OrbitSitemap.static({
  // ...
  maxEntriesPerFile: 50000 // Default: 50000 (Google's limit)
})
```

**Result**:
- `sitemap.xml` (index file)
- `sitemap-1.xml` (first 50k URLs)
- `sitemap-2.xml` (next 50k URLs)
- ...

---

## Incremental Generation

Only update changed URLs instead of regenerating the entire sitemap:

### Setup

```typescript
import { OrbitSitemap, MemoryChangeTracker } from '@gravito/constellation'

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  outDir: './dist',
  providers: [...],
  incremental: {
    enabled: true,
    changeTracker: new MemoryChangeTracker({
      maxChanges: 100000
    }),
    autoTrack: true // Automatically track changes
  }
})
```

### Full Generation (First Time)

```typescript
await sitemap.generate()
```

This generates the complete sitemap and tracks all URLs.

### Incremental Update

```typescript
// Update only changes since a specific date
await sitemap.generateIncremental(new Date('2024-01-01'))
```

### Manual Change Tracking

```typescript
// Track URL addition
await sitemap.trackChange({
  type: 'add',
  url: '/new-page',
  entry: {
    url: '/new-page',
    lastmod: new Date(),
    changefreq: 'weekly'
  },
  timestamp: new Date()
})

// Track URL update
await sitemap.trackChange({
  type: 'update',
  url: '/existing-page',
  entry: {
    url: '/existing-page',
    lastmod: new Date(),
    changefreq: 'daily'
  },
  timestamp: new Date()
})

// Track URL removal
await sitemap.trackChange({
  type: 'remove',
  url: '/deleted-page',
  timestamp: new Date()
})
```

### Using Redis for Change Tracking

```typescript
import { RedisChangeTracker } from '@gravito/constellation'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

const sitemap = OrbitSitemap.static({
  // ...
  incremental: {
    enabled: true,
    changeTracker: new RedisChangeTracker({
      client: redis,
      keyPrefix: 'sitemap:changes:',
      ttl: 604800 // 7 days
    })
  }
})
```

---

## 301 Redirect Handling

Automatically handle URL redirects in your sitemap:

### Setup

```typescript
import { 
  OrbitSitemap, 
  MemoryRedirectManager,
  RedirectDetector 
} from '@gravito/constellation'

const redirectManager = new MemoryRedirectManager()

const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  outDir: './dist',
  providers: [...],
  redirect: {
    enabled: true,
    manager: redirectManager,
    strategy: 'remove_old_add_new', // See strategies below
    followChains: true, // Follow redirect chains (A → B → C)
    maxChainLength: 5 // Maximum chain length
  }
})
```

### Redirect Strategies

#### 1. Remove Old, Add New (Default)

Removes old URL, adds new URL:

```typescript
redirect: {
  strategy: 'remove_old_add_new'
}
```

**Result**: Only new URL appears in sitemap.

#### 2. Keep Relation

Keeps old URL with canonical link:

```typescript
redirect: {
  strategy: 'keep_relation'
}
```

**Result**: Old URL remains with `<xhtml:link rel="canonical">` pointing to new URL.

#### 3. Update URL

Simply updates the URL in place:

```typescript
redirect: {
  strategy: 'update_url'
}
```

**Result**: URL is updated, metadata preserved.

#### 4. Dual Mark

Keeps both old and new URLs:

```typescript
redirect: {
  strategy: 'dual_mark'
}
```

**Result**: Both URLs appear, old URL marked with redirect info.

### Auto-Detection

Automatically detect redirects via HTTP requests:

```typescript
const detector = new RedirectDetector({
  baseUrl: 'https://example.com',
  autoDetect: {
    enabled: true,
    timeout: 5000,
    maxConcurrent: 10,
    cache: true,
    cacheTtl: 3600
  }
})

// Detect redirects for URLs
const redirects = await detector.detectBatch([
  '/old-page-1',
  '/old-page-2'
])

// Register detected redirects
for (const [from, rule] of redirects) {
  if (rule) {
    await redirectManager.register(rule)
  }
}
```

### Database Detection

Load redirects from database:

```typescript
const detector = new RedirectDetector({
  baseUrl: 'https://example.com',
  database: {
    enabled: true,
    table: 'redirects',
    columns: {
      from: 'old_url',
      to: 'new_url',
      type: 'redirect_type'
    },
    connection: dbConnection
  }
})
```

### Config File Detection

Load redirects from JSON file:

```typescript
const detector = new RedirectDetector({
  baseUrl: 'https://example.com',
  config: {
    enabled: true,
    path: './redirects.json',
    watch: true // Watch for file changes
  }
})
```

**redirects.json**:
```json
[
  {
    "from": "/old-page",
    "to": "/new-page",
    "type": 301
  }
]
```

### Manual Registration

```typescript
// Single redirect
await redirectManager.register({
  from: '/old-page',
  to: '/new-page',
  type: 301
})

// Batch registration
await redirectManager.registerBatch([
  { from: '/old-1', to: '/new-1', type: 301 },
  { from: '/old-2', to: '/new-2', type: 302 }
])
```

### Using Redis for Redirect Management

```typescript
import { RedisRedirectManager } from '@gravito/constellation'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

const redirectManager = new RedisRedirectManager({
  client: redis,
  keyPrefix: 'sitemap:redirects:',
  ttl: undefined // Permanent
})
```

---

## Best Practices

### 1. Use AsyncIterable for Large Datasets

```typescript
{
  async *getEntries() {
    // Stream from database instead of loading all at once
    for await (const row of db.cursor('SELECT * FROM products')) {
      yield { url: `/products/${row.slug}` }
    }
  }
}
```

### 2. Set Appropriate Change Frequency

```typescript
{
  url: '/blog/post',
  changefreq: 'weekly', // How often content changes
  priority: 0.8 // Relative importance (0.0 - 1.0)
}
```

### 3. Use Incremental Generation for Large Sites

```typescript
// Only update what changed
await sitemap.generateIncremental(new Date('2024-01-01'))
```

### 4. Enable Shadow Processing for Production

```typescript
shadow: {
  enabled: true,
  mode: 'atomic' // Safe deployments
}
```

### 5. Monitor Generation Progress

```typescript
await sitemap.generateAsync({
  onProgress: (progress) => {
    // Log or send to monitoring service
    logger.info(`Sitemap generation: ${progress.percentage}%`)
  }
})
```

### 6. Handle Redirects Proactively

```typescript
// Detect and register redirects before generation
const redirects = await detector.detectBatch(urls)
for (const [from, rule] of redirects) {
  if (rule) await redirectManager.register(rule)
}
```

### 7. Use Cloud Storage for Scalability

```typescript
// Store in S3/GCP for CDN distribution
storage: new S3SitemapStorage({
  bucket: 'my-sitemap-bucket',
  region: 'us-east-1'
})
```

---

## Troubleshooting

### Problem: Sitemap generation is too slow

**Solutions**:
1. Use AsyncIterable providers instead of loading all data
2. Enable incremental generation
3. Use background generation with `generateAsync()`
4. Split providers by content type

### Problem: Memory issues with large datasets

**Solutions**:
1. Use streaming providers (AsyncIterable)
2. Reduce `maxEntriesPerFile` to create more shards
3. Use cloud storage instead of local filesystem
4. Enable incremental generation

### Problem: Redirects not working

**Solutions**:
1. Check redirect manager is properly configured
2. Verify redirect rules are registered before generation
3. Check redirect strategy matches your needs
4. Enable `followChains` if redirect chains exist

### Problem: Progress tracking not updating

**Solutions**:
1. Ensure `progressStorage` is configured
2. Check Redis connection if using `RedisProgressStorage`
3. Verify job ID is correct when querying
4. Check API endpoints are installed

### Problem: Cloud storage upload fails

**Solutions**:
1. Verify credentials (AWS/GCP)
2. Check bucket permissions
3. Verify region is correct
4. Check network connectivity

---

## Complete Example

Here's a complete enterprise setup:

```typescript
import { 
  OrbitSitemap,
  S3SitemapStorage,
  RedisChangeTracker,
  RedisRedirectManager,
  RedisProgressStorage,
  RedirectDetector,
  routeScanner
} from '@gravito/constellation'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

// Setup redirect detection and management
const redirectManager = new RedisRedirectManager({
  client: redis,
  keyPrefix: 'sitemap:redirects:'
})

const detector = new RedirectDetector({
  baseUrl: 'https://example.com',
  autoDetect: {
    enabled: true,
    timeout: 5000,
    cache: true
  }
})

// Detect and register redirects
const urls = ['/old-page-1', '/old-page-2']
const redirects = await detector.detectBatch(urls)
for (const [from, rule] of redirects) {
  if (rule) await redirectManager.register(rule)
}

// Create sitemap with all enterprise features
const sitemap = OrbitSitemap.static({
  baseUrl: 'https://example.com',
  storage: new S3SitemapStorage({
    bucket: 'my-sitemap-bucket',
    region: 'us-east-1',
    shadow: {
      enabled: true,
      mode: 'atomic'
    }
  }),
  providers: [
    routeScanner(core.router, {
      exclude: ['/api/*', '/admin/*']
    }),
    {
      async *getEntries() {
        // Stream products from database
        for await (const product of db.products.cursor()) {
          yield {
            url: `/products/${product.slug}`,
            lastmod: product.updatedAt,
            changefreq: 'weekly',
            priority: 0.7
          }
        }
      }
    }
  ],
  incremental: {
    enabled: true,
    changeTracker: new RedisChangeTracker({
      client: redis,
      keyPrefix: 'sitemap:changes:'
    }),
    autoTrack: true
  },
  redirect: {
    enabled: true,
    manager: redirectManager,
    strategy: 'remove_old_add_new',
    followChains: true
  },
  progressStorage: new RedisProgressStorage({
    client: redis,
    keyPrefix: 'sitemap:progress:'
  }),
  shadow: {
    enabled: true,
    mode: 'atomic'
  }
})

// Install API endpoints
sitemap.installApiEndpoints(core, '/admin/sitemap')

// Generate (first time - full generation)
await sitemap.generate()

// Or generate incrementally
await sitemap.generateIncremental(new Date('2024-01-01'))

// Or generate in background
const jobId = await sitemap.generateAsync({
  onProgress: (progress) => {
    console.log(`${progress.percentage}%`)
  }
})
```

---

## Next Steps

- Check out [SEO Engine Guide](/en/docs/guide/seo-engine) for meta tags and analytics
- See [Deployment Guide](/en/docs/guide/deployment) for production setup
- Review [Enterprise Integration](/en/docs/guide/enterprise-integration) for advanced patterns

---

**Need help?** Open an issue on [GitHub](https://github.com/gravito-framework/gravito/issues).
