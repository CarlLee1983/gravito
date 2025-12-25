---
title: Static Site Development Guide
---

# Static Site Generation with Orbit Freeze

Build blazing-fast static sites from your Gravito applications using **Orbit Freeze (`@gravito/freeze`)**.

## Quick Start

### Option 1: Use CLI Template (Recommended)

The fastest way to get started is using the CLI template generator:

```bash
# Create a new static site project
gravito create my-static-site --template static-site

# You'll be prompted to choose between React or Vue 3
cd my-static-site
bun install
bun run dev
```

This will scaffold a complete static site project with:
- Pre-configured `@gravito/freeze` setup
- StaticLink components for React or Vue
- Build scripts for static generation
- Example configuration files

### Option 2: Manual Setup

If you prefer to set up manually:

#### 1. Install the Package

```bash
bun add @gravito/freeze
```

### 2. Create Configuration

Create a `freeze.config.ts` in your project root:

```typescript
import { defineConfig } from '@gravito/freeze'

export const freezeConfig = defineConfig({
  // Your production domains
  staticDomains: ['example.com', 'example.github.io'],
  
  // Supported languages
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  
  // Production URL (for sitemap)
  baseUrl: 'https://example.com',
  
  // Abstract routes that need redirects
  redirects: [
    { from: '/docs', to: '/en/docs/guide/getting-started' },
    { from: '/about', to: '/en/about' },
  ],
})
```

### 3. Use StaticLink Component

Replace Inertia `<Link>` with `StaticLink` for all internal navigation:

**React:**
```tsx
import { createDetector } from '@gravito/freeze'
import { Link } from '@inertiajs/react'
import { freezeConfig } from '../freeze.config'

const detector = createDetector(freezeConfig)

export function StaticLink({ href, children, ...props }) {
  const localizedHref = detector.getLocalizedPath(href, currentLocale)
  
  if (detector.isStaticSite()) {
    return <a href={localizedHref} {...props}>{children}</a>
  }
  
  return <Link href={localizedHref} {...props}>{children}</Link>
}
```

**Vue:**
```vue
<script setup lang="ts">
import { createDetector } from '@gravito/freeze'
import { Link } from '@inertiajs/vue3'
import { freezeConfig } from '../freeze.config'

const detector = createDetector(freezeConfig)
const isStatic = detector.isStaticSite()
</script>

<template>
  <a v-if="isStatic" :href="localizedHref"><slot /></a>
  <Link v-else :href="localizedHref"><slot /></Link>
</template>
```

### 4. Build Static Site

```bash
# Build and preview
bun run build:static
bun run preview

# Or use the combined command
bun run build:preview
```

---

## How It Works

Gravito SSG follows a three-stage process from dynamic development to static deployment:

### Stage 1: Development Mode (Dynamic)

During development, the application runs in traditional dynamic mode:

- **Inertia SPA**: Full single-page application experience with Inertia.js
- **Hot Module Reload (HMR)**: Instant development feedback via Vite
- **Backend Server**: Full Gravito core functionality available
- **Dynamic Rendering**: All routes generated on-demand

### Stage 2: Build SSG (Freeze)

When running `bun run build:static`, the system:

- **Pre-renders all pages**: Traverses all routes and generates HTML
- **Generates redirects**: Creates redirect HTML for abstract routes
- **Creates sitemap**: Automatically generates sitemap.xml with i18n support
- **Localizes routes**: Generates path structure for each locale

### Stage 3: Deploy (Static)

Generated static files can be deployed to any static hosting service:

- **GitHub Pages**: Free static website hosting
- **Vercel**: Global CDN acceleration
- **Netlify**: Automated deployment workflow
- **Cloudflare Pages**: Edge computing optimization

### Flow Diagram

```
Development (Dynamic)  →  Build SSG (Freeze)  →  Deploy (Static)
        │                       │                      │
        ├─ Inertia SPA          ├─ Pre-render pages    ├─ GitHub Pages
        ├─ Hot reload           ├─ Generate redirects   ├─ Vercel
        └─ Backend server       └─ Create sitemap      └─ Netlify/Cloudflare
```

