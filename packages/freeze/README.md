# @gravito/freeze

> 🧊 Static Site Generation (SSG) core module for Gravito Framework

## Overview

`@gravito/freeze` provides the core utilities for building static sites from Gravito applications. It handles environment detection, locale-aware routing, and build-time generation.

## Installation

```bash
bun add @gravito/freeze
```

## Quick Start

```typescript
import { defineConfig, createDetector } from '@gravito/freeze'

// Define your SSG configuration
const config = defineConfig({
  staticDomains: ['example.com', 'example.github.io'],
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  baseUrl: 'https://example.com',
  redirects: [
    { from: '/docs', to: '/en/docs/guide/getting-started' },
    { from: '/about', to: '/en/about' },
  ],
})

// Create a detector instance
const detector = createDetector(config)

// Check if running in static mode
if (detector.isStaticSite()) {
  console.log('Using static mode - native <a> tags')
} else {
  console.log('Using dynamic mode - Inertia <Link>')
}
```

## API Reference

### Configuration

#### `defineConfig(config)`

Define SSG configuration with sensible defaults.

```typescript
const config = defineConfig({
  staticDomains: ['example.com'],
  previewPort: 4173,        // default
  locales: ['en', 'zh'],
  defaultLocale: 'en',      // default
  outputDir: 'dist-static', // default
  baseUrl: 'https://example.com',
  redirects: [],
})
```

### Runtime Detection

#### `FreezeDetector`

The main detector class for runtime environment checks.

```typescript
const detector = createDetector(config)

// Check if static site
detector.isStaticSite() // boolean

// Get locale from URL path
detector.getLocaleFromPath('/en/docs') // 'en'

// Get localized path
detector.getLocalizedPath('/about', 'zh') // '/zh/about'

// Switch locale
detector.switchLocale('/en/docs', 'zh') // '/zh/docs'

// Check redirect rules
detector.needsRedirect('/docs') // { from: '/docs', to: '/en/docs/...' }

// Get current locale (browser only)
detector.getCurrentLocale() // 'en'
```

### Build Utilities

#### `generateSitemapXml(entries, baseUrl)`

Generate a standard sitemap.xml with hreflang alternates.

```typescript
import { generateSitemapEntries, generateSitemapXml } from '@gravito/freeze'

const entries = generateSitemapEntries(config, ['/about', '/products'])
const xml = generateSitemapXml(entries, 'https://example.com')
```

#### `generateRobotsTxt(baseUrl, sitemap = true)`

Generate a standard robots.txt file.

```typescript
import { generateRobotsTxt } from '@gravito/freeze'

const robots = generateRobotsTxt('https://example.com')
```

#### `generate404Html(config)`

Generate a generic 404.html for static hosting.

```typescript
import { generate404Html } from '@gravito/freeze'

const html = generate404Html(config)
```

#### `validateRoutes(routes)`

Ensure all routes start with a forward slash.

```typescript
import { validateRoutes } from '@gravito/freeze'

validateRoutes(['/about', 'invalid']) // Throws Error
```

#### `generateRedirectHtml(targetUrl)`

Generate redirect HTML for abstract routes.

```typescript
import { generateRedirectHtml } from '@gravito/freeze'

const html = generateRedirectHtml('/en/about')
// Returns HTML with meta refresh and JS redirect
```

#### `generateRedirects(config)`

Generate all redirect HTML files based on config.

```typescript
import { generateRedirects } from '@gravito/freeze'

const redirectMap = generateRedirects(config)
// Map<'about/index.html', html>
```

#### `generateLocalizedRoutes(routes, locales)`

Generate localized routes from abstract paths.

```typescript
import { generateLocalizedRoutes } from '@gravito/freeze'

const routes = generateLocalizedRoutes(['/docs', '/about'], ['en', 'zh'])
// ['/en/docs', '/zh/docs', '/en/about', '/zh/about']
```

#### `inferRedirects(locales, defaultLocale, routes)`

Automatically infer redirects for common routes.

```typescript
import { inferRedirects } from '@gravito/freeze'

const redirects = inferRedirects(['en', 'zh'], 'en', ['/docs', '/about'])
// [{ from: '/docs', to: '/en/docs' }, ...]
```

## Framework Adapters

For framework-specific integrations, use:

- `@gravito/freeze-react` - React components and hooks
- `@gravito/freeze-vue` - Vue components and composables

## License

MIT © Gravito Framework
