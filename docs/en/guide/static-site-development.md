---
title: Static Site Development Guide
---

# 📦 Static Site Generation (SSG) Development Guide

This guide documents the key differences between development mode (SSR with Inertia.js) and static site generation (SSG), along with best practices to ensure your code works correctly in both environments.

## 🎯 Overview

Gravito supports two deployment modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| **SSR (Development)** | Full-stack with Inertia.js SPA navigation | Development, dynamic apps |
| **SSG (Production)** | Pre-rendered static HTML files | Documentation sites, static hosting (GitHub Pages, Cloudflare Pages) |

**⚠️ Critical Understanding**: In SSG mode, there is **no backend server** to handle Inertia requests. All navigation must use standard HTML links.

---

## 🚨 Common Pitfalls & Solutions

### 1. Inertia Link Component Issues

**Problem**: Inertia's `<Link>` component causes issues in static sites:
- Black mask overlay appears during navigation
- New tabs open unexpectedly
- Navigation hangs or loops

**Root Cause**: Inertia `Link` tries to make XHR requests to the backend, but in SSG mode there is no backend.

**Solution**: Use the `StaticLink` component instead:

```tsx
// ❌ DON'T use Inertia Link directly
import { Link } from '@inertiajs/react'
<Link href="/docs">Docs</Link>

// ✅ DO use StaticLink wrapper
import { StaticLink } from '../components/StaticLink'
<StaticLink href="/docs">Docs</StaticLink>
```

**StaticLink Implementation**:
```tsx
// src/client/components/StaticLink.tsx
import { Link } from '@inertiajs/react'
import type { ComponentProps, ReactNode } from 'react'

type LinkProps = ComponentProps<typeof Link>

interface StaticLinkProps extends Omit<LinkProps, 'href'> {
  href: string
  children: ReactNode
}

/**
 * Detect if we're running in a static site environment
 */
export function isStaticSite(): boolean {
  if (typeof window === 'undefined') return false
  
  const hostname = window.location.hostname
  const port = window.location.port
  
  // Static preview server (bun preview.ts)
  if (hostname === 'localhost' && port === '4173') return true
  
  // GitHub Pages
  if (hostname.endsWith('.github.io')) return true
  
  // Production domain
  if (hostname === 'gravito.dev') return true
  
  // Cloudflare Pages, Vercel, Netlify
  if (hostname.endsWith('.pages.dev')) return true
  if (hostname.endsWith('.vercel.app')) return true
  if (hostname.endsWith('.netlify.app')) return true
  
  return false
}

/**
 * Smart link component that uses native <a> for static sites
 * and Inertia Link for SSR mode
 */
export function StaticLink({ href, children, className, ...props }: StaticLinkProps) {
  // In static site mode, use native anchor for reliable navigation
  if (isStaticSite()) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  }

  // In SSR mode, use Inertia Link for SPA navigation
  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  )
}
```

**Vue StaticLink Implementation**:
```vue
<!-- src/client/components/StaticLink.vue -->
<template>
  <component :is="linkComponent" v-bind="linkProps">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import { computed } from 'vue'

interface Props {
  href: string
  class?: string
  [key: string]: unknown
}

const props = defineProps<Props>()

function isStaticSite(): boolean {
  if (typeof window === 'undefined') return false
  
  const hostname = window.location.hostname
  const port = window.location.port
  
  // Static preview server (bun preview.ts)
  if (hostname === 'localhost' && port === '4173') return true
  
  // Production domains
  if (hostname.includes('github.io')) return true
  if (hostname.includes('vercel.app')) return true
  
  return false
}

const isStatic = isStaticSite()

const linkComponent = computed(() => isStatic ? 'a' : Link)
const linkProps = computed(() => {
  if (isStatic) {
    const { href, class: className, ...rest } = props
    return { href, class: className, ...rest }
  }
  return props
})
</script>
```

---

### 2. Locale Path Prefix Issues

**Problem**: Links missing locale prefix (`/en/` or `/zh/`) cause 404 errors or infinite redirects.

**Example of incorrect behavior**:
```
Expected: /en/docs/guide/routing
Actual:   /docs/guide/routing  ← 404!
```

**Solution**: Always use locale prefix for ALL locales (including English):

```typescript
// ❌ DON'T assume English is the default without prefix
const prefix = locale === 'zh' ? '/zh/docs' : '/docs'

// ✅ DO include prefix for all locales
const prefix = locale === 'zh' ? '/zh/docs' : '/en/docs'
```

**Apply this to**:
- Sidebar link generation (`DocsService.getSidebar()`)
- Markdown link transformation (`renderer.link`)
- Navigation components (`getLocalizedPath()`)

