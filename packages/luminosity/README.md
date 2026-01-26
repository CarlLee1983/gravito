# @gravito/luminosity

The intelligent core of the Gravito SmartMap Engine™. Luminosity provides a comprehensive suite of SEO tools including high-performance sitemap generation, programmable `robots.txt` management, dynamic meta tag building, and advanced SEO analytics integration.

## 🌟 Key Features

- **Tri-Mode Architecture**:
  - **Dynamic**: Real-time generation for small to medium sites.
  - **Cached (Mutex)**: Thread-safe caching for high-traffic environments.
  - **Incremental (LSM)**: Database-grade Write-Ahead Logging (WAL) and Log-Structured Merge-Tree (LSM) engine for massive-scale sites (1M+ pages).
- **RouteScanner**: Automatic route discovery with native adapters for:
  - **Gravito**, **Hono**, **Express**, **Fastify**, **Next.js**, **Nuxt**, **Remix**, **SvelteKit**, and **Astro**.
- **High-Performance Sitemaps**:
  - Streaming XML builder with **Gzip compression**.
  - Automatic **Sitemap Indexing** and pagination (50,000 URLs limit).
  - Support for **Rich Media** (Images and Videos).
  - Built-in **i18n (hreflang)** support with `createAlternates` helper.
- **Programmable Robots.txt**: Fluent API for constructing crawler directives.
- **Dynamic SEO Metadata**:
  - Builders for **OpenGraph**, **Twitter Cards**, and **JSON-LD**.
  - **SeoRenderer** for easy integration with frontend frameworks.
- **SEO Analytics**: One-line integration for **Google Analytics (gtag)**, **Meta Pixel**, and **Baidu Tongji**.
- **Cloud Native**: Unified `StorageAdapter` with built-in support for **Local File System** and **AWS S3**.
- **Diagnostic Tools**: **MetaInspector** for fetching and parsing SEO tags from any public URL.

## 📦 Installation

```bash
bun add @gravito/luminosity
```

## 🚀 Quick Start

### Basic Sitemap Generation

```typescript
import { Luminosity } from '@gravito/luminosity';

const engine = new Luminosity({
  hostname: 'https://example.com',
  path: './public',
  gzip: true
});

await engine.generate([
  { url: '/', lastmod: new Date(), changefreq: 'daily', priority: 1.0 },
  { url: '/about', priority: 0.8 }
]);
```

### Programmable Robots.txt

```typescript
const robots = engine.robots()
  .userAgent('*')
  .allow('/')
  .disallow('/admin')
  .sitemap('https://example.com/sitemap-index.xml')
  .build();
```

## 🛠️ Advanced Configuration

### The SEO Engine (Server-Side)

The `SeoEngine` acts as the orchestrator for all SEO features, managing the lifecycle of your chosen strategy.

```typescript
import { SeoEngine } from '@gravito/luminosity';

const config = {
  mode: 'incremental',
  baseUrl: 'https://example.com',
  incremental: {
    logDir: './storage/seo',
    compactInterval: 3600000 // 1 hour
  }
};

const seo = new SeoEngine(config);
await seo.init();

// Middleware usage example (Express/Hono)
const content = await seo.render('/sitemap.xml');
```

### Route Scanning

Automatically discover routes from your framework:

```typescript
import { SitemapBuilder, NextScanner } from '@gravito/luminosity';

const builder = new SitemapBuilder({
  scanner: new NextScanner({ appDir: './app' }),
  hostname: 'https://example.com'
});

const entries = await builder.build();
```

### SEO Metadata & Analytics

Generate meta tags and tracking scripts dynamically:

```typescript
import { MetaTagBuilder, AnalyticsBuilder } from '@gravito/luminosity';

// Meta Tags
const meta = new MetaTagBuilder()
  .title('My Awesome Page')
  .description('This is a description')
  .openGraph({ type: 'website', image: '/og.png' })
  .build();

// Analytics
const analytics = new AnalyticsBuilder({ gtag: 'G-XXXXXXXXXX' }).build();
```

## ☁️ Storage Adapters

Luminosity is framework-agnostic and cloud-ready. Swap storage backends with ease:

### S3 Storage (Serverless)

```typescript
import { S3Adapter } from '@gravito/luminosity';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const storage = new S3Adapter({
  bucket: 'my-bucket',
  client: new S3Client({ region: 'us-east-1' }),
  commands: { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand }
});
```

## 🔍 CLI Tools (`lux`)

Luminosity includes a powerful CLI for managing your SEO infrastructure:

- `lux generate`: Manually trigger sitemap generation.
- `lux repair`: Fix corrupted LSM logs.
- `lux inspect <url>`: Preview how a URL appears to search engines and social media.

## 📄 License

MIT © Carl Lee
