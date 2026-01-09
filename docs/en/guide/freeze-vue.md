---
title: Freeze Vue
description: Vue bindings for Freeze SSG utilities.
---

# Freeze Vue

Freeze Vue provides Vue bindings for `@gravito/freeze`, including `FreezePlugin`, `StaticLink`, and locale helpers.

## Installation

```bash
bun add @gravito/freeze-vue
```

## Quick Start

```ts
import { createApp } from 'vue'
import { FreezePlugin, defineConfig } from '@gravito/freeze-vue'
import App from './App.vue'

const config = defineConfig({
  staticDomains: ['example.com'],
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  baseUrl: 'https://example.com',
})

createApp(App).use(FreezePlugin, config).mount('#app')
```

## Key APIs

- `FreezePlugin` registers config and locale utilities
- `StaticLink` renders localized links for static builds
- `LocaleSwitcher` switches locales while preserving path

## Next Steps

- Build static sites with [Static Site Development](./static-site-development.md)