---

### 3. Locale Switcher Path Handling

**Problem**: Switching from `/en/docs/page` to Chinese produces `/zh/en/docs/page` (double prefix).

**Root Cause**: The switcher adds the new prefix without removing the old one.

**Solution**: Strip existing locale prefix before adding new one:

```typescript
// ❌ WRONG: Directly prepend new locale
const switchLocale = (newLang: string) => {
  const path = window.location.pathname
  if (newLang === 'zh') return `/zh${path}`  // Creates /zh/en/docs/...
  return path
}

// ✅ CORRECT: Strip existing prefix first
const switchLocale = (newLang: string) => {
  let path = window.location.pathname
  
  // Strip existing locale prefix
  if (path.startsWith('/en/') || path.startsWith('/en')) {
    path = path.replace(/^\/en/, '') || '/'
  } else if (path.startsWith('/zh/') || path.startsWith('/zh')) {
    path = path.replace(/^\/zh/, '') || '/'
  }
  
  // Add new locale prefix
  if (newLang === 'zh') {
    return path === '/' ? '/zh/' : `/zh${path}`
  }
  if (newLang === 'en') {
    return path === '/' ? '/en/' : `/en${path}`
  }
  return path
}
```

---

### 4. Missing Static Redirects

**Problem**: Routes like `/about` or `/docs` don't have static files and cause 404 or infinite loops.

**Solution**: Generate redirect HTML files in `build-static.ts`:

```typescript
// build-static.ts

// Create redirect for /about to /en/about
const aboutRedirectHtml = `<!DOCTYPE html><html><head>
  <meta http-equiv="refresh" content="0; url=/en/about" />
  <script>window.location.href='/en/about';</script>
</head><body>Redirecting to <a href="/en/about">/en/about</a>...</body></html>`

await mkdir(join(outputDir, 'about'), { recursive: true })
await writeFile(join(outputDir, 'about', 'index.html'), aboutRedirectHtml)

// Repeat for other abstract routes: /docs, /contact, etc.
```

---

## ✅ Development Checklist

Before building for static deployment, verify:

### Links & Navigation
- [ ] All internal links use `StaticLink` component (not Inertia `Link`)
- [ ] All route paths include locale prefix (`/en/...` or `/zh/...`)
- [ ] Locale switcher properly strips old prefix before adding new one
- [ ] External links use native `<a>` with `target="_blank"` when appropriate

### Static Build Configuration
- [ ] Abstract routes (`/`, `/about`, `/docs`) have redirect HTML files
- [ ] `isStaticSite()` function includes all deployment domains
- [ ] Sitemap includes all localized URLs
- [ ] 404.html is generated with proper SPA fallback handling

### Content Links
- [ ] Markdown internal links use relative paths (`./routing.md`)
- [ ] Link transformer adds correct locale prefix
- [ ] Anchor links (`#section`) work without full page reload

---

## 🔧 Quick Reference: File Locations

| File | Purpose |
|------|---------|
| `src/client/components/StaticLink.tsx` | Smart link wrapper |
| `src/client/components/Layout.tsx` | Navigation, locale switching |
| `src/services/DocsService.ts` | Sidebar & Markdown link generation |
| `build-static.ts` | SSG build script, redirects |

---

## 🧪 Testing Static Build Locally

```bash
# Build and preview static site
bun run build:preview

# This runs:
# 1. bun run build:static  - Generate all HTML files
# 2. bun run preview       - Start local server at http://localhost:4173

# Test these scenarios:
# - Click sidebar links (should not open new tabs)
# - Switch languages (URL should update correctly)
# - Navigate to /about (should redirect to /en/about)
# - Check console for errors
```

---

## 📐 Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    Request Flow                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Development (SSR)          Static Site (SSG)                │
│  ─────────────────          ────────────────                 │
│                                                              │
│  Browser                    Browser                          │
│     │                          │                             │
│     ▼                          ▼                             │
│  Inertia Link              Native <a> tag                    │
│     │                          │                             │
│     ▼                          ▼                             │
│  XHR to Server             Direct HTML load                  │
│     │                          │                             │
│     ▼                          ▼                             │
│  Hono Backend              Static File Server                │
│     │                          │                             │
│     ▼                          ▼                             │
│  Inertia Response          Pre-rendered HTML                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Golden Rules

1. **Always use `StaticLink`** for internal navigation
2. **Always include locale prefix** in all paths
3. **Always test with `bun run build:preview`** before deploying
4. **Always add redirects** for abstract routes in `build-static.ts`
5. **Never rely on Inertia features** in static-only pages

Following these guidelines ensures your Gravito site works flawlessly in both development and production static deployment.