### Environment Detection Mechanism

`FreezeDetector` automatically switches modes based on the current environment:

| Environment | Mode | Behavior |
|-------------|------|----------|
| `localhost:3000` | Dynamic | Uses Inertia navigation |
| `localhost:5173` | Dynamic | Vite dev server |
| `localhost:4173` | Static | Preview mode, uses regular anchor tags |
| `*.github.io` | Static | Static mode, uses regular anchor tags |
| `*.vercel.app` | Static | Static mode, uses regular anchor tags |
| Custom domain | Static | Based on `staticDomains` config |

---

## Configuration Reference

### FreezeConfig Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `staticDomains` | `string[]` | `[]` | Production domains for static mode |
| `previewPort` | `number` | `4173` | Local preview server port |
| `locales` | `string[]` | `['en']` | Supported locales |
| `defaultLocale` | `string` | `'en'` | Default locale for redirects |
| `redirects` | `RedirectRule[]` | `[]` | Abstract route redirects |
| `outputDir` | `string` | `'dist-static'` | Output directory |
| `baseUrl` | `string` | - | Production URL |

### Environment Detection

The `FreezeDetector` automatically detects static environments:

| Environment | Detection Method | Mode |
|-------------|-----------------|------|
| `localhost:3000` | Development server | **Dynamic** |
| `localhost:5173` | Vite dev server | **Dynamic** |
| `localhost:4173` | Preview server | **Static** |
| `*.github.io` | GitHub Pages | **Static** |
| `*.vercel.app` | Vercel | **Static** |
| `*.netlify.app` | Netlify | **Static** |
| `*.pages.dev` | Cloudflare Pages | **Static** |
| Configured domains | `staticDomains` | **Static** |

---

## Internationalization (i18n)

### Locale-Aware Paths

All paths are automatically localized:

```typescript
const detector = createDetector(config)

// Add locale prefix
detector.getLocalizedPath('/about', 'en')  // '/en/about'
detector.getLocalizedPath('/docs', 'zh')   // '/zh/docs'

// Switch locale
detector.switchLocale('/en/docs/guide', 'zh')  // '/zh/docs/guide'

// Extract locale from path
detector.getLocaleFromPath('/zh/about')  // 'zh'
```

### Locale Switcher Example

```tsx
function LocaleSwitcher() {
  const detector = createDetector(freezeConfig)
  const currentPath = window.location.pathname
  
  const switchTo = (locale: string) => {
    const newPath = detector.switchLocale(currentPath, locale)
    window.location.href = newPath
  }
  
  return (
    <div>
      <button onClick={() => switchTo('en')}>English</button>
      <button onClick={() => switchTo('zh')}>中文</button>
    </div>
  )
}
```

---

## Project Structure

Recommended structure for SSG projects:

```
my-site/
├── freeze.config.ts          # SSG configuration
├── build-static.ts           # Build script
├── src/
│   ├── client/
│   │   ├── components/
│   │   │   ├── StaticLink.tsx    # or .vue
│   │   │   └── LocaleSwitcher.tsx
│   │   └── pages/
│   │       ├── Home.tsx
│   │       └── About.tsx
│   └── routes/
│       └── index.ts
├── dist-static/              # Generated static files
│   ├── index.html
│   ├── en/
│   │   ├── index.html
│   │   └── about/
│   │       └── index.html
│   ├── zh/
│   │   ├── index.html
│   │   └── about/
│   │       └── index.html
│   ├── about/
│   │   └── index.html       # Redirect to /en/about
│   ├── sitemap.xml
│   └── robots.txt
└── package.json
```

---

## [Complete] Development Checklist

Before deploying your static site:

### Configuration
- [ ] Create `freeze.config.ts` with your domains and locales
- [ ] Add all abstract routes to `redirects`
- [ ] Set correct `baseUrl` for production

### Components
- [ ] Replace all `<Link>` with `StaticLink`
- [ ] Implement locale switcher using `detector.switchLocale()`
- [ ] Ensure all internal links use `getLocalizedPath()`

