# Static Site Quick Reference

Quick reference for building static sites with Gravito + `@gravito/freeze`.

## TL;DR

```bash
# Install
bun add @gravito/freeze-react  # or freeze-vue

# Configure
# freeze.config.ts
export const freezeConfig = defineConfig({
  staticDomains: ['your-domain.com'],
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  baseUrl: 'https://your-domain.com',
})

# Build & Test
bun run build:preview
# Visit http://localhost:4173
```

## Package Usage

### React

```tsx
// App.tsx
import { FreezeProvider } from '@gravito/freeze-react'
import { freezeConfig } from './freeze.config'

<FreezeProvider config={freezeConfig}>
  <Layout />
</FreezeProvider>

// Navigation.tsx
import { StaticLink, LocaleSwitcher, useFreeze } from '@gravito/freeze-react'

const { isStatic, locale, getLocalizedPath } = useFreeze()

<StaticLink href="/about">About</StaticLink>
<LocaleSwitcher locale="zh">中文</LocaleSwitcher>
```

### Vue

```typescript
// main.ts
import { FreezePlugin } from '@gravito/freeze-vue'
app.use(FreezePlugin, freezeConfig)
```

```vue
<script setup>
import { StaticLink, LocaleSwitcher, useFreeze } from '@gravito/freeze-vue'
const { isStatic, locale, getLocalizedPath } = useFreeze()
</script>

<template>
  <StaticLink href="/about">About</StaticLink>
  <LocaleSwitcher locale="zh">中文</LocaleSwitcher>
</template>
```

## [Complete] Quick Checklist

- [ ] `@gravito/freeze-*` installed
- [ ] `freeze.config.ts` created
- [ ] Provider/Plugin configured
- [ ] All `Link` → `StaticLink`
- [ ] Tested at http://localhost:4173

## Common Issues

| Issue | Solution |
|-------|----------|
| Black overlay on click | Use `StaticLink`, not Inertia `Link` |
| 404 on routes | Add to `redirects` in config |
| Locale not detected | Use `getLocalizedPath()` |
| Wrong static mode | Check `staticDomains` config |

## Full Documentation

- [SSG Development Guide](./en/guide/static-site-development.md)
- [Full Checklist](./STATIC_SITE_CHECKLIST.md)
- [Standardization](./STATIC_SITE_STANDARDIZATION.md)

## Golden Rules

1. **StaticLink** for all internal links
2. **getLocalizedPath()** for all paths
3. **build:preview** before deploy
4. **Configure redirects** for abstract routes

---

>  `@gravito/freeze` = Freeze your dynamic app into static files!
