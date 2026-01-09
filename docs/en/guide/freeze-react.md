---
title: Freeze React
description: React bindings for Freeze SSG utilities.
---

# Freeze React

Freeze React provides React bindings for `@gravito/freeze`, including `FreezeProvider`, `StaticLink`, and locale helpers.

## Installation

```bash
bun add @gravito/freeze-react
```

## Quick Start

```tsx
import { FreezeProvider, defineConfig, StaticLink, LocaleSwitcher } from '@gravito/freeze-react'

const config = defineConfig({
  staticDomains: ['example.com'],
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  baseUrl: 'https://example.com',
})

export function App() {
  return (
    <FreezeProvider config={config}>
      <StaticLink href="/about">About</StaticLink>
      <LocaleSwitcher locale="zh">中文</LocaleSwitcher>
    </FreezeProvider>
  )
}
```

## Key APIs

- `FreezeProvider` sets config and locale context
- `StaticLink` renders localized links for static builds
- `LocaleSwitcher` switches locales while preserving path

## Next Steps

- Build static sites with [Static Site Development](./static-site-development.md)