### Build & Test
- [ ] Run `bun run build:preview`
- [ ] Test at http://localhost:4173
- [ ] Verify: No black overlay on navigation
- [ ] Verify: Language switching works correctly
- [ ] Verify: Abstract routes redirect properly
- [ ] Check browser console for errors

### Deploy
- [ ] Configure GitHub Pages / Vercel / Netlify
- [ ] Set up custom domain (optional)
- [ ] Verify production site

---

## Build Script Example

A complete build script using `@gravito/freeze`:

```typescript
// build-static.ts
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  generateRedirects,
  generateLocalizedRoutes,
  generateSitemapEntries,
} from '@gravito/freeze'
import { freezeConfig } from './freeze.config'

async function build() {
  const outputDir = freezeConfig.outputDir
  
  // 1. Build client assets
  console.log(' Building client assets...')
  await Bun.spawn(['bun', 'run', 'build:client']).exited
  
  // 2. Generate all localized routes
  const abstractRoutes = ['/', '/about', '/docs/guide/getting-started']
  const routes = generateLocalizedRoutes(abstractRoutes, freezeConfig.locales)
  
  // 3. Render each route
  for (const route of routes) {
    console.log(`Render: ${route}`)
    // ... your rendering logic
  }
  
  // 4. Generate redirects
  console.log(' Generating redirects...')
  const redirects = generateRedirects(freezeConfig)
  for (const [path, html] of redirects) {
    const filePath = join(outputDir, path)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, html)
  }
  
  // 5. Generate sitemap
  console.log(' Generating sitemap...')
  const sitemapEntries = generateSitemapEntries(routes, freezeConfig)
  // ... render sitemap XML
  
  console.log('[Complete] SSG Build Complete!')
}

build()
```

---

## Best Practices

### 1. Always Use StaticLink
```tsx
// ❌ Don't use Inertia Link directly
import { Link } from '@inertiajs/react'
<Link href="/about">About</Link>

// [Complete] Use StaticLink wrapper
import { StaticLink } from './components/StaticLink'
<StaticLink href="/about">About</StaticLink>
```

### 2. Always Include Locale Prefix
```typescript
// ❌ Don't use unprefixed paths
const path = '/docs/guide'

// [Complete] Always localize paths
const path = detector.getLocalizedPath('/docs/guide', currentLocale)
```

### 3. Handle Redirects
```typescript
// ❌ Don't leave abstract routes without redirects
// /about will 404

// [Complete] Add redirects in config
redirects: [
  { from: '/about', to: '/en/about' },
]
```

### 4. Test Before Deploy
```bash
# Always test static build locally
bun run build:preview

# Visit http://localhost:4173
# Test all navigation paths
```

---

## API Reference

### `defineConfig(options)`
Create a validated configuration object.

### `createDetector(config)`
Create a detector instance for runtime checks.

### `FreezeDetector` Methods
| Method | Description |
|--------|-------------|
| `isStaticSite()` | Check if running in static mode |
| `getLocaleFromPath(path)` | Extract locale from URL |
| `getLocalizedPath(path, locale)` | Add locale prefix to path |
| `switchLocale(path, newLocale)` | Switch locale in URL |
| `needsRedirect(path)` | Check if path needs redirect |
| `getCurrentLocale()` | Get current locale (browser only) |

### Build Utilities
| Function | Description |
|----------|-------------|
| `generateRedirectHtml(url)` | Create redirect HTML |
| `generateRedirects(config)` | Generate all redirects |
| `generateLocalizedRoutes(routes, locales)` | Create localized routes |
| `inferRedirects(locales, default, routes)` | Auto-infer redirects |
| `generateSitemapEntries(routes, config)` | Create sitemap with i18n |

---

## Deployment Guides

### GitHub Pages
```yaml
# .github/workflows/deploy.yml
- name: Build static site
  run: bun run build:static

- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./dist-static
```

### Vercel
```json
// vercel.json
{
  "buildCommand": "bun run build:static",
  "outputDirectory": "dist-static"
}
```

### Netlify
```toml
# netlify.toml
[build]
  command = "bun run build:static"
  publish = "dist-static"
```

---

Following this guide ensures your Gravito application can be seamlessly deployed as a high-performance static site!
