# @gravito/freeze-vue

> 🍃 Vue 3 adapter for @gravito/freeze SSG module

## Installation

```bash
bun add @gravito/freeze-vue
```

## Quick Start

### 1. Install the Plugin

```typescript
// main.ts
import { createApp } from 'vue'
import { FreezePlugin, defineConfig } from '@gravito/freeze-vue'
import { Link } from '@inertiajs/vue3'
import App from './App.vue'

const config = defineConfig({
  staticDomains: ['example.com', 'example.github.io'],
  locales: ['en', 'zh'],
  defaultLocale: 'en',
  baseUrl: 'https://example.com',
})

const app = createApp(App)
app.use(FreezePlugin, { config, LinkComponent: Link })
app.mount('#app')
```

### 2. Use StaticLink for Navigation

```vue
<!-- Navigation.vue -->
<script setup>
import { StaticLink } from '@gravito/freeze-vue'
</script>

<template>
  <nav>
    <StaticLink href="/about">About</StaticLink>
    <StaticLink href="/docs/guide">Guide</StaticLink>
  </nav>
</template>
```

### 3. Add Locale Switcher

```vue
<!-- Header.vue -->
<script setup>
import { LocaleSwitcher } from '@gravito/freeze-vue'
</script>

<template>
  <header>
    <LocaleSwitcher locale="en">English</LocaleSwitcher>
    <LocaleSwitcher locale="zh">Chinese</LocaleSwitcher>
  </header>
</template>
```

### 4. Use the Composable for Custom Logic

```vue
<!-- CustomComponent.vue -->
<script setup>
import { useFreeze } from '@gravito/freeze-vue'

const { isStatic, locale, getLocalizedPath, navigateToLocale } = useFreeze()
</script>

<template>
  <div>
    <p>Mode: {{ isStatic ? 'Static' : 'Dynamic' }}</p>
    <p>Locale: {{ locale }}</p>
    <a :href="getLocalizedPath('/about')">About</a>
    <button @click="navigateToLocale('zh')">Switch to Chinese</button>
  </div>
</template>
```

## API Reference

### Plugin

#### `FreezePlugin`

Vue 3 plugin for SSG functionality.

```typescript
app.use(FreezePlugin, { config, LinkComponent: Link })
```

### Components

#### `<StaticLink>`

Smart link component.

```vue
<StaticLink href="/about" class="link">About</StaticLink>
```

| Prop | Type | Description |
|------|------|-------------|
| `href` | `string` | Target path (auto-localized) |
| `skipLocalization` | `boolean?` | Skip auto-localization |

#### `<LocaleSwitcher>`

Locale switching link.

```vue
<LocaleSwitcher locale="zh">Chinese</LocaleSwitcher>
```

| Prop | Type | Description |
|------|------|-------------|
| `locale` | `string` | Target locale |

### Composable

#### `useFreeze()`

Access SSG utilities in components.

```typescript
const {
  isStatic,         // ComputedRef<boolean> - static mode flag
  locale,           // ComputedRef<string> - current locale
  getLocalizedPath, // (path, locale?) => string
  switchLocale,     // (locale) => string
  getLocaleFromPath,// (path) => string
  navigateToLocale, // (locale) => void
} = useFreeze()
```

### Helper Function

#### `provideFreeze({ config, LinkComponent })`

Manually provide freeze context (for SSR or custom setups).

```typescript
import { provideFreeze, defineConfig } from '@gravito/freeze-vue'
import { Link } from '@inertiajs/vue3'

const config = defineConfig({ ... })
provideFreeze({ config, LinkComponent: Link })
```

### Re-exports from @gravito/freeze

All exports from `@gravito/freeze` are available:

- `defineConfig`
- `createDetector`
- `generateRedirectHtml`
- `generateRedirects`
- `generateLocalizedRoutes`
- `inferRedirects`
- `generateSitemapEntries`

## Static vs Dynamic Mode

| Feature | Static Mode | Dynamic Mode |
|---------|-------------|--------------|
| `<StaticLink>` | Renders `<a>` | Renders Inertia `<Link>` |
| Navigation | Full page reload | SPA transition |
| Detected when | Production domains, port 4173 | localhost:3000/5173 |

## License

MIT © Gravito Framework
